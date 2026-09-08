/**
 * The T-98's constants on the two scales, and the terms that belong to the pen
 * rather than to the instrument.
 */

import type { Parameters } from "../core/types.ts";
import { unitsOf } from "../core/units.ts";
import { T98_SCALING } from "./model.ts";

/**
 * The terms that describe the drawing apparatus rather than the mechanism. The
 * T-98 has one offset per function where the T-100 has two, and one more of them,
 * since its mezzoforte has a single edge; and `leadRows` is named for the
 * sforzando-**piano** code, where the T-100's is named for the sforzando-off.
 *
 * DRP 412 965 says what these ought to be: the field lines let the player see
 * the dynamic "im Augenblick des Übergleitens über die Löcher des Skalenblocks",
 * so Welte's own notation intends line and perforation at the same paper position
 * to be simultaneous, and zero is the expected value. They are therefore nuisance
 * parameters of the *measurement*: fitted per roll, reported, and discarded
 * before anything ships. A fitted lead far from zero is a finding about the pen
 * or the hand, not a property of the instrument.
 */
export const DRAWING_APPARATUS: Parameters = {
  leadRows: 0,
  leadSforzandoOnRows: 0,
  leadCrescendoRows: 0,
  leadMezzoforteRows: 0,
  leadDriftRows: 0,
  scaleWarp: 0,
};

export const { inTravelUnits, onPrintedScale } = unitsOf(T98_SCALING);
