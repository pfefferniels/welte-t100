/**
 * What every model of the nuancing mechanism has in common.
 *
 * A model consumes the port signals of one keyboard half and returns one value
 * per grid row, on the roll's own printed scale: 0 at that half's P.P. gridline,
 * 0.5 at M.F., 1 at the shared F.F. line. That is the scale the drawn line is
 * measured on, and it is also, if Hagmann is right about the Mezzoforte pin
 * stopping the bellows halfway, the travel of the Nuancierbalg itself.
 */
import type { Grid } from "./grid.ts";
import type { PortKey } from "./ports.ts";
import type { Scaling } from "./units.ts";
/** The two stacks of expression valves, one to each side of the keyboard. */
export type Half = "bass" | "treble";
export declare const HALVES: readonly Half[];
export type ModelInput = {
    readonly grid: Grid;
    readonly half: Half;
    readonly ports: ReadonlyMap<PortKey, Float64Array>;
};
export type Parameters = Readonly<Record<string, number>>;
export type ParameterSpec = {
    readonly name: string;
    readonly lower: number;
    readonly upper: number;
    readonly unit: string;
    readonly note: string;
};
export type Model = {
    readonly name: string;
    readonly summary: string;
    readonly spec: readonly ParameterSpec[];
    readonly defaults: Parameters;
    /**
     * Which of this model's parameters are levels, conductances and loads, so that
     * `core/units.ts` can put a set on another scale without being told the
     * vocabulary. The two scales name their conduits differently, and a constant
     * converted as though it were dimensionless would fail silently.
     */
    readonly scaling: Scaling;
    run(input: ModelInput, params: Parameters): Float64Array;
};
/**
 * Step a mutable state across the grid, recording one number per row.
 * `advance` mutates `state` and returns the value observed after the step.
 */
export declare function simulate<S>(length: number, state: S, advance: (state: S, index: number) => number): Float64Array;
export declare function clamp(value: number, low: number, high: number): number;
/**
 * The series slid along the paper with the shift allowed to change along the
 * roll. The offset between the drawn line and its punches is not constant:
 * measured by thirds on the six lined rolls it shrinks on three of the twelve
 * halves, by up to 17 scan rows on 3357's treble, grows on three and holds on
 * the rest, and the two halves of one roll can differ. `drift` is the total
 * change from the first row to the last.
 */
export declare function shiftedByDriftingRows(series: Float64Array, rows: number, drift: number): Float64Array;
/**
 * The series slid along the paper, interpolating between rows. A negative shift
 * moves the model earlier, which is what is needed to meet a drawn line that
 * runs ahead of its punches. The shift is in scan rows rather than milliseconds
 * because the measured offset holds better as a distance on the paper than as a
 * duration, and because a fixed offset is what a layout would produce.
 */
export declare function shiftedByRows(series: Float64Array, rows: number): Float64Array;
export declare function parameterVector(spec: readonly ParameterSpec[], params: Parameters): number[];
export declare function parametersFrom(spec: readonly ParameterSpec[], vector: readonly number[]): Parameters;
/**
 * The same model with one parameter forced to follow another, for testing a
 * regulation Welte prescribed: the crescendo and sforzando pairs are each
 * adjusted to open and close in the same time.
 */
export declare function withTied(model: Model, ties: Readonly<Record<string, string>>, name?: string): Model;
/**
 * The same model with some parameters nailed down, so an ablation asks one
 * question at a time: the pinned values are held while everything else refits
 * around them.
 */
export declare function withFixed(model: Model, fixed: Parameters, name?: string): Model;
