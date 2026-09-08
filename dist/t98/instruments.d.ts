/**
 * The instruments a green playback can run on, and why they are three kinds and
 * not one list.
 *
 * Two T-98 instruments are meant to ship, and the gap between them is the result
 * the work is for:
 *
 * - a **genuine** instrument, fitted to the drawn nuance lines of green rolls,
 *   which says what a green Welte actually did;
 * - a **derived** instrument, fitted so that the green code of a recording, run
 *   through it, reproduces what the fitted T-100 emulator produces from the *red*
 *   code of the same recording, which says what Welte's editor meant the green
 *   roll to sound like.
 *
 * `derived − genuine`, in the printed ordinate both scales share, is how far the
 * transfer of a red reading onto the green mechanism succeeded. Neither
 * instrument alone yields it: the derived one agrees with the red curve by
 * construction and would flatter the transfer, and the genuine one has nothing to
 * be compared against without it. They answer different questions, so they are
 * different types here and no interface can offer them in one list as though they
 * answered the same one.
 *
 * A derived instrument's residual is **not model error in the ordinary sense**.
 * It is the part of the red reading the green code could not express, and a large
 * one is a finding about the coding rather than about the pneumatics. Its
 * provenance therefore names the T-100 instrument it inherits, since it is only
 * as good as the red reading behind it.
 *
 * **Neither exists yet.** `GENUINE` and `DERIVED` are empty until the fits run.
 * What ships in the meantime is a third kind, `unfitted`, holding the starting
 * values of the model specification §6.1 — arithmetic from Welte's regulation
 * controls, Phillips's ratios and the T-100 consensus, with no green roll behind
 * it at all. It is a separate arm of the union rather than a placeholder inside
 * `genuine` so that nothing can read it as a measurement of a green instrument.
 */
import type { HalfProvenance } from "../core/provenance.ts";
import type { Half, Parameters } from "../core/types.ts";
/** A green roll carrying a drawn nuance line, by its Welte number. */
export type GenuineRoll = "184" | "942" | "1322" | "1843" | "2441" | "3493" | "3845" | "4093";
/** A recording issued on both scales, by its Welte number. */
export type DerivedPair = "225";
export type WelteT98InstrumentName = {
    readonly genuine: GenuineRoll | "consensus";
} | {
    readonly derived: DerivedPair;
} | {
    readonly unfitted: "starting-values";
};
export type GenuineProvenance = {
    readonly druid: string;
    readonly performer?: string;
    readonly title?: string;
    /** Which tracing round the fit was made on. */
    readonly traces: string;
    readonly seeds: number;
    readonly seedSpread?: number;
    readonly bass: HalfProvenance;
    readonly treble: HalfProvenance;
    /** For a consensus: the rolls it was fitted across, and its held-out score on each. */
    readonly pooled?: Readonly<Record<string, Record<Half, number>>>;
    readonly note?: string;
};
export type DerivedProvenance = {
    /** The pair the fit was made on, and where each copy is held. */
    readonly pair: string;
    /**
     * The T-100 instrument whose reading of the red copy this inherits. A derived
     * instrument is only as good as the red curve behind it, and the T-100
     * emulator's own held-out error is the floor beneath which no difference may
     * be attributed to the coding.
     */
    readonly inherits: string;
    readonly seeds: number;
    readonly bass: HalfProvenance;
    readonly treble: HalfProvenance;
    readonly note?: string;
};
export type UnfittedProvenance = {
    /** What the numbers were computed from, in words. */
    readonly source: string;
    readonly note: string;
};
export type WelteT98Instrument = {
    readonly kind: "genuine";
    readonly name: string;
    readonly bass: Parameters;
    readonly treble: Parameters;
    readonly provenance: GenuineProvenance;
} | {
    readonly kind: "derived";
    readonly name: string;
    readonly bass: Parameters;
    readonly treble: Parameters;
    readonly provenance: DerivedProvenance;
} | {
    readonly kind: "unfitted";
    readonly name: string;
    readonly bass: Parameters;
    readonly treble: Parameters;
    readonly provenance: UnfittedProvenance;
};
export declare const STARTING_VALUES: WelteT98Instrument;
/**
 * Fitted to the drawn nuance lines of green rolls, per roll and per half with
 * held-out blocks within each roll. **Empty until the fit has been run**; a
 * consensus only once the between-roll spread supports one, which is a question
 * the fit answers rather than a decision taken in advance.
 */
export declare const GENUINE: Readonly<Partial<Record<GenuineRoll | "consensus", WelteT98Instrument>>>;
/**
 * Fitted so that the green code of a pair reproduces the fitted T-100 emulator's
 * travel for its red copy. **Empty until the fit has been run.** A derived
 * instrument fitted on one pair is a fit to one editor's work on one roll, so it
 * is named for its pair and must never be generalised.
 */
export declare const DERIVED: Readonly<Partial<Record<DerivedPair, WelteT98Instrument>>>;
/** Every set of constants that exists, whatever it rests on. */
export declare const instrumentsT98: () => readonly WelteT98Instrument[];
export declare function instrumentT98Of(name: WelteT98InstrumentName): WelteT98Instrument | undefined;
/** The name as one string, for a curve or a plot legend that has room for one. */
export declare function labelOf(name: WelteT98InstrumentName): string;
/** The nuancing constants of an instrument, one set for each half of the keyboard. */
export declare const nuanceOf: (instrument: WelteT98Instrument) => Record<Half, Parameters>;
