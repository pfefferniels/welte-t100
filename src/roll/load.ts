/**
 * Everything one roll needs, assembled: the punched code, the drawn curves, and
 * the grid they share. Paths follow the layout of `roll-nuance-tracer`, whose
 * working directory is expected one level up from this repository.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { readRoll, type AxisChoice, type Roll } from "./timing.ts";
import { WELTE_SPOOL } from "./spool.ts";
import { noteOnsets, perforations, type Half, type Perforation } from "./expression.ts";
import { aperturePorts, binaryPorts, DEFAULT_GEOMETRY, type PortGeometry, type PortKey } from "./aperture.ts";
import { readTracedCurves, type TracedCurves } from "../truth/curves.ts";
import { Grid } from "./grid.ts";
import { noteDensity } from "./density.ts";
import type { ModelInput } from "../model/types.ts";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export type PortModel = "aperture" | "binary";

export type LoadedRoll = {
  readonly roll: Roll;
  readonly curves: TracedCurves;
  readonly perforations: readonly Perforation[];
  readonly grid: Grid;
  inputFor(half: Half, portModel: PortModel, geometry?: PortGeometry): ModelInput;
  /** Same, over a doctored perforation list — for controls such as shuffled punches. */
  inputOver(half: Half, punches: readonly Perforation[], portModel: PortModel): ModelInput;
};

export function loadRoll(druid: string, axis: AxisChoice = WELTE_SPOOL): LoadedRoll {
  const roll = readRoll(druid, readFileSync(join(REPO, "cache", druid, `${druid}_raw.mid`)), axis);
  const curves = readTracedCurves(join(REPO, "out", druid, "curves.csv"));
  const punches = perforations(roll);

  // The time axis is rebuilt from the spool law rather than taken from the traced
  // file, whose `seconds` column is rounded to 0.1 ms. Rows are 1.7 ms apart, so
  // that rounding quantises every integration step to 1.6, 1.7 or 1.8 ms — a 6 %
  // error on each `dt`, where the law gives the step in closed form.
  const grid = Grid.overRows(roll.timing, curves.grid.startRow, curves.grid.startRow + curves.grid.length - 1);

  const portCache = new Map<string, Map<PortKey, Float64Array>>();
  const densityCache = new Map<Half | "both", Float64Array>();
  const densityFor = (which: Half | "both"): Float64Array => {
    const held = densityCache.get(which);
    if (held) return held;
    const onsets =
      which === "both" ? [...noteOnsets(roll, "bass"), ...noteOnsets(roll, "treble")] : noteOnsets(roll, which);
    const made = noteDensity(grid, onsets.map((tick) => roll.timing.rowAtTick(tick)));
    densityCache.set(which, made);
    return made;
  };

  return {
    roll,
    curves,
    perforations: punches,
    grid,
    inputFor(half, portModel, geometry = DEFAULT_GEOMETRY) {
      const cacheKey = `${portModel}:${geometry.punchDiameterPx}:${geometry.trackerDiameterPx}`;
      const ports =
        portCache.get(cacheKey) ??
        (portModel === "aperture" ? aperturePorts(grid, punches, geometry) : binaryPorts(grid, punches, geometry));
      portCache.set(cacheKey, ports);

      return { grid, half, ports, noteDensity: densityFor(half), totalNoteDensity: densityFor("both") };
    },
    inputOver(half, punches, portModel) {
      const build = portModel === "aperture" ? aperturePorts : binaryPorts;
      return {
        grid,
        half,
        ports: build(grid, punches, DEFAULT_GEOMETRY),
        noteDensity: densityFor(half),
        totalNoteDensity: densityFor("both"),
      };
    },
  };
}

/**
 * The whole punched code slid along the roll and wrapped round, so every
 * statistic of it survives and only its alignment with the drawn line is gone.
 * Whatever a model still scores against this is what its own shape buys it
 * rather than what it reads off the punches.
 */
export function circularShift(
  punches: readonly Perforation[],
  rows: number,
  span: readonly [number, number],
): Perforation[] {
  const [first, last] = span;
  const length = last - first;
  const wrap = (row: number): number => first + (((row - first + rows) % length) + length) % length;

  return punches
    .map((punch) => {
      const rowOn = wrap(punch.rowOn);
      const shift = rowOn - punch.rowOn;
      return {
        ...punch,
        rowOn,
        rowOff: punch.rowOff + shift,
        tickOn: punch.tickOn + shift,
        tickOff: punch.tickOff + shift,
      };
    })
    .sort((a, b) => a.rowOn - b.rowOn);
}
