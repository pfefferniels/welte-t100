/**
 * The nuancing constants a playback instrument runs on.
 *
 * The headline fit in `docs/fit-pneumatic.json` describes two things at once:
 * the mechanism, and the apparatus that drew the line the mechanism was fitted
 * against. The lead of the punches over the drawn line, its variation by code,
 * by level and along the roll, and the bend of the printed scale all belong to
 * the pen and the layout of the master roll (`docs/measurements.md` §5). A
 * piano reads the punches where they are, so for playback those terms are
 * switched off and the rest is kept as fitted.
 *
 * What is claimed is only that this is the best estimate the one roll allows.
 * The two halves disagree on several constants that a shared mechanism ought to
 * share, and nothing here shows they transfer to another instrument.
 */

import type { Half } from "../roll/expression.ts";
import { pneumaticModel } from "./pneumatic.ts";
import type { Parameters } from "./types.ts";

/** `docs/fit-pneumatic.json`, verbatim. The test beside this file keeps it so. */
export const FITTED: Record<Half, Parameters> = {
  bass: {
    alpha: 1.5179859536304998,
    piano: 0.021933579702658277,
    forte: 0.9018758145918239,
    mezzoforte: 0.7164119424458567,
    crescendoRate: 1.7085901538825954,
    crescendoTarget: 0.8268293059199202,
    releaseRate: 0.5936749345530477,
    releaseTarget: -0.4625670409485217,
    sforzandoRate: 0.9694464603797992,
    sforzandoTarget: 2.9614420315195265,
    sforzandoAssistRate: 18.251108785807617,
    tripThreshold: 0.36095311331742264,
    membraneFillMs: 1.1518778330361434,
    assistFillMs: 10.19120192322455,
    valveTailMs: 88.78632203136377,
    inertiaMs: 16.379654552878435,
    leadRows: -69.65112551979486,
    leadSforzandoOnRows: -3.0214009493699203,
    leadCrescendoRows: 5.974568808431997,
    leadMezzoforteRows: 51.70372760663592,
    leadPerLevelRows: -1.7575952946520028,
    leadDriftRows: 0.21484182976924532,
    valveBand: 0.012657761498530469,
    throughFlowLoad: 0.1517878682262342,
    scaleWarp: 1.262632434115854,
    mfTwoSided: 1,
    mfThickness: 0.06,
    stopRestitution: 0.6328166778402908,
    assistLatches: 0.35962269821409265,
  },
  treble: {
    alpha: 1.3852259423716013,
    piano: 0.025743845956742586,
    forte: 0.946782897639223,
    mezzoforte: 0.7287665204562139,
    crescendoRate: 0.8243073473866771,
    crescendoTarget: 0.8797285989732979,
    releaseRate: 0.7779262737869217,
    releaseTarget: -0.28377689690597,
    sforzandoRate: 1.0118172867093582,
    sforzandoTarget: 2.941341435253644,
    sforzandoAssistRate: 57.3229860654494,
    tripThreshold: 0.030891909469682153,
    membraneFillMs: 45.20451358691349,
    assistFillMs: 42.448462137018865,
    valveTailMs: 33.55774484785462,
    inertiaMs: 11.98854027265393,
    leadRows: -53.1542546965722,
    leadSforzandoOnRows: -9.258574211694457,
    leadCrescendoRows: 0.3091523369847619,
    leadMezzoforteRows: 2.4094564985573768,
    leadPerLevelRows: -6.061972054844579,
    leadDriftRows: 11.974627651885422,
    valveBand: 0.013505711213519069,
    throughFlowLoad: 0.09131703168792737,
    scaleWarp: 0.8440580681972055,
    mfTwoSided: 1,
    mfThickness: 0.06,
    stopRestitution: 0.40657599007673656,
    assistLatches: 0.18445343260306366,
  },
};

/** The terms that describe the drawing apparatus rather than the mechanism. */
export const DRAWING_APPARATUS: Parameters = {
  leadRows: 0,
  leadSforzandoOnRows: 0,
  leadCrescendoRows: 0,
  leadMezzoforteRows: 0,
  leadPerLevelRows: 0,
  leadDriftRows: 0,
  scaleWarp: 0,
};

export function playbackParameters(half: Half): Parameters {
  return { ...pneumaticModel.defaults, ...FITTED[half], ...DRAWING_APPARATUS };
}

/**
 * The model's output as a fraction of the bellows' travel: 0 at the open rail,
 * 1 at the closed rail. The rails are constants of the fit and differ between
 * the halves, so this is the scale on which the two can be compared, and on
 * which a velocity map has to be anchored.
 */
export function travelBetweenRails(output: Float64Array, params: Parameters): Float64Array {
  const piano = params.piano ?? 0;
  const forte = params.forte ?? 1;
  return Float64Array.from(output, (value) => (value - piano) / (forte - piano));
}

/** Where the centre of the Mezzoforte pin sits on that fraction of the travel. */
export function mezzoforteTravel(params: Parameters): number {
  const piano = params.piano ?? 0;
  const forte = params.forte ?? 1;
  return ((params.mezzoforte ?? 0.5) - piano) / (forte - piano);
}
