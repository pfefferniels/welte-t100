/**
 * How far each tracker-bar port is actually open, row by row.
 *
 * A perforation does not switch a port on and off. The hole in the paper and the
 * hole in the tracker bar are both round and of comparable size — about 20.9 px
 * and 16.7 px here — so the port opens over the roughly 17 px it takes the two
 * to slide across each other, which at this roll's speed is some 28 ms, of the
 * same order as the mechanism's own fast time constants. The open area is the
 * lens where the two circles overlap; a longer perforation is a stadium, and
 * while its straight flank covers the port the area is simply the port's own.
 *
 * midi2exp instead keeps the port binary and lengthens every perforation by
 * 0.75 tracker diameters at its tail end, which comes to a similar total open
 * time but places it about 11 ms late. `binaryPort` reproduces that for the
 * baseline model.
 */

import type { Grid } from "./grid.ts";
import type { Action, Control, Half, Punch } from "./expression.ts";

/**
 * The punch diameter is the scan's `AVG_HOLE_WIDTH` and so belongs to the roll;
 * the bore is the instrument's, after Welte's 1.413 mm at the scan's resolution.
 */
export type PortGeometry = {
  readonly punchDiameterPx: number;
  readonly trackerDiameterPx: number;
};

/** Welte's tracker bore, in mm. */
export const TRACKER_BORE_MM = 1.413;

/**
 * The resolution of the Stanford scan of roll 3309, in rows per inch of paper.
 * Every constant here that is stated in rows, the geometry below included, is
 * stated at this pitch, so a roll measured in millimetres is put on the same
 * grid by `geometryInMm` rather than on one of its own.
 */
export const ROWS_PER_INCH = 300.25;
export const ROWS_PER_MM = ROWS_PER_INCH / 25.4;

/** Roll 3309. */
export const DEFAULT_GEOMETRY: PortGeometry = {
  punchDiameterPx: 20.86,
  trackerDiameterPx: TRACKER_BORE_MM * ROWS_PER_MM,
};

/** The punch diameter of roll 3309, in mm. */
export const DEFAULT_PUNCH_MM = DEFAULT_GEOMETRY.punchDiameterPx / ROWS_PER_MM;

/** A geometry stated in millimetres, on the scan's row pitch. */
export function geometryInMm(punchDiameterMm: number, trackerDiameterMm = TRACKER_BORE_MM): PortGeometry {
  return {
    punchDiameterPx: punchDiameterMm * ROWS_PER_MM,
    trackerDiameterPx: trackerDiameterMm * ROWS_PER_MM,
  };
}

/** Area of the lens where two circles of radius `a` and `b` overlap at centre distance `d`. */
function lensArea(d: number, a: number, b: number): number {
  if (d >= a + b) return 0;
  const small = Math.min(a, b);
  if (d <= Math.abs(a - b)) return Math.PI * small * small;
  const alpha = Math.acos((d * d + a * a - b * b) / (2 * d * a));
  const beta = Math.acos((d * d + b * b - a * a) / (2 * d * b));
  const wedge = Math.sqrt((-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)) / 2;
  return a * a * alpha + b * b * beta - wedge;
}

/**
 * Open fraction of the port when the tracker bore is over pixel row `row` of a
 * perforation whose ink runs from `rowOn` to `rowOff`.
 */
function openFraction(row: number, rowOn: number, rowOff: number, geometry: PortGeometry): number {
  const punch = geometry.punchDiameterPx / 2;
  const port = geometry.trackerDiameterPx / 2;
  const full = Math.PI * Math.min(punch, port) ** 2;

  const leadCentre = Math.min(rowOn + punch, (rowOn + rowOff) / 2);
  const tailCentre = Math.max(rowOff - punch, (rowOn + rowOff) / 2);
  if (row >= leadCentre && row <= tailCentre) return 1;

  const distance = row < leadCentre ? leadCentre - row : row - tailCentre;
  return lensArea(distance, port, punch) / full;
}

export type PortKey = `${Half}:${Control}:${Action}`;

export function portKey(half: Half, control: Control, action: Action): PortKey {
  return `${half}:${control}:${action}`;
}

export type Slot = { readonly key: PortKey; readonly rowOn: number; readonly rowOff: number };

/**
 * Perforations of one port that touch or overlap are one slot in the paper, not
 * two holes. The image parser already bridges chained punches, but leaves any
 * that overlap only partly, and a stadium is not the union of two stadiums.
 */
export function slots(punches: readonly Punch[]): Slot[] {
  const byPort = punches.reduce((groups, punch) => {
    const key = portKey(punch.half, punch.control, punch.action);
    return groups.set(key, [...(groups.get(key) ?? []), punch]);
  }, new Map<PortKey, Punch[]>());

  return [...byPort].flatMap(([key, punches]) =>
    punches
      .toSorted((a, b) => a.rowOn - b.rowOn)
      .reduce<Slot[]>((merged, punch) => {
        const last = merged.at(-1);
        if (last && punch.rowOn <= last.rowOff) {
          return [...merged.slice(0, -1), { key, rowOn: last.rowOn, rowOff: Math.max(last.rowOff, punch.rowOff) }];
        }
        return [...merged, { key, rowOn: punch.rowOn, rowOff: punch.rowOff }];
      }, []),
  );
}

/** Continuous open fraction per grid row, keyed by half, control and action. */
export function aperturePorts(
  grid: Grid,
  punches: readonly Punch[],
  geometry: PortGeometry = DEFAULT_GEOMETRY,
): Map<PortKey, Float64Array> {
  const reach = Math.ceil(geometry.trackerDiameterPx / 2) + 1;
  const ports = new Map<PortKey, Float64Array>();

  const stamp = (slot: Slot): void => {
    const series = ports.get(slot.key) ?? new Float64Array(grid.length);
    ports.set(slot.key, series);

    const first = grid.indexOfRow(slot.rowOn - reach);
    const last = grid.indexOfRow(slot.rowOff + reach);
    Array.from({ length: last - first + 1 }, (_, offset) => first + offset).forEach((index) => {
      const value = openFraction(grid.rowAt(index), slot.rowOn, slot.rowOff, geometry);
      series[index] = Math.max(series[index]!, value);
    });
  };

  slots(punches).forEach(stamp);
  return ports;
}

/** midi2exp's model: fully open for the ink, plus a fixed tail extension. */
export function binaryPorts(
  grid: Grid,
  punches: readonly Punch[],
  geometry: PortGeometry = DEFAULT_GEOMETRY,
  extensionFraction = 0.75,
): Map<PortKey, Float64Array> {
  const extension = Math.round(geometry.trackerDiameterPx * extensionFraction);
  const ports = new Map<PortKey, Float64Array>();

  slots(punches).forEach((slot) => {
    const series = ports.get(slot.key) ?? new Float64Array(grid.length);
    ports.set(slot.key, series);
    series.fill(1, grid.indexOfRow(slot.rowOn), grid.indexOfRow(slot.rowOff + extension) + 1);
  });

  return ports;
}

export function portSeries(ports: ReadonlyMap<PortKey, Float64Array>, key: PortKey, length: number): Float64Array {
  return ports.get(key) ?? new Float64Array(length);
}
