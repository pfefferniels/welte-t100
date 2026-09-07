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
 * midi2exp instead keeps the port binary and lengthens every perforation by
 * 0.75 tracker diameters at its tail end, which comes to a similar total open
 * time but places it about 11 ms late; the empirics carry that reading as the
 * baseline's port.
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
export declare const TRACKER_BORE_MM = 1.413;
/**
 * The resolution of the Stanford scans, in rows per inch of paper; the six lined
 * rolls all share it. Every constant here that is stated in rows, the geometry below included, is
 * stated at this pitch, so a roll measured in millimetres is put on the same
 * grid by `geometryInMm` rather than on one of its own.
 */
export declare const ROWS_PER_INCH = 300.25;
export declare const ROWS_PER_MM: number;
/** Roll 3309; the six lined rolls scan between 19.8 and 20.9 px. */
export declare const DEFAULT_GEOMETRY: PortGeometry;
/** The punch diameter of roll 3309, in mm. */
export declare const DEFAULT_PUNCH_MM: number;
/** A geometry stated in millimetres, on the scan's row pitch. */
export declare function geometryInMm(punchDiameterMm: number, trackerDiameterMm?: number): PortGeometry;
export type PortKey = `${Half}:${Control}:${Action}`;
export declare function portKey(half: Half, control: Control, action: Action): PortKey;
export type Slot = {
    readonly key: PortKey;
    readonly rowOn: number;
    readonly rowOff: number;
};
/**
 * Perforations of one port that touch or overlap are one slot in the paper, not
 * two holes. The image parser already bridges chained punches, but leaves any
 * that overlap only partly, and a stadium is not the union of two stadiums.
 */
export declare function slots(punches: readonly Punch[]): Slot[];
/** Continuous open fraction per grid row, keyed by half, control and action. */
export declare function aperturePorts(grid: Grid, punches: readonly Punch[], geometry?: PortGeometry): Map<PortKey, Float64Array>;
export declare function portSeries(ports: ReadonlyMap<PortKey, Float64Array>, key: PortKey, length: number): Float64Array;
