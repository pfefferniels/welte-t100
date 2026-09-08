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
import type { Grid } from "./grid.ts";
import type { PortKey, PunchAt } from "./ports.ts";
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
export type Slot = PunchAt;
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
export declare function slots(punches: readonly PunchAt[], gapPx?: number): Slot[];
/** Continuous open fraction per grid row, keyed by port. */
export declare function aperturePorts(grid: Grid, punches: readonly PunchAt[], geometry?: PortGeometry, gapPx?: number): Map<PortKey, Float64Array>;
