/**
 * The two pedals, after Hagmann's Anhang 16 (p. 189, T-100), Anhang 17 (p. 190,
 * T-98) and the account on pp. 106–107.
 *
 * The mechanism below the command is the same on both scales: "die Unterschiede
 * zwischen der älteren und der jüngeren Skalenteilung [manifestieren sich] – damit
 * der Nuancierung entsprechend – nur im Bereich der Vorpneumatik; die Anordnung
 * der Ventile und Bälge, die zur Ausführung der Bewegungen dienen, ist dagegen in
 * beiden Systemen dieselbe" (p. 106), and Anhang 17 draws the T-98 pedal action
 * with the same throttles 11 and 17 on the damper and 20 on the hammer rail. So
 * only two things belong to a scale: which edge of the paper each pedal is
 * punched on, and whether the Vorpneumatik latches or holds. Both are arguments.
 *
 * Both pedals are worked by a bellows, and a bellows takes time to fill. So the
 * state here is travel in [0, 1] and not a switch: 0 is the pedal up, 1 is the
 * pedal fully down. Hagmann is explicit that there is no nuancing device in the
 * path — "die Dämpfer werden stets in derselben Geschwindigkeit und immer
 * vollständig von den Saiten abgehoben" (p. 112) — so the travel always runs at
 * the one regulated speed towards one of the two ends. What it does not do is
 * arrive instantly, and the intermediate positions are therefore real whenever
 * the roll asks for a change faster than the mechanism can finish one. Hagmann
 * guesses as much in the next sentence, that half-pedal effects might be had
 * "durch Ueberlagerung der verschiedenen vom Notenband ausgehenden Befehle".
 *
 * ## Fortepedal (dampers) — treble lines 93 "Pedal an" and 94 "Pedal ab"
 *
 * The Vorpneumatik is the same latching relay as Mezzoforte and Crescendo, so a
 * momentary punch on 93 sets it and it holds until 94 is read. Its output,
 * conduit 10, then feeds a second relay of its own, which is what distinguishes
 * this pedal from the nuancing functions:
 *
 *   conduit 10 → throttle 11 → membrane chamber 12 → membrane 13 →
 *   double valve 14, which seals atmospheric bore 15 and opens conduit 16 →
 *   blower vacuum from conduit 7 → bellows 18 closes → the dampers rise.
 *
 * Chamber 12 fills through a throttle, so valve 14 does not follow the latch at
 * once; it flips when the chamber has crossed the pressure that lifts membrane
 * 13. That is a delay on both edges, and the same throttle sets both, which is
 * why the two are one parameter here. Welte's own regulation instructions place
 * the two adjusters exactly where this reading puts them: control 9c, if the
 * dampers rise too slowly, has the technician adjust **11**, and control 9b, if
 * they fall too slowly onto the strings, adjust **17** (Anhang 12, p. 185). No
 * adjuster sits on conduit 16, so the rise is the relay's delay plus a fast,
 * unthrottled fill, while the fall is that same delay plus a slow bleed through
 * bore 15 and throttle 17.
 *
 * Hagmann adds (p. 107) that 17 is set so that the opening of bellows 18 "in
 * derselben zeitlichen Ausdehnung abspielt wie seine Schliessung" — the two
 * directions are regulated to take the same time, with note 50 sending the
 * reader to control 9 for the check. `tiedToRise` imposes that; the parameters
 * keep the two apart so the tie can be tested rather than assumed.
 *
 * ## Pianopedal (hammer rail) — bass lines 8 "Hammerleiste an" and 7 "ab"
 *
 * "Auffallend einfach gebaut": bellows 19 hangs directly on conduit 9 from the
 * latch, with the single throttle 20 regulating air and suction alike (p. 106).
 * One conductance, both directions, no second relay. Control 8b adjusts 20.
 *
 * ## What is not modelled
 *
 * The moving mass of the damper rail. The nuancing model needs an `inertiaMs`
 * for the far lighter cone valve, so a damper action almost certainly has one
 * too, and it would round the corners of every traversal below. There is no
 * drawn line for the pedals and so nothing to fit it against, and a parameter
 * that can only be guessed is worse than an omission that is stated.
 *
 * The map from damper lift to how much a string is actually damped, which is a
 * property of the piano and not of the Welte. The output here is bellows travel.
 */
import { type ValveSpec } from "./valve.ts";
import { type Half, type ModelInput, type Parameters, type ParameterSpec } from "./types.ts";
/**
 * The pedals leave no drawn line, so nothing here is fitted. Three arguments set
 * these numbers; `docs/sources.md` §7 has the sources and the empirics'
 * `docs/measurements.md` §13 the bounds from the roll.
 *
 * `alpha` is carried over from the Nuancierbalg, whose fitted exponent is 1.02
 * in the bass and 0.77 in the treble: the same kind of bellows filling through
 * the same kind of conduit, so the same flow law, and its mean until something
 * better turns up.
 *
 * The travel times are bounded from the rolls rather than from Hagmann, who
 * gives none. Across the six lined rolls the shortest release-and-retake of the
 * damper pedal, from the "ab" punch to the next "an", runs from 142 ms on 1474
 * to 210 ms on 3309, and the fifth percentile of the lifts from 187 to 247 ms.
 * An editor does not punch a lift the instrument cannot make, so a full fall of
 * appreciably more than 200 ms is hard to defend. Welte's controls 9b and 9c bound it the same way from the other side,
 * requiring four notes of a moderate figure to be cleanly separated by the
 * pedal and four short ones to be joined by it, but they name no note values
 * for the scale roll's own figures and so give an order of magnitude, not a
 * number. Nothing here is fitted, because the pedals leave no drawn line.
 *
 * The split of that budget between the relay and the bellows follows the
 * adjusters: control 9c sends the technician to throttle 11 for a slow rise,
 * and on the rise the bellows fills through the unthrottled conduit 16, so the
 * relay is most of the rise. The fall carries the same relay delay and then the
 * throttled bleed through 17, and note 50 has 17 set to make the total match.
 */
