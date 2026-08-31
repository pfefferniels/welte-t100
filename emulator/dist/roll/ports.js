/**
 * Any red Welte roll as a grid of tracker-bar ports, with no traced line needed.
 *
 * `load.ts` assembles roll 3309 together with the Handnuancierung traced beside
 * it, and takes its sample grid from that tracing, because the whole point there
 * is to compare the two row by row. A roll with no drawn line has no such grid.
 * This makes one over the punched length instead, which is all the pedal model
 * asks for, and is what lets it run on a roll other than the one the nuancing
 * work is anchored to.
 */
import { readFileSync } from "node:fs";
import { aperturePorts, DEFAULT_GEOMETRY } from "./aperture.js";
import { perforations } from "./expression.js";
import { Grid } from "./grid.js";
import { pixels, readRoll } from "./timing.js";
export function readRollFile(path, druid = path) {
    return readRoll(druid, readFileSync(path));
}
/**
 * The punch diameter off the roll's own `AVG_HOLE_WIDTH` rather than roll
 * 3309's. The tracker bore is the instrument's and does not vary with the scan,
 * so it stays as Welte's 1.413 mm at the scan's resolution.
 */
export function geometryOf(roll) {
    const measured = pixels(roll.metadata.get("AVG_HOLE_WIDTH"));
    return Number.isFinite(measured) && measured > 0
        ? { ...DEFAULT_GEOMETRY, punchDiameterPx: measured }
        : DEFAULT_GEOMETRY;
}
/**
 * Perforations of one port separated by less than the tracker bore, joined.
 *
 * Some hole detectors report a single long perforation as two or more pieces
 * with a few pixels of apparent paper between them. `aperture.ts` already joins
 * pieces that touch or overlap; this joins pieces that do not, on the ground
 * that a gap narrower than the bore is not something the mechanism could read as
 * a second command in any case. It repairs a scanning artefact rather than
 * modelling anything, and on a roll whose detector does not split perforations
 * it changes nothing.
 */
export function bridged(punches, geometry) {
    const bore = geometry.trackerDiameterPx;
    const byPort = Map.groupBy(punches, (punch) => `${punch.half}:${punch.control}:${punch.action}`);
    return [...byPort.values()]
        .flatMap((port) => port
        .toSorted((a, b) => a.rowOn - b.rowOn)
        .reduce((joined, punch) => {
        const last = joined.at(-1);
        if (!last || punch.rowOn - last.rowOff >= bore)
            return [...joined, punch];
        const grown = {
            ...last,
            rowOff: Math.max(last.rowOff, punch.rowOff),
            tickOff: Math.max(last.tickOff, punch.tickOff),
            secondsOff: Math.max(last.secondsOff, punch.secondsOff),
        };
        return [...joined.slice(0, -1), grown];
    }, []))
        .sort((a, b) => a.rowOn - b.rowOn || a.key - b.key);
}
/**
 * The grid runs from the roll's first hole to its last, both of which the image
 * parser writes into the file's metadata.
 */
export function rollPorts(roll) {
    const geometry = geometryOf(roll);
    const punches = bridged(perforations(roll), geometry);
    const firstRow = pixels(roll.metadata.get("FIRST_HOLE"));
    const lastRow = pixels(roll.metadata.get("LAST_HOLE"));
    const grid = Grid.overRows(roll.timing, firstRow, lastRow);
    return { roll, grid, ports: aperturePorts(grid, punches, geometry), perforations: punches, geometry };
}
