/**
 * A green roll written by hand, so that Welte's own regulation controls can be
 * run as tests. Not part of the package surface: nothing in `index.ts` exports
 * it, and it exists because §10 of the model specification asks for a test plan
 * that needs no fit.
 *
 * Distances are millimetres of paper and the axis is a constant 35.56 mm/s,
 * Hall's 7 ft/min at tempo 70 (*Pianola Journal* 22, 2012, p. 5, and Welte's own
 * Skala-Rolle §1b). A constant speed rather than the spool law, because a
 * control states a relation between perforations and the spool's acceleration
 * would put the later ones on a different footing from the earlier ones.
 */

import { ROWS_PER_MM } from "../core/aperture.ts";
import { Grid } from "../core/grid.ts";
import type { ModelInput, Parameters } from "../core/types.ts";
import { aperturePorts, type Control, type Half, type Punch } from "./codes.ts";
import { PUNCH_T98_MM } from "./geometry.ts";
import { pneumaticT98Model } from "./model.ts";

/** Hall's 7 ft/min at tempo 70, in mm/s. */
export const GREEN_SPEED = 35.56;

export const rowOf = (mm: number): number => mm * ROWS_PER_MM;

export function greenGrid(lengthMm: number): Grid {
  const length = Math.ceil(rowOf(lengthMm));
  return new Grid(0, Float64Array.from({ length }, (_, row) => row / ROWS_PER_MM / GREEN_SPEED));
}

/** One perforation, stated as where its ink starts and how long it runs. */
export const punch = (control: Control, fromMm: number, lengthMm: number, half: Half = "bass"): Punch => ({
  half,
  control,
  rowOn: rowOf(fromMm),
  rowOff: rowOf(fromMm + lengthMm),
});

/** A command punched as one slot, as an edition's collation delivers it. */
export const held = (control: Control, fromMm: number, lengthMm: number, half: Half = "bass"): Punch =>
  punch(control, fromMm, lengthMm, half);

/** The same command punched as Welte punched it: a chain of round holes on the 2.66 mm grid. */
export function chained(control: Control, fromMm: number, lengthMm: number, half: Half = "bass"): Punch[] {
  const pitch = 2.62;
  const count = Math.max(1, Math.round((lengthMm - PUNCH_T98_MM) / pitch) + 1);
  return Array.from({ length: count }, (_, index) => punch(control, fromMm + index * pitch, PUNCH_T98_MM, half));
}

/** A run of `count` single punches of one length at `pitchMm` centres, which is what a step-count control asks for. */
export function steps(
  control: Control,
  fromMm: number,
  count: number,
  { lengthMm = PUNCH_T98_MM, pitchMm = 20 } = {},
): Punch[] {
  return Array.from({ length: count }, (_, index) => punch(control, fromMm + index * pitchMm, lengthMm));
}

export function inputOver(grid: Grid, punches: readonly Punch[], half: Half = "bass"): ModelInput {
  return { grid, half, ports: aperturePorts(grid, punches) };
}

/** The bellows travel over a roll of `lengthMm` carrying `punches`. */
export function travelOf(lengthMm: number, punches: readonly Punch[], params: Parameters, half: Half = "bass"): Float64Array {
  const grid = greenGrid(lengthMm);
  return pneumaticT98Model.run(inputOver(grid, punches, half), params);
}

/** Where the bellows stands at a place on the paper. */
export const levelAt = (travel: Float64Array, mm: number): number =>
  travel[Math.min(Math.max(Math.round(rowOf(mm)), 0), travel.length - 1)]!;
