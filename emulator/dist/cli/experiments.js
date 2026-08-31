/**
 * One question per row: an ablation table over the modelling choices.
 *
 *   node src/cli/experiments.ts [--generations N] [--out FILE] [--only substring]
 *
 * Every variant is refitted from scratch so that pinning one choice does not
 * simply deprive the model of a parameter — the rest move to compensate. Scores
 * are on the held-out blocks.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { circularShift, loadRoll } from "../roll/load.js";
import { halfOf } from "../truth/curves.js";
import { alternatingBlocks } from "../eval/split.js";
import { fitModel, scoreOnly } from "../eval/fitting.js";
import { midi2expModel } from "../model/midi2exp.js";
import { pneumaticModel } from "../model/pneumatic.js";
import { constantModel } from "../model/reference.js";
import { estimateField, fieldModel } from "../model/field.js";
import { withFixed, withTied } from "../model/types.js";
const pneumatic = (label, question, fixed) => ({
    label,
    question,
    model: withFixed(pneumaticModel, fixed, "pneumatic"),
    ports: "aperture",
    fit: true,
});
const VARIANTS = [
    { label: "constant level", question: "the floor: what one number achieves", model: constantModel, ports: "aperture", fit: true },
    { label: "midi2exp, published constants", question: "the model as it stands", model: midi2expModel, ports: "binary", fit: false },
    { label: "midi2exp, refitted", question: "how much of its error is bad constants", model: midi2expModel, ports: "binary", fit: true },
    { label: "midi2exp, refitted, aperture ports", question: "does the round port help a linear model", model: midi2expModel, ports: "aperture", fit: true },
    { label: "pneumatic, full", question: "everything free", model: pneumaticModel, ports: "aperture", fit: true },
    pneumatic("pneumatic, alpha = 0 (constant rate)", "is a ramp enough", { alpha: 0 }),
    pneumatic("pneumatic, alpha = 1/2 (orifice)", "square-root flow", { alpha: 0.5 }),
    pneumatic("pneumatic, alpha = 1 (laminar)", "exponential approach", { alpha: 1 }),
    pneumatic("pneumatic, no inertia", "does the linkage need mass", { inertiaMs: 0 }),
    pneumatic("pneumatic, no lead", "is the drawn line offset from the punches", { leadRows: 0 }),
    pneumatic("pneumatic, M.F. pinned to 0.5", "is the hook at the printed gridline", { mezzoforte: 0.5 }),
    pneumatic("pneumatic, no M.F. stop", "does the hook do anything", { mfBarrier: 0 }),
    pneumatic("pneumatic, M.F. stop one-sided", "the roll's reading: a floor", { mfBarrier: 1, mfTwoSided: 0 }),
    pneumatic("pneumatic, M.F. stop two-sided", "Hagmann's reading: a barrier", { mfBarrier: 1, mfTwoSided: 1 }),
    pneumatic("pneumatic, sforzando momentary", "midi2exp's reading of the sforzando", { sforzandoLatches: 0 }),
    pneumatic("pneumatic, sforzando latching", "Hagmann's reading of the sforzando", { sforzandoLatches: 1 }),
    pneumatic("pneumatic, sforzando sets crescendo", "Hagmann's coupling of the two valves", { sforzandoSetsCrescendo: 1 }),
    pneumatic("pneumatic, sforzando alone", "no coupling", { sforzandoSetsCrescendo: 0 }),
    pneumatic("pneumatic, neither note-density term", "does what is sounding show in the line at all", { regulatorGain: 0, supplyDroop: 0 }),
    pneumatic("pneumatic, note density as an offset", "the wrong shape: density added to the position", { supplyDroop: 0 }),
    pneumatic("pneumatic, note density as a sagging supply", "the right shape: density slowing the closing", { regulatorGain: 0 }),
    pneumatic("pneumatic, no Widerstand", "does the blower's two-speed control show", { windRateGain: 1, windTargetShift: 0 }),
    pneumatic("pneumatic, no puff threshold", "does a barely open port fire the relay", { tripThreshold: 0 }),
    pneumatic("pneumatic, no valve tail", "does a valve shut with its punch", { valveTailMs: 1 }),
    pneumatic("pneumatic, instant relay", "does the membrane chamber need to charge", { membraneFillMs: 0, tripThreshold: 0 }),
    pneumatic("pneumatic, no lead drift", "is the offset constant along the roll", { leadDriftRows: 0 }),
    pneumatic("pneumatic, scale linear in travel", "is the printed scale linear in bellows travel", { scaleWarp: 0 }),
    {
        label: "pneumatic, one vacuum, two bores",
        question: "both closing paths draw the same vacuum, so only their conductance should differ",
        model: withTied(pneumaticModel, { crescendoTarget: "sforzandoTarget" }, "pneumatic"),
        ports: "aperture",
        fit: true,
    },
    {
        label: "pneumatic, crescendo pair symmetric",
        question: "Welte regulates open and close to the same time",
        model: withTied(pneumaticModel, { releaseRate: "crescendoRate" }, "pneumatic"),
        ports: "aperture",
        fit: true,
    },
    {
        label: "pneumatic, sforzando pair symmetric",
        question: "the same regulation for the sforzando pair",
        model: withTied(pneumaticModel, { sforzandoAssistRate: "sforzandoRate" }, "pneumatic"),
        ports: "aperture",
        fit: true,
    },
    { label: "pneumatic, binary ports", question: "does the round port matter", model: pneumaticModel, ports: "binary", fit: true },
    {
        label: "velocity field, no flow law",
        question: "upper bound on any model with this state",
        build: (input, truth, train) => fieldModel(estimateField(input, truth, train)),
        ports: "aperture",
        fit: true,
    },
    { label: "pneumatic, punches slid 30 s", question: "control: score without alignment", model: pneumaticModel, ports: "aperture", fit: true, shiftRows: 18000 },
];
const HALVES = ["bass", "treble"];
function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}
function main() {
    const druid = option("druid", "jq774vx6544");
    const generations = Number(option("generations", "70"));
    const only = option("only", "");
    const out = option("out", "docs/experiments.json");
    const [part, parts] = option("slice", "0/1").split("/").map(Number);
    const loaded = loadRoll(druid);
    const span = [loaded.grid.startRow, loaded.grid.startRow + loaded.grid.length - 1];
    const chosen = VARIANTS.filter((variant, index) => variant.label.includes(only) && index % parts === part);
    const rows = chosen.flatMap((variant) => {
        process.stderr.write(`\n${variant.label} — ${variant.question}\n`);
        return HALVES.map((half) => {
            const truth = halfOf(loaded.curves, half);
            const masks = alternatingBlocks(loaded.grid, truth.observed);
            const input = variant.shiftRows
                ? loaded.inputOver(half, circularShift(loaded.perforations, variant.shiftRows, span), variant.ports)
                : loaded.inputFor(half, variant.ports);
            const model = variant.model ?? variant.build(input, truth, masks.train);
            const result = variant.fit
                ? fitModel(model, input, truth, masks, {
                    generations,
                    report: (line) => process.stderr.write(`  ${half} ${line}\n`),
                })
                : scoreOnly(model, input, truth, masks);
            process.stderr.write(`  ${half}: test rmse ${result.test.rmse.toFixed(4)} (${result.seconds.toFixed(0)} s)\n`);
            return { variant: variant.label, question: variant.question, half, ...result, output: undefined };
        });
    });
    console.table(rows.map((row) => ({
        variant: row.variant,
        half: row.half,
        "test rmse": row.test.rmse.toFixed(4),
        "test mae": row.test.mae.toFixed(4),
        "test r": row.test.correlation.toFixed(3),
        "median |e|": row.test.medianAbs.toFixed(4),
        "p90 |e|": row.test.p90Abs.toFixed(4),
    })));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ druid, generations, rows }, null, 2));
    process.stderr.write(`wrote ${out}\n`);
}
main();
