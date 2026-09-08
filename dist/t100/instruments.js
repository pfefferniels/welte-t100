/**
 * The instruments a playback can run on.
 *
 * Six rolls carry drawn expression lines, and each was drawn by an instrument as
 * it was set on that day. Fitted separately, the six settings do not transfer to
 * one another's lines, so a caller chooses rather than inherits: the consensus,
 * one instrument fitted to all six lines at once; a preset, the setting that drew
 * one particular roll, named by the roll's Welte number because nothing in the
 * six rolls lets a year or a performer predict the setting; or explicit
 * parameters, over either.
 *
 * Every set is in bellows travel, the rails at 0 and 1 and the terms that
 * describe the drawing apparatus switched off, so that the sets are comparable
 * and apply to any roll. `onPrintedScale` puts one onto a roll whose rails sit
 * elsewhere. The provenance beside each set says what it was fitted to and how
 * well, and the caveats a roll's trace carries.
 *
 * None of these is a regulated instrument as Welte would have delivered it: the
 * drawing instruments were out of regulation, and the lines violate Welte's own
 * control 6c, the fall being four times the rise.
 */
import { CONSENSUS_DATA, PRESET_DATA } from "./instruments.data.js";
export const PRESETS = PRESET_DATA;
export const CONSENSUS = CONSENSUS_DATA;
export function instrumentOf(choice) {
    return choice === "consensus" ? CONSENSUS : PRESETS[choice];
}
/** The constants one keyboard half runs on, in bellows travel. */
export function instrumentParameters(half, choice = "consensus") {
    if (choice === "consensus")
        return CONSENSUS[half];
    if ("preset" in choice)
        return PRESETS[choice.preset][half];
    return { ...instrumentOf(choice.over ?? "consensus")[half], ...choice.parameters };
}
