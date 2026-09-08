/**
 * How far each tracker-bar port is actually open, row by row.
 *
 * A perforation does not switch a port on and off. The hole in the paper and the
 * hole in the tracker bar are both round and of comparable size, 19.8 to 20.9 px
 * on the six lined rolls against 16.7 px, so the port opens over the roughly
 * 17 px it takes the two to slide across each other, which at a red Welte's
 * paper speed is some 28 ms, of the same order as the mechanism's own fast time
 * constants. The open area is the
 * lens where the two circles overlap; a longer perforation is a stadium, and
 * while its straight flank covers the port the area is simply the port's own.
 *
 * Two slots close enough to reach the bore together open it over the *union* of
 * their two lenses, which for punches a chain pitch apart is very nearly their
 * sum. It matters on a green roll, where a held command is a chain of round
 * holes on a 2.66 mm grid with paper bridges of about a millimetre between them:
 * at the trough between two punches both neighbours are over the bore at once,
 * and the greater of the two sees one sliver where the paper offers two.
 *
 * midi2exp instead keeps the port binary and lengthens every perforation by
 * 0.75 tracker diameters at its tail end, which comes to a similar total open
 * time but places it about 11 ms late; the empirics carry that reading as the
 * baseline's port.
 */
/** Welte's tracker bore, in mm. */
export const TRACKER_BORE_MM = 1.413;
/**
 * The resolution of the Stanford scans, in rows per inch of paper; the six lined
 * rolls all share it. Every constant here that is stated in rows, the geometry below included, is
 * stated at this pitch, so a roll measured in millimetres is put on the same
 * grid by `geometryInMm` rather than on one of its own.
 */
export const ROWS_PER_INCH = 300.25;
export const ROWS_PER_MM = ROWS_PER_INCH / 25.4;
/** Roll 3309; the six lined rolls scan between 19.8 and 20.9 px. */
export const DEFAULT_GEOMETRY = {
    punchDiameterPx: 20.86,
    trackerDiameterPx: TRACKER_BORE_MM * ROWS_PER_MM,
};
/** The punch diameter of roll 3309, in mm. */
export const DEFAULT_PUNCH_MM = DEFAULT_GEOMETRY.punchDiameterPx / ROWS_PER_MM;
/** A geometry stated in millimetres, on the scan's row pitch. */
export function geometryInMm(punchDiameterMm, trackerDiameterMm = TRACKER_BORE_MM) {
    return {
        punchDiameterPx: punchDiameterMm * ROWS_PER_MM,
        trackerDiameterPx: trackerDiameterMm * ROWS_PER_MM,
    };
}
/** Area of the lens where two circles of radius `a` and `b` overlap at centre distance `d`. */
function lensArea(d, a, b) {
    if (d >= a + b)
        return 0;
    const small = Math.min(a, b);
    if (d <= Math.abs(a - b))
        return Math.PI * small * small;
    const alpha = Math.acos((d * d + a * a - b * b) / (2 * d * a));
    const beta = Math.acos((d * d + b * b - a * a) / (2 * d * b));
    const wedge = Math.sqrt((-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)) / 2;
    return a * a * alpha + b * b * beta - wedge;
}
/**
 * Open fraction of the port when the tracker bore is over pixel row `row` of a
 * perforation whose ink runs from `rowOn` to `rowOff`.
 */
function openFraction(row, rowOn, rowOff, geometry) {
    const punch = geometry.punchDiameterPx / 2;
    const port = geometry.trackerDiameterPx / 2;
    const full = Math.PI * Math.min(punch, port) ** 2;
    const leadCentre = Math.min(rowOn + punch, (rowOn + rowOff) / 2);
    const tailCentre = Math.max(rowOff - punch, (rowOn + rowOff) / 2);
    if (row >= leadCentre && row <= tailCentre)
        return 1;
    const distance = row < leadCentre ? leadCentre - row : row - tailCentre;
    return lensArea(distance, port, punch) / full;
}
/**
 * Perforations of one port no further apart than `gapPx` are one slot in the
 * paper, not two holes. At a gap of zero this joins only what touches or
 * overlaps: the image parser already bridges chained punches, but leaves any
 * that overlap only partly, and a stadium is not the union of two stadiums.
 *
 * A T-98 command is punched as a chain of round holes with paper bridges of
 * about a millimetre left between them, so a green roll wants the gap set to
 * one tracker bore and a margin.
 */
export function slots(punches, gapPx = 0) {
    const byPort = punches.reduce((groups, punch) => {
        return groups.set(punch.key, [...(groups.get(punch.key) ?? []), punch]);
    }, new Map());
    return [...byPort].flatMap(([key, punches]) => punches
        .toSorted((a, b) => a.rowOn - b.rowOn)
        .reduce((merged, punch) => {
        const last = merged.at(-1);
        if (last && punch.rowOn <= last.rowOff + gapPx) {
            return [...merged.slice(0, -1), { key, rowOn: last.rowOn, rowOff: Math.max(last.rowOff, punch.rowOff) }];
        }
        return [...merged, { key, rowOn: punch.rowOn, rowOff: punch.rowOff }];
    }, []));
}
/** Continuous open fraction per grid row, keyed by port. */
export function aperturePorts(grid, punches, geometry = DEFAULT_GEOMETRY, gapPx = 0) {
    const reach = Math.ceil(geometry.trackerDiameterPx / 2) + 1;
    const ports = new Map();
    const stamp = (slot) => {
        const series = ports.get(slot.key) ?? new Float64Array(grid.length);
        ports.set(slot.key, series);
        const first = grid.indexOfRow(slot.rowOn - reach);
        const last = grid.indexOfRow(slot.rowOff + reach);
        Array.from({ length: last - first + 1 }, (_, offset) => first + offset).forEach((index) => {
            const value = openFraction(grid.rowAt(index), slot.rowOn, slot.rowOff, geometry);
            series[index] = Math.min(series[index] + value, 1);
        });
    };
    slots(punches, gapPx).forEach(stamp);
    return ports;
}
