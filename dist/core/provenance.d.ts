/**
 * What a set of constants rests on. Both scales say it in the same words, since
 * both are fitted against a line drawn on the same ruled band.
 */
export type HalfProvenance = {
    /** RMSE on the blocks the fit never saw, in units of the printed scale; for a consensus, the mean over its rolls. */
    readonly heldOutRmse: number;
    /** Share of the roll's rows the tracer witnessed. */
    readonly coverage?: number;
    /** Settled arrivals at the Mezzoforte hook, from which its level was measured; below 20, the level is the fit's. */
    readonly hookArrivals?: number;
};
