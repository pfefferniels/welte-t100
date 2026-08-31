# roll-nuance-tracer

Extracts the drawn *Handnuancierung* lines from the centre of a scanned Welte-Mignon
T-100 roll and writes them out as a curve per keyboard half, sampled once per pixel row
of the scan.

A few late red Welte rolls carry two hand-drawn lines down the middle of the paper,
under a printed header reading `Handnuancierung · Bass. · Discant · P.P. M.F. F.F. M.F. P.P.`
Gottschewski (2024) suggests they record the movement of the two Nuancierbälge directly.
This tool turns them into numbers. It was written for and validated on one roll only,
Welte 3309 (Backhaus, Schubert *Militärmarsch* in Es-Dur), Stanford copy
[`purl.stanford.edu/jq774vx6544`](https://purl.stanford.edu/jq774vx6544).

## Usage

```sh
./trace_roll.py jq774vx6544
```

Needs `numpy`, `Pillow` and Python 3.11+. Nothing else. The scan is pulled from
Stanford's IIIF endpoint one band at a time and cached under `cache/`; a full roll is
roughly 500 MB of PNG and takes some minutes on the first run, seconds afterwards.

Useful options: `--rows START STOP` to work on one stretch, `--format jpg` for a much
smaller cache, `--overlays N` for the number of QA renderings, `--step-penalty` to
change how readily the traced path moves sideways.

## What comes out

`out/{druid}/curves.csv` — one row per pixel row of the drawn span:

| column | meaning |
| --- | --- |
| `y_px` | pixel row in the scan |
| `tick` | MIDI tick of Stanford's raw MIDI for the same scan, i.e. `y_px − FIRST_HOLE` |
| `seconds` | elapsed time, from that file's tempo map (which carries the spool acceleration) |
| `bass_x`, `treble_x` | traced column in the scan, sub-pixel |
| `bass_value`, `treble_value` | position on the printed scale: 0 at the half's P.P. line, 0.5 at M.F., 1 at the shared F.F. line |
| `bass_flag`, `treble_flag` | how well the point is witnessed: `ink`, `faint`, `hole`, `rule`, `gap` |

`rules.csv` holds the gridline positions every 100 rows, `meta.json` the parameters and
coverage, `overlay/*.png` the traced paths blended over the original pixels.

The flags matter. `rule` means the drawn line coincides with a printed gridline and
cannot be told apart from it; `hole` means a punch has removed the paper under it;
`gap` means nothing was visible and the path was bridged. Those rows are interpolation,
not observation.

## How it works

1. **Locate the band.** Three full-resolution probes near the middle of the roll; the
   five gridlines are the evenly spaced quintuple among the persistently dark columns.
2. **Separate layers.** The paper is red, so ink is low in the red channel and punches
   are bright in green. Ink evidence is graded rather than thresholded, because the
   drawn lines fade and a hard cut loses them.
3. **Track the gridlines.** They drift across the roll as a group, so a single median
   offset per 500-row window is both enough and steadier than fitting each line alone.
4. **Trace.** A least-cost path per half, exact over all sideways moves via a two-pass
   L1 distance transform. Ink is cheap, paper dear, and gridlines cost exactly what
   paper costs — any discount at all accumulates over a column running the length of the
   roll, and the path then rides the printed line instead of the drawn one.
5. **Calibrate.** Piecewise linear through the P.P., M.F. and F.F. gridlines of each half.

## What it found on roll 3309

The band sits at x 1611–2680, gridlines at 1671.9 · 1907.6 · 2145.9 · 2380.8 · 2620.2,
spacing ≈ 237 px. All five drift together by 7.6 px over the length of the roll. The
drawn band runs from row 15130 to 213760, that is 198630 rows or 5:29 by the roll's own
tempo map; the last drawn row falls 653 px past Stanford's `LAST_HOLE`.

Coverage:

| | ink | faint | hole | rule | gap |
| --- | --- | --- | --- | --- | --- |
| bass | 92.6 % | 1.3 % | 1.7 % | 1.8 % | 2.6 % |
| treble | 92.1 % | 1.5 % | 1.3 % | 1.8 % | 3.3 % |

So 4–5 % of rows are interpolation rather than observation, and they are not spread
evenly: the four longest unwitnessed stretches are 562 rows just after the header, 490
rows at the very end of the roll, and then nothing above 140 rows. Both of the long ones
are places where the curves rest on a gridline and there is nothing to see.

The two curves correlate at 0.62, so they move together without being the same line.
Median rate of change is 0.33 (bass) and 0.37 (treble) scale units per second, with the
99th percentile at 12.6 and 15.0 — a sforzando crossing the whole scale in well under a
tenth of a second. Traced values stay inside the printed scale apart from 1.3 % of bass
and 0.1 % of treble rows, which fall a few pixels outside the P.P. line, almost all of
them in those same head and tail stretches.

Cache and cost: 568 MB of PNG for the whole roll, about half an hour on the first run.
The same two windows traced from JPEG tiles differ by a median of 0.5 px and a 95th
percentile of 2–4 px on rows where both see clear ink, which is 0.001 and 0.006–0.012 in
scale units. `--format jpg` costs about 1.5 MB per 8000 rows instead of 22 MB and is a
fair trade unless the exact column matters.

## Caveats

- The M.F. gridline sits at the geometric midpoint of the P.P.–F.F. span, so calling it
  0.5 is the roll's own claim, not an independent measurement. Whether Welte's M.F.
  really lies halfway between P.P. and F.F. in balg travel, or in loudness, is a separate
  question; `bass_x` and `treble_x` are kept in the output so any other reading of the
  scale can be derived.
- Where a curve rests on a gridline it cannot be told from it. The gridline columns are
  deliberately made to cost what blank paper costs, so the tracer neither rides them nor
  avoids them, and the rows are flagged `rule`. Their values are a bridge between the
  last and next sighting, not a reading.
- Nothing is clamped to the [0, 1] range; values are reported as measured.
- The last few hundred rows of the roll, past the last punched hole, carry almost no
  evidence at all and the traced path there means little. It is flagged `gap`.
- Gridline detection is written to be roll-agnostic but has only been tried on one roll.
- Nothing here is compared against the punched dynamic code yet.
