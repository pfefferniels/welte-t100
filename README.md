# Welte-Mignon T-100 expression emulator

A few red Welte rolls of the late production period carry drawn *expression lines*. Hans-W.
Schmitz states, without giving a source, that they were drawn onto the finished rolls by two pens
coupled to the two *Nuancierbälge* while the roll was played back (*Das Mechanische
Musikinstrument* 19, 1981, p. 5), and Hermann Gottschewski restated that reading in 2024.
Gottschewski's proposal at the 3rd Global Piano Roll Meeting was to
read the rules of the mechanism off such lines and then emulate the lines by software, so
that emulated lines can serve to evaluate the many rolls that carry none. He also observed
that the Welte crescendos are far from linear, the slow diminuendo resembling an exponential
decay ([Sydney, 26 July 2024](https://www.youtube.com/watch?v=lNn3OrWgGgM)). This emulator
follows that proposal on roll 3309.

It derives the travel of the two *Nuancierbälge* from the punched expression code by
modelling the pneumatics that move them: the valves the code operates, the conduits of
different bore through which the bellows fills and empties, the wind chamber they draw on,
and the Mezzoforte stop that arrests the travel. The conductance of each conduit, the
thresholds and time constants of the valves, and the weight of every further term are fitted
by differential evolution with a Nelder–Mead polish, then scored against the expression lines
on the blocks of the roll left out of the fit.

## Running it

Node 24 or later, no build step and no runtime dependencies. Node strips the types itself.

```sh
npm install          # typescript and @types/node, for checking only
npm test             # unit tests
npm run eval         # every model against the expression line, published constants
node src/cli/evaluate.ts --fit docs/fit-pneumatic.json --timing scan   # fitted constants, SUPRA's own tempo map
node src/cli/fit.ts pneumatic --generations 120 --out docs/fit-pneumatic.json
node src/cli/experiments.ts --out docs/experiments.json
node src/cli/residuals.ts --fit docs/fit-pneumatic.json
node src/cli/polish.ts --fit docs/fit-pneumatic.json    # sweep a fit that predates the sweep
```

The ablation is the slow part, tens of minutes per variant. `--slice i/n` splits the
variants across processes and `src/cli/collect.ts` puts the pieces back together, writing
`docs/experiments.md` and lifting the unrestricted fit into `docs/fit-pneumatic.json`:

```sh
for i in 0 1 2 3 4; do node src/cli/experiments.ts --slice $i/5 --out /tmp/exp-$i.json & done
node src/cli/collect.ts /tmp/exp-*.json
node src/cli/export-view.ts --fit docs/fit-pneumatic.json --out view/data.js
node view/build-single.mjs
```

Fitting and evaluation expect the traced curves at `../out/{druid}/curves.csv` and the SUPRA
raw MIDI at `../cache/{druid}/{druid}_raw.mid`, one directory level up from this one, which is
where `trace_roll.py` leaves them. The library and the unit tests need neither.

## Using it as a library

The package is `welte-t100-emulator` on npm. `npm run build` writes `dist/`, which is what the
package exports and what is committed, so a dependency on a checkout of this repository needs
no build of its own either, which is how linked-rolls is developed against it:

```json
"welte-t100-emulator": "file:../welte-t100"
```

Releases go out through `.github/workflows/publish.yml`: raise the version in `package.json`,
commit, and push a tag `v<version>`, or run the workflow from the Actions tab.

`src/index.ts` is the whole surface: the spool law (`paperSeconds`, `paperAt`, `WELTE_SPOOL`),
the sample grid and the tracker-bar ports (`Grid`, `aperturePorts`, `geometryInMm`), the two
mechanisms (`pneumaticModel`, `runPedals`) and the constants for them (`playbackParameters`,
`pedalDefaults`). `playbackParameters` is the headline fit with the terms that describe the
drawing apparatus switched off, since a playback instrument reads the punches where they are;
`travelBetweenRails` puts its output on a 0 to 1 scale between the two rails. Nothing in the
library reads a file. [linked-rolls](https://github.com/pfefferniels/linked-rolls) runs its
emulation on it. Rebuild `dist/` whenever `src/` changes, and commit it.

## What is in here

| | |
| --- | --- |
| `src/index.ts` | the library surface, built into `dist/` |
| `src/roll/` | the roll as input: a MIDI reader, the take-up spool that sets the time axis, the expression code, the tracker-bar aperture |
| `src/truth/` | the traced curves, with the flags that say which rows are evidence |
| `src/model/` | the models, the Mezzoforte stop they share, the pedals, and the constants playback runs on |
| `src/eval/` | masked metrics, the train/test split, and the fitting |
| `src/cli/` | evaluate, fit, polish, ablate, and inspect the residuals |
| `docs/sources.md` | what the sources say, by topic: Hagmann 1984 and Welte's regulation controls, Schmitz 1981, Gottschewski, the patents, `midi2exp` and `pianolatron` |
| `docs/measurements.md` | what roll 3309 shows, measured without a model |
| `docs/experiments.md` | the ablation table and what it decides |
| `docs/findings.html` | the report, as artifact source; `docs/embed-figures.mjs` inlines its figures |
| `analysis/` | the Python that produced `docs/measurements.md` and its figures |
| `view/` | an overlay viewer: expression line, emulated line, punched code, residual |
| `cluster/` | SLURM scripts for bwUniCluster, and `pull.sh` to bring results home |

## The model

The state is the closure of the Nuancierbalg: 0 fully open, which sets the cone valve for the
least vacuum and so the softest attack, 1 fully closed and loudest. Valves admit air to it or
draw air out of it through conduits of different bore, and the speed of a bellows filling
through a conduit depends on how far it still has to go:

```
dx/dt = Σ  g · a · sign(T − x) · |T − x|^α
```

one term per open path, with `g` the conductance of its conduit, `a` how far the tracker port
is open, `T` the position that path pulls towards, and `α` the exponent of the flow law.
`α = 1` is a laminar throttle and gives an exponential approach, `α = ½` an orifice, `α = 0`
a constant rate, which is what `midi2exp` and `pianolatron` assume. `α` is fitted rather than
chosen, so the family contains the prior art as a special case. The fitted values are in
`docs/fit-pneumatic.json` and `docs/experiments.md`.

Everything below is in the model because a source says so or a measurement demanded it, and
`docs/experiments.md` prices each one by taking it away and refitting.

**From Hagmann's account of the relay.** Conduit 39 is joined to the bellows permanently and
the crescendo relay only switches its far end between blower vacuum and atmosphere, so it is
one path with two targets — which makes `midi2exp`'s separate rule that a slow decrescendo
always runs simply the state of that conduit when the crescendo latch is off. Conduit 23 is
wider and belongs to the sforzando. Throttle 96 assists the reopening after a cancel.

**Two terms the transits demanded.** The relay valve does not lift in proportion to the whole
charge above its threshold but over about a sixth of it, `valveBand` at 0.171 and 0.065, so the
conductance of conduit 23 stops following the tracker port's open area, which takes 25 ms to
slide across the bore and was the model's whole remaining sluggishness on the set side. And
with the crescendo relay off, conduit 39 stands open to atmosphere while the sforzando valve
draws on wind chamber 15, so air runs straight through the bellows without moving it and loads
the blower: `throughFlowLoad`, 0.153 and 0.112, on 4.6 % and 8.6 % of rows. Together they are
worth 0.0368 to 0.0302 in the bass and 0.0478 to 0.0393 in the treble against a control fitted
on the same budget. A band of its own for the cancelling valve and a dry-friction term were
tried the same way and rejected.

**From Welte's regulation procedure**, Anhang 12, which is the T-100's own acceptance test.
A relay valve does not follow its port: air enters its membrane chamber through the port and
leaves through a bleed, and the valve lifts only once the chamber charges past a threshold.
That is what lets six short perforations give six steps while six shorter ones give none
(control 4b), and what makes a short cancel return the bellows only part of the way
(control 4d). Welte adjusts the two valves at separate bores, 20 and 29, so they have
separate time constants here.

**From the expression line itself.** The Mezzoforte stop arrests the bellows at two levels a
thickness apart depending on which side it approached from, and its position is a regulated
setting rather than the printed gridline. The stop yields in the direction it is pushed, so
the rising rest is the higher of the two, which is the opposite of what an inelastic barrier
would give; both faces are set from the levels the line rests at rather than fitted. Every stop is compliant rather than rigid, so the bellows rebounds off it — visible
in the expression line after a fast collapse. The offset between line and punches differs by code,
drifts along the roll, and varies with the line's own level, which is the pen swinging on an
arm; the same arc bends the printed scale, which `scaleWarp` carries.

`src/model/field.ts` is a control rather than a model: it bins the expression line by valve state
and position and runs the resulting table forward. It assumes no flow law at all. It fails —
a velocity field estimated along the true trajectory diverges when run open-loop — and is
kept because that is worth knowing.

## Fitting

Parameters are fitted by differential evolution with a Nelder–Mead polish, on alternating
eight-second blocks, and scored on the blocks left out. Two details matter more than they
look. Most of the initial population is clustered around the starting point at a spread of
scales: seeding a handful of good members into an otherwise random population does not work,
because differential evolution moves by differences between members and every trial step is
then far too large — observed here as a search that did not improve at all over forty
generations. And the fit runs in two stages, the first holding the quantities `docs/measurements.md`
measures directly off the roll and fitting only what is unknown, the second releasing
everything from there.

`cluster/` holds SLURM scripts for bwUniCluster, where the ablation runs as a job array of one
fit per variant and half. Node 24 in `$HOME` runs the TypeScript directly, so the cluster and a
laptop run the same source with no build step, and reproduce each other to four decimals.

## Honest limits

- One roll, one performance, one instrument. Nothing here shows the constants transfer.
- Bass and treble disagree on several numbers that ought to match if the two halves share a
  mechanism. Some of that may be the calibration of the printed scale, whose F.F. gridline is
  shared between the halves, and some may be real. It has not been separated, and correcting
  the trace mask and the stop's faces did not settle it: across the fourteen constants that
  describe the mechanism rather than the scale, eight agree better and the mean gap is slightly
  worse. The Mezzoforte stop is the exception that suggests the rest is search rather than
  physics — where the pin is in the path the two halves score 0.0299 and 0.0295, and its
  thickness measured off the roll comes out at 0.050 and 0.041, but a fit free to move the
  faces pulls them four times further apart than that.
- The models are fitted on alternating blocks of the same roll and scored on the blocks left
  out. That guards against a model memorising the roll; it does not make the constants
  general.
- What the expression line physically records is not settled. It behaves like the bellows and not
  like an editor's smooth intention curve — it piles up sharply at one level whenever the
  Mezzoforte hook is set, and it overshoots after a sforzando — but that is an argument, not
  a demonstration.