declare const DEFAULTS: Parameters;
/**
 * The brushing reading of the same mechanism.
 *
 * The SUPRA corpus holds 327 runs of four or more latch changes with spans of
 * at most 250 ms on the sustain pedal. Taken as intentional half-pedals, they
 * cannot be made to hold the dampers still by any constants under which an
 * ordinary 300 ms change still arrives: the best such set leaves them swinging
 * by ±0.25 at the note onsets. What they can be made to do is brush — dip at
 * every lift and turn back before the dampers have settled, between 0.1 and
 * 0.5 of the travel — and every set of constants that does so has the fall
 * taking 260 to 360 ms to the rail, relay included, with the rise free. This
 * is the point of that plateau under which most of the corpus's ordinary
 * lifts still damp fully (the empirics' `docs/half-pedalling-intent.json`).
 *
 * Its price is stated rather than fitted: lifts shorter than about 265 ms, a
 * third of the corpus, are brushes under it too. Where the felts meet the
 * strings is the piano's, and the band of 0.1 to 0.5 is a guess at it; with a
 * higher contact point the plateau moves to faster falls.
 */
declare const BRUSHING: Parameters;
declare const SPEC: readonly ParameterSpec[];
/** Only the parts of a model input the pedals can see: they belong to no half. */
export type PedalInput = Pick<ModelInput, "grid" | "ports">;
export type PedalTravel = {
    /** 0 with the dampers on the strings, 1 with them fully raised. */
    readonly damper: Float64Array;
    /** 0 with the hammer rail at rest, 1 fully shifted. */
    readonly hammerRail: Float64Array;
    /** 1 while the Vorpneumatik asks for the dampers up: a latch on the T-100, a held perforation on the T-98. */
    readonly damperCommand: Uint8Array;
    /** The same for the hammer rail. */
    readonly hammerRailCommand: Uint8Array;
};
export type PedalControl = "sustainPedal" | "hammerRail";
/**
 * Which edge of the paper each pedal is punched on. The ports are named by the
 * edge rather than by a keyboard half, since a pedal acts on the whole
 * instrument, and the two scales put them the opposite way round: the T-100 has
 * the sustain on the treble edge and the hammer rail on the bass, the T-98 the
 * sustain on the third opening from the left and the soft pedal on the third
 * from the right (Welte, Betriebsanleitung pp. 15 f.; Hagmann, Anhang 11).
 */
export type PedalEdges = Readonly<Record<PedalControl, Half>>;
/** What the Vorpneumatik hands the main pneumatic: 1 while it asks for the pedal down. */
export type PedalCommand = (input: PedalInput, control: PedalControl, edges: PedalEdges) => Uint8Array;
/** How one scale's paper reaches the pedal bellows. */
export type PedalReading = {
    readonly edges: PedalEdges;
    readonly command: PedalCommand;
};
/**
 * The set/cancel pair of a T-100 pedal. Both sit on the Vorpneumatik and behave
 * as the nuancing relays do, so `latched` does the work.
 */
export declare const latchedCommand: PedalCommand;
/**
 * The single held perforation of a T-98 pedal, read through a relay valve.
 * Hagmann, p. 106 n. 48: "Sowohl bei der älteren als auch bei der jüngeren
 * Blockskala funktioniert die Vorpneumatik der Pedal-Einrichtung sinngemäss in
 * gleicher Weise wie die Ventile in den Relais der Nuancierungseinrichtungen."
 */
export declare const heldCommand: (valve: ValveSpec) => PedalCommand;
export declare function pedalTravel(input: PedalInput, params: Parameters, reading: PedalReading): PedalTravel;
/**
 * The regulation of throttle 17 that Hagmann reports on p. 107: it is set so
 * that bellows 18 opens in the same time as it closes. Kept as a transform over
 * the parameters rather than as a fitted tie, because the pedals leave no drawn
 * line and so nothing here is fitted at all.
 *
 * Deliberately not exposed as a `Model`. That interface is for things the
 * evaluator can score against the traced curves, and offering it here would
 * invite a fit that has no ground truth behind it.
 */
export declare function tiedToRise(params: Parameters): Parameters;
/** One stretch of the roll over which the damper command asks for one thing. */
export type PedalSpan = {
    readonly index: number;
    readonly seconds: number;
    readonly milliseconds: number;
    /** Travel when the command changed, and when it changed back. */
    readonly from: number;
    readonly to: number;
    /** True while the roll is asking for the dampers up. */
    readonly down: boolean;
};
/**
 * The roll's pedalling cut at the edges of the command. A span that ends short
 * of its rail is one the mechanism could not finish: the dampers were still on
 * their way when the roll asked for the other direction, which is the only way a
 * Welte reaches a position between its two ends.
 */
export declare function pedalSpans(travel: PedalTravel, grid: PedalInput["grid"]): PedalSpan[];
export type HalfPedalling = {
    readonly lifts: number;
    readonly unfinishedLifts: number;
    readonly presses: number;
    readonly unfinishedPresses: number;
    /** Highest the dampers still stood when a lift was cut short. */
    readonly deepestUnfinishedLift: number;
};
/** How much of the roll's pedalling the mechanism cannot carry out in full. */
export declare function halfPedalling(spans: readonly PedalSpan[], margin?: number): HalfPedalling;
export { BRUSHING as pedalBrushing, DEFAULTS as pedalDefaults, SPEC as pedalSpec };
