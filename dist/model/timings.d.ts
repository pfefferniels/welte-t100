/**
 * Fitted parameters translated into times a reader can check against the
 * instrument and against midi2exp's published constants.
 *
 * midi2exp states its rates as the time to cross a named span — piano to
 * mezzoforte for the two crescendos, forte to piano for the fast decrescendo.
 * The flow law here makes the rate depend on where the bellows is, so the same
 * quantity has to be integrated rather than divided out. Nothing is clamped and
 * the Mezzoforte pin is ignored, so these are the free travel times.
 */
import type { Parameters } from "./types.ts";
export type Traversal = {
    readonly from: number;
    readonly to: number;
    readonly milliseconds: number;
};
/**
 * The four times, on the roll's printed scale. `mezzoforte` is the fitted stop,
 * not the printed gridline, so the spans are the ones the mechanism actually has.
 */
export declare function traversals(params: Parameters): Record<string, Traversal>;
export declare function describeTraversals(params: Parameters): {
    span: string;
    from: string;
    to: string;
    ms: string;
}[];
