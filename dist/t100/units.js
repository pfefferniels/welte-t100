/**
 * The T-100's constants on the two scales, and the terms that belong to the pen
 * rather than to the instrument.
 */
import { unitsOf } from "../core/units.js";
import { T100_SCALING } from "./model.js";
/**
 * The terms that describe the drawing apparatus rather than the mechanism: the
 * lead of the punches over the drawn line, its variation by code and along the
 * roll, and the bend of the printed scale (`empirics/docs/measurements.md` §5). A piano
 * reads the punches where they are, so an instrument carries them switched off.
 */
export const DRAWING_APPARATUS = {
    leadRows: 0,
    leadSforzandoOnRows: 0,
    leadCrescendoRows: 0,
    leadDriftRows: 0,
    scaleWarp: 0,
};
export const { inTravelUnits, onPrintedScale } = unitsOf(T100_SCALING);
