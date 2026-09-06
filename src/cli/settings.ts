/**
 * Where the headline roll's files live and what a roll measures of its own
 * constants, kept apart from the command that runs a fit.
 *
 * `src/cli/fit.ts` starts a fit as soon as it is loaded, so anything that needs
 * these has to import them from somewhere with no side effects. Taking them from
 * there once had a machine quietly refitting the whole roll instead of polishing
 * an existing fit.
 */

import { MF_THICKNESS } from "../model/stop.ts";
import type { Parameters } from "../model/types.ts";
import { HALVES, type Half } from "../roll/expression.ts";
import type { LoadedRoll } from "../roll/load.ts";
import { WELTE_SPOOL } from "../roll/spool.ts";
import type { AxisChoice } from "../roll/timing.ts";
import { measureRoll, parametersOf, withheldFrom, type Evidence } from "../truth/measure.ts";

/**
 * Roll 3309, Backhaus playing the *Militärmarsch*: the roll everything here was
 * measured and fitted on, and the one whose fit the library ships. Other rolls
 * pass through the same commands with `--druid`.
 */
export const HEADLINE_DRUID = "jq774vx6544";

/**
 * Where a roll's fit is written and looked for. The headline roll keeps the
 * name the library and the viewer already know; every other roll gets a file of
 * its own, so a second roll can never overwrite the published fit.
 */
export function fitPathFor(druid: string): string {
  return druid === HEADLINE_DRUID ? "docs/fit-pneumatic.json" : `docs/fits/${druid}.json`;
}

/** The same rule for a command's other output, which is named after the command. */
export function outputFor(druid: string, command: string, extension = "json"): string {
  return druid === HEADLINE_DRUID
    ? `docs/${command}.${extension}`
    : `docs/fits/${druid}-${command}.${extension}`;
}

/**
 * The time axis a command was asked for: `--timing scan` for the tempo map in the
 * SUPRA file, otherwise the take-up spool, whose two interesting parameters are
 * `--effect` (how much of the circumference growth reaches the paper) and
 * `--revolution` (the spool's period, which sets the length of the whole axis).
 */
export function axisFrom(argv: readonly string[]): AxisChoice {
  const option = (name: string, fallback: number): number => {
    const at = argv.indexOf(`--${name}`);
    if (at < 0) return fallback;
    const given = Number(argv[at + 1]);
    if (!Number.isFinite(given)) throw new Error(`--${name} wants a number, and was given ${argv[at + 1]}`);
    return given;
  };
  const timing = argv.indexOf("--timing");
  if (timing >= 0 && argv[timing + 1] === "scan") return "scan";
  return {
    ...WELTE_SPOOL,
    circumferenceEffect: option("effect", WELTE_SPOOL.circumferenceEffect),
    revolutionSeconds: option("revolution", WELTE_SPOOL.revolutionSeconds),
  };
}

/**
 * The four constants of whichever roll is in hand: the two rails from where the
 * line comes to rest, the level the Mezzoforte finger arrests it at, and the
 * offset from the punches. `src/truth/measure.ts` reads them off the roll, so
 * roll 3309 goes the same way as any other.
 *
 * The arrest face is the one observable quantity, and `mezzoforte` is the pin's
 * centre, half of `MF_THICKNESS` below it.
 */
export type RollConstants = {
  /** Pinned in the fit's first stage, per half. Only what this roll shows. */
  readonly pinned: Record<Half, Parameters>;
  /** What it does not show, so the fit can say why it is fitting them. */
  readonly withheld: Record<Half, readonly Evidence[]>;
};

export function constantsOf(loaded: LoadedRoll): RollConstants {
  const measured = measureRoll(loaded);
  const perHalf = <T,>(of: (half: Half) => T): Record<Half, T> =>
    Object.fromEntries(HALVES.map((half) => [half, of(half)])) as Record<Half, T>;
  return {
    pinned: perHalf((half) => parametersOf(measured[half], MF_THICKNESS)),
    withheld: perHalf((half) => withheldFrom(measured[half])),
  };
}

/**
 * The same four, as `docs/measurements.md` prints them for roll 3309 from the Python
 * under `analysis/`. Nothing fits against these: `src/truth/measure.test.ts`
 * holds them as the expectation the TypeScript measurement has to reproduce.
 */
export const MEASURED_3309: Record<Half, Parameters> = {
  bass: { piano: 0.017, forte: 0.912, mezzoforte: 0.5752 + 0.03, leadRows: -65 },
  treble: { piano: 0.022, forte: 0.952, mezzoforte: 0.6169 + 0.03, leadRows: -46 },
};
