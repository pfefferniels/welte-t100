# A Welte-Mignon T-100 expression emulator

Derives the travel of the two *Nuancierbälge* of a red Welte from the punched expression
code of the roll, and measures the result against the *Handnuancierung* lines drawn on
roll 3309 and traced by the tool one directory up.

The point of the exercise is that roll 3309 carries both halves of the problem on the same
sheet: the drawn line, which Pfeffer's dissertation reads as a record of the bellows itself
after Gottschewski's Sydney paper of 2024, and the punched code that a Welte piano would play
from. So the usual difficulty with
expression emulators — that there is nothing to check them against — does not apply here.
Whatever the drawn line turns out to be, it is a second, independent witness to the same
performance, and a model can be scored against it row by row.

The starting point is Stanford's `midi2exp` (Shi and Sapp) and its port in SUL-CIDR's
`pianolatron`. Neither is followed here. Both integrate a constant rate; the roll says the
bellows moves at a speed that depends on how far it still has to travel.

## Running it

Node 24 or later, no build step and no runtime dependencies. Node strips the types itself.

```sh
npm install          # typescript and @types/node, for checking only
npm test             # unit tests
npm run eval         # every model against the drawn line, published constants
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

It expects the tracer's output at `../out/{druid}/curves.csv` and the SUPRA raw MIDI at
`../cache/{druid}/{druid}_raw.mid`, which is where `trace_roll.py` leaves them.

## Using it as a library

`npm run build` writes `dist/`, which is what the package exports and what is committed, so a
dependency on this directory needs no build of its own:

```json
"welte-t100-emulator": "file:../roll-nuance-tracer/emulator"
```

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
| `docs/pneumatics.md` | the mechanism after Hagmann 1984, with the German where it is load-bearing |
| `docs/prior-art.md` | `midi2exp` and `pianolatron`, stated precisely enough to port |
| `docs/empirics.md` | what the drawn line does when the punched code changes, measured |
| `docs/signal-path.md` | the path from perforation to bellows, read off Anhang 13 at 211 dpi |
| `docs/gottschewski.md` | what Gottschewski's published work settles, and what it does not |
| `docs/leseregeln.md` | the dissertation's reading rules, and what the model owes them |
| `docs/experiments.md` | the ablation table and what it decides |
| `docs/findings.html` | the report, as artifact source; `docs/embed-figures.mjs` inlines its figures |
| `analysis/` | the Python that produced `docs/empirics.md` and its figures |
| `view/` | an overlay viewer: drawn line, emulated line, punched code, residual |
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
a constant rate — which is what `midi2exp` and `pianolatron` assume. `α` is fitted rather than
chosen, so the family contains the prior art as a special case; on roll 3309 it comes out at
1.02 in both halves independently.

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

**From the drawn line itself.** The Mezzoforte stop arrests the bellows at two levels a
thickness apart depending on which side it approached from, and its position is a regulated
setting rather than the printed gridline. The stop yields in the direction it is pushed, so
the rising rest is the higher of the two, which is the opposite of what an inelastic barrier
would give; both faces are set from the levels the line rests at rather than fitted. Every stop is compliant rather than rigid, so the bellows rebounds off it — visible
in the drawn line after a fast collapse. The offset between line and punches differs by code,
drifts along the roll, and varies with the line's own level, which is the pen swinging on an
arm; the same arc bends the printed scale, which `scaleWarp` carries.

`src/model/field.ts` is a control rather than a model: it bins the drawn line by valve state
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
generations. And the fit runs in two stages, the first holding the quantities `docs/empirics.md`
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
- What the drawn line physically records is not settled. It behaves like the bellows and not
  like an editor's smooth intention curve — it piles up sharply at one level whenever the
  Mezzoforte hook is set, and it overshoots after a sforzando — but that is an argument, not
  a demonstration.
