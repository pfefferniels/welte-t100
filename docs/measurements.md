# What roll 3309 shows

Measurements on the drawn expression lines of Welte-Mignon roll 3309 (Backhaus, Schubert
*Militärmarsch*, SUPRA `jq774vx6544`), made without a model, that the emulator's defaults and
modelling choices rest on. Numbers are given bass / treble. Levels are on the roll's printed scale,
0 at the P.P. gridline of the half and 1 at the shared F.F. line, unless said to be fractions of the
travel between the two rails. Rates are in scale units per second. Every figure is reproducible
from `analysis/`: `measure.py` writes `data/measurements.json`, `constants.py` prints the derived
constants, `figures.py` draws `docs/figures/`. What the sources say is in `sources.md`, and what
each modelling choice costs in `experiments.md`.

**Method.** `out/jq774vx6544/curves.csv` gives the traced line per scan row with a time column from
the SUPRA tempo map (the spool law the emulator runs on differs from it by at most 1.6 % locally,
§12). Rows flagged `hole`, `rule` or `gap` are interpolation and are dropped (6.1 % / 6.5 %). Every
count below is of `ink` or `faint` rows. Rates are central differences over 6 rows (≈ 10 ms) in
fast states and 60 rows (≈ 100 ms) in slow ones. Latch states are reconstructed from the leading
edges of the perforations and shifted by the measured lead where they are compared with the line.

## 1. The punching

| code | punches | median length (ms) | p10–p90 (ms) |
| --- | ---: | ---: | ---: |
| sforzando on | 587 / 443 | 66 / 111 | 36–108 / 53–239 |
| sforzando off | 225 / 273 | 83 / 83 | 54–114 / 53–114 |
| crescendo on | 168 / 161 | 119 / 110 | 89–155 / 86–137 |
| crescendo off | 153 / 150 | 117 / 108 | 92–157 / 82–140 |
| mezzoforte on / off | 11 / 11 each | 115–119 / 110–116 | |
| Widerstand on / off | 12 / 10 (bass) | 169 / 173 | |
| sustain on / off | 267 / 266 (treble) | 98 / 94 | |
| hammer rail on / off | 2 / 1 (bass) | 118 / 124 | |

Nothing is held. The longest expression perforation outside the rewind hole is 571 ms, and a level
held for hundreds of milliseconds after a 60 ms punch is only consistent with a latch, so the
crescendo and mezzoforte functions latch as the sources say. Bass sforzando-on perforations are
punched in chains: 587 punches form 361 slots when gaps of 29 ticks or less (SUPRA's own bridge
factor) are joined, and 107 slots have more than one punch. The treble punches are not chained but
longer. Sforzando-on outnumbers sforzando-off 1.6 : 1, and 63 % / 39 % of the on-punches arrive
while a latch, if there were one, would already be set. Repeated on-punches must be no-ops for a
latch, and are work for a per-pulse valve.

## 2. Rails and the Mezzoforte stop

**Rails**, read as the modes of the positions at which the line rests (`figures/rails.png`):

| | bass | treble |
| --- | ---: | ---: |
| P rail | 0.017 | 0.022 |
| F rail | 0.912 | 0.952 |
| rows within 0.02 of the F rail | 14.1 % | 17.2 % |
| rows within 0.02 of the P rail | 1.4 % | 6.3 % |
| line at rest (rate under 0.08) | 33.1 % | 34.2 % |

The P rail sits on the printed P.P. gridline within 0.02. The F rail falls 0.088 / 0.048 short of
the shared F.F. line. Excursions beyond the rails (minimum −0.033, maximum 1.031) are tracing.

**The stop**, from the level the line lands on when it arrives descending
(`figures/mezzoforte-level.png`):

| | bass | treble |
| --- | ---: | ---: |
| face, printed scale (95 % CI over visits) | 0.5755 (0.5746–0.5766) | 0.6171 (0.6158–0.6184) |
| above the printed M.F. gridline | +0.076 | +0.117 |
| face as a fraction of the P-to-F travel, referred to the F rail of the same hold | 0.627, sd 0.002 | 0.645, sd 0.003 |
| within one hold, sd | 0.002–0.004 | 0.002–0.004 |
| hook engaged | 45.5 % of the roll, 11 holds of median 10.0 s | 45.5 %, 11 holds of median 10.6 s |

The between-hold drift of the face (0.019 / 0.026 in the medians) moves in lockstep with the
F rail of the same hold (r = +0.90 / +0.97), so it is the whole traced line drifting against the
printed gridlines, and referred to the F rail the face is steady to 0.0015 / 0.0013. The stop is a
calibration point that disagrees with the printed scale. It is not a tracer artefact. Across
180 676 hook-engaged rows there are two `rule` rows. In raw scan columns the face is a single mode
37 / 57 px from the M.F. gridline with no row within ±6 px of it. And the readable band from 0.513
to 0.55 holds no rows while the hook is set and 4 503 / 5 402 rows while it is released.

**Every engagement is from above.** All twenty-two Mezzoforte-on punches fire while the line
stands at the F rail (0.904–0.918 / 0.924–0.954). So the roll never shows the pin blocking an
upward movement, never shows a crossing of the face in either direction with the hook set (zero
witnessed crossings in 90 350 / 90 326 rows, on a test with no power), and the +0.076 / +0.117
offsets are upper bounds on how far the hook is regulated above the printed midpoint, not
estimates of it. Whether the pin is one-sided or two-sided is decided by the sources, not here.

**Two arrest levels.** A strict test (direction over the last 100 ms, threshold 0.010) finds no
second level. A looser test (250 ms, 0.020), with the 53 / 37 settled stretches that rest at the F
rail set aside, finds rests arriving from below at 0.6398 (n = 13) / 0.6694 (n = 7) against rests
arriving from above at 0.5813 (n = 70) / 0.6270 (n = 80), separations of 0.059 / 0.042, with the
treble groups not overlapping. Under both criteria every rising rest lies *above* the falling one,
which is the opposite of what a rigid pin of finite thickness gives and what a stop that yields in
the direction it is pushed would give. Fixing both faces from these levels leaves the fit at
0.0406 / 0.0557, exactly where it was. What it buys is determinacy, the extent being 0.050 / 0.041
where a free parameter had run to its bound at 0.229. The samples from below are small.

**The hook rings, the rails do not** (`figures/stop-arrivals.png`). Arrivals at the hook faster
than 5 units/s (72 / 76, at 6–24 units/s) overshoot by +0.003 / +0.005 and swing back past the
resting level by −0.024 / −0.012 at 14–20 ms, one cycle of a heavily damped bounce of period ≈ 32 ms
in both halves, settled by 50 ms. The overshoot grows with arrival speed in the bass (slope
+0.00055 per unit/s, CI +0.0001 to +0.001). Arrivals at the F rail (34 / 28) creep up 0.004 / 0.007
and decay without crossing the resting level. But no arrival at either rail exceeds 10 units/s,
because the fast crescendo rolls off over the last sixth of its travel, so whether the rails are
compliant cannot be tested here. A hook-like compliance at rail speeds would overshoot by about
0.001, half a traced pixel. The bounce survives re-tracing at a fiftieth of the step penalty to
0.002.

**How the hook is used.** Of hook-engaged rows 37 % / 43 % are within 0.02 of the face and
21 % / 24 % within 0.02 of the F rail. The line is free above the stop, and a sforzando carries it
to the rail and back several times a second.

## 3. The slow states

Rate against position, binned, in the phase plane, where a constant rate is a horizontal line, an
exponential a straight line through zero at v∞, and orifice flow a concave curve
(`figures/phase-plane-slow.png`). Weighted rms of the bin medians against each law:

| state | rows | constant | exponential | orifice | τ (ms) | v∞ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| slow crescendo, bass | 7 249 | 0.129 | 0.031 | 0.023 | 1 168 | 0.766 |
| slow crescendo, treble | 3 439 | 0.063 | 0.040 | 0.036 | 2 601 | 1.154 |
| slow decrescendo, bass | 2 030 | 0.120 | 0.019 | 0.064 | 592 | 0.041 |
| slow decrescendo, treble | 963 | 0.137 | 0.012 | 0.061 | 661 | 0.035 |

The constant rate is rejected in all four cases by a factor of four to eleven. The decrescendo is
clearly exponential. For the crescendo the two curved laws are within a factor of 1.3 and the
asymptote is an extrapolation, since a slow crescendo on this roll rarely gets above 0.62. The
implied crossings: 0.1 → 0.5 in 1 072 / 1 242 ms, 0.5 → 0.1 in 1 211 / 1 299 ms. The decrescendo's
floor lies within 0.02 of the P rail. Whenever nothing is latched and the hook is not holding, the
line falls, never rises and is never still, at a rate about eight times higher at 0.5 than at 0.1.
The slow decay is always running, as midi2exp assumes, with a shape midi2exp does not have. The
decrescendo rests on about 1 % / 0.5 % of the roll, which is what survives excluding the rails,
the hook and the first 250 ms after any state change.

## 4. The fast states

No single law fits a fast excursion because its rate is not monotone in position. It climbs from
about 2 units/s to full over the first ≈ 50 / 110 ms, holds, and rolls off near the F rail
(`figures/fast-valve-opening.png`). That first stretch is the valve opening. The fast decrescendo's
shape is not resolvable, since the median fall lasts 33 ms and is still accelerating at 45 ms.
Plateau rates (median over the middle half of an episode) and peaks (fastest 10 ms), by what else
is latched (`figures/fast-rates-by-state.png`):

| valve | other state | episodes | peak | plateau | stop-to-stop span at plateau |
| --- | --- | ---: | ---: | ---: | ---: |
| fast crescendo | crescendo off | 9 / 15 | +3.46 / +3.37 | +2.68 / +2.22 | 334 / 420 ms |
| fast crescendo | crescendo on | 51 / 66 | +5.65 / +5.16 | +4.24 / +3.62 | 211 / 257 ms |
| fast decrescendo | crescendo on | 66 / 81 | −22.2 / −22.3 | −16.4 / −15.0 | 55 / 62 ms |
| fast decrescendo | crescendo off | 1 / 5 | – / −21.0 | – / −15.5 | – / 60 ms |

Against midi2exp: the fast crescendo (300 ms) is of the right order, the fast decrescendo (400 ms)
is six to seven times too slow, and the slow decay differs in shape. Against Schmitz's Bild 4
(0.2 s and 0.15 s), the rise agrees and the fall is faster.

**The fall is four times the rise.** Plateau to plateau 3.86 / 4.13, peak to peak 3.92 / 4.32, on
51 and 81 clean episodes each way. Welte's control 6c needs the two per-pulse increments equal and
opposite, so the machine that drew this line did not satisfy 6c. A model that needs the cancelling
valve about four times the stronger is matching an asymmetry that is in the line.

**The crescendo latch speeds the sforzando up**, by +1.15 / +1.08 units/s between the two groups
above, with non-overlapping interquartile ranges and the episodes spread over the whole roll. If
conduit 39 is permanently joined to the bellows and admits air whenever the crescendo is cancelled,
the additive prediction is the slow crescendo rate plus the slow decrescendo rate at the same
position, +0.75 / +0.65 band by band, which accounts for 65 % / 60 % of the gap. The observed gap
also grows with position faster than the prediction (+0.79 to +1.41 across the bass bands against
+0.70 to +0.82). Something beyond the two slow conductances contributes, and the emulator's
`throughFlowLoad` is the term proposed for it (§11). Nine and fifteen crescendo-off episodes are a
thin basis.

## 5. The lead of the line over the punches

The line moves before the punch that commands it (`figures/lead.png`). From the offset between
each sharp collapse and its sforzando-off punch: 108.6 ms (CI 106.3–110.0, n = 227) / 75.7 ms
(72.9–79.3, n = 274), that is 65 / 46 scan rows. An independent scan over candidate offsets that
maximises the latch-on against latch-off rate difference peaks at 122 / 102 ms (sforzando) and
109 / 95 ms (crescendo), the same sign. As paper distance the offset is more nearly constant along
the roll than as time: over the thirds of the roll 67, 65, 64 px against 114, 110, 103 ms in the
bass and 53, 47, 44 px against 91, 78, 70 ms in the treble, so the treble drifts in either unit.

**The two row systems share an origin.** Where a punch has removed the paper under the drawn
line, `curves.csv` flags `hole`. 281 of 282 / 255 of 255 such runs are matched to a perforation on
the column the line was crossing, and the run sits inside the punch with equal insets at both ends
(midpoint offset 0.0 rows, CI −1.0 to +0.5 / −0.5 rows, −3.0 to +0.5). A constant offset between
the systems would move both ends the same way. So the lead is not a registration artefact
(`figures/row-origin.png`).

**The offset differs by code.** With a half-maximum onset, which does not depend on how sharp the
feature is:

| control | n | median offset (ms) | 95 % CI | IQR |
| --- | ---: | ---: | --- | ---: |
| sforzando off | 224 / 270 | 97.4 / 63.4 | 96.1–99.1 / 62.3–65.5 | 12.9 / 21.8 |
| sforzando on | 450 / 372 | 103.2 / 74.1 | 100.7–105.8 / 70.7–76.4 | 122 / 39.5 |
| crescendo off | 145 / 136 | 70.1 / 44.0 | 64.3–75.9 / 38.6–55.4 | 60 / 97 |
| crescendo on | 131 / 119 | 51.4 / 19.6 | 47.4–53.5 / 9.9–26.5 | 90 / 125 |

The sforzando-on code sits 5.8 / 10.7 ms later than the sforzando-off code with disjoint intervals.
The crescendo figures are biased low by the gentleness of the feature (peak rates fifteen to thirty
times smaller) and show only that a difference exists. The Mezzoforte codes have no feature of
their own, since 41 of the 44 M.F. punches are followed within 250 ms by a sforzando-off or
crescendo-off, whose collapse is what a locator finds. The differences are not a skew of the sheet,
since regressing offset on lateral separation gives slopes of opposite sign in the two halves.

**What the scatter is made of.** Within the sforzando-off collapses the robust sd is 9.35 / 14.12
ms. It correlates with position along the roll (−0.27 / −0.39), with the level at the event
(+0.18 / +0.44, the pen swinging on an arm) and with the speed of the collapse (−0.15 / −0.27), and
after removing the three the residual is 4.57 / 5.02 ms. Multiplied by the local slope of the line,
the timing scatter alone costs a perfect model 0.022 / 0.036 with one offset per half and
0.011 / 0.013 with those systematics modelled, 80 % of it on the 2 % of rows moving faster than
8 units/s. One offset for all codes adds about 0.021 / 0.023 on the gentle rows. The emulator's
`leadRows`, its per-code variants, `leadPerLevelRows` and `leadDriftRows` are these terms.

## 6. The sforzando and the crescendo are not coupled in the punching

Co-occurrence of the two on-codes and the two off-codes within ±40 rows, against 2 000 circular
shifts of the sforzando series:

| pair | observed | chance (95 %) |
| --- | ---: | --- |
| sforzando on / crescendo on | 3.4 % / 4.1 % | 6.8 (4.6–9.4) / 6.6 (4.5–8.8) % |
| sforzando off / crescendo off | 8.0 % / 6.2 % | 6.2 (3.6–9.3) / 6.1 (3.7–9.2) % |

Every excess is inside the chance interval and the offset distributions have no peak at zero
(`figures/sforzando-crescendo-coupling.png`). The on-codes, if anything, avoid one another. If the
relay coupled them, the emulator would have to supply it, and the two fast-crescendo rates of §4
are what an uncoupled relay predicts.

## 7. Does the sforzando latch?

Under a set-and-cancel reading the sforzando latch would be engaged for 60.7 % / 59.8 % of the
roll, in 216 / 272 intervals of median 463 / 291 ms, and the crescendo is engaged for another
63.0 % / 56.1 %. A window with the sforzando set, the crescendo not, the line clear of both stops
and no further punch is therefore almost unobtainable: two in the bass and one in the treble. The
episode evidence that remains points against a latch. In the six bass windows with the crescendo
off the line falls at −0.62 units/s (CI −0.94 to −0.05) against a momentary prediction of −0.98
and a hold of about 0. The 23 treble windows that appeared to rise (+0.90) accelerate from +0.08 in
their first half to +1.06 in their second, which is the next excursion arriving inside a window cut
against a lead that scatters by 132 ms. Over 100 / 105 clean rises the median travel after the port
has closed is 3.2 % / 1.3 % and none finishes more than 200 ms after it. A latch would pin the
bellows at the F rail for about 60 % of the roll where the line is within 0.02 of it 14 % / 17 % of
the time. Whole-roll fitting, which is the better-powered instrument for a question of this shape,
prices the latched reading at 0.151 / 0.192 against 0.031 / 0.051 (`experiments.md`). An earlier
conclusion in favour of latching, drawn from windows that mostly had the crescendo set, is
withdrawn.

## 8. The depth of a subito piano is set by the stop it runs into

Of 213 / 250 collapses located from the line alone, 69 % / 61 % end at the Mezzoforte face,
19 % / 28 % at the P rail and 13 % / 11 % at neither, with the bottom repeatable to sd ≈ 0.006. The
depth correlates with the length of the cancelling punch at r = −0.24 / −0.16, the wrong sign for
Welte's controls 4c and 4d, because long cancels fall where the hook is set. With the hook state
held the partial correlation is +0.006 / +0.133. In the 25 / 28 stop-free falls the interval to
the next sforzando-on matters in the treble (r = +0.63, CI just including zero) and not in the bass.
So this roll cannot test whether a short cancel returns the bellows only part of the way. Nine
falls in ten are stopped first.

## 9. What the line records

**Note-locked structure** (`figures/note-locked.png`). Attacks (onsets within 30 ms merged, 2 964
attacks of median size 3) are followed by a dip of −2.0 / −2.6 px at +28 to +54 ms, four times the
sd of twelve circularly shifted controls, and of −7.1 / −11.3 px after chords of five notes or
more. It is not the tracer, being as large for notes whose columns lie away from the traced band
and surviving a 60-row margin around unwitnessed rows. It is commanded motion. Excluding ±200 ms of
any expression event leaves −0.09 / −0.23 px, and on the rows where the line is pinned at the hook
for the whole ±250 ms window, so that the bellows demonstrably cannot move, the average is
−0.16 / −0.13 px, smaller than the controls, with a 95 % bound of 0.40 / 0.49 px (0.0008 / 0.0010)
on 71 / 86 attacks. The Regelbalg acts on the cone valve and not on the bellows, so a trace of
delivered vacuum would have to carry note-locked wiggles there and this one does not: **the line
records the position of the Nuancierbalg.** The bound is on what reached the paper, since the pen
linkage's own inertia is unknown.

**Note density.** The line's level at the hook correlates with note density at r = −0.11 / −0.14
(slope −1.4 × 10⁻⁴ per note/s, about 0.003 between median and 95th-percentile density), robust to
excluding the neighbourhood of every punch. The differential test for a sagging supply, which
should slow the closing states and leave the opening states alone, fails. The fast crescendo, the
best-supported state (209 / 259 episodes), has a slope indistinguishable from zero in both halves,
while the sforzando release carries the only clear slopes and they point in opposite directions
(+0.029 / −0.020 per note/s). A shared blower cannot slow one half and speed the other. The
residual correlation is more plausibly musical, the hand at the lever working differently where the
music is denser, and the emulator's `supplyDroop` and `regulatorGain` are pinned at zero.

## 10. How good the trace is

The tracer's step penalty is linear in lateral distance, so it cannot flatten a monotone edge, and
the distribution of row-to-row steps has no ceiling (99.9th percentile 26 / 25 px, maximum
70 / 78 px). Re-tracing three windows of 2 500 rows at a fifth of the penalty leaves the steepest
edges unchanged to 2.5 units/s. Below a penalty of 0.01 the path starts jumping to punched holes,
and every such departure is on a `hole` row. On witnessed rows moving faster than 8 units/s the
run-to-run disagreement is 0.0003 typically and about 0.03 at the 99th percentile, independent of
the penalty. Per-row noise from second differences is 0.001 at rest and 0.009 in the fastest rows.
The trace is not what limits the model. Crops of the steepest edges with two traces overlaid are in
`figures/steep/`.

## 11. Where the model's error sits

Two thirds of the fitted model's squared error lies within 250 ms of a code tripping. On an
independent fit scoring 0.0368 / 0.0478 held out, rows with the hook set score 0.0299 / 0.0295, the
same in both halves, which is the best check this roll offers that the stop with its faces set from
measurement is one mechanism described once. The rails are the worst-modelled state. Regressing
the residual on velocity, acceleration, level, distance below the F rail, note density and time
since the last trip explains 1.1 % / 1.6 % of its variance, so no simple missing term is waiting.

Four windows a half, 1.2 % / 1.8 % of the rows, carry 26 % / 36 % of the squared error, and two
cancels dominate them. At 273.54 s (bass) and 144.98 s (treble) an ordinary perforation, open for
80 ms like the population median, produced a fall of 0.34 at 7.2 units/s where six treble cancels
alike in everything the code records fell 0.92–0.93 at 21–23 units/s. Nothing in the punched code
distinguishes them and the trace is not the cause. If they are irreducible, a model perfect
elsewhere would still score 0.020 / 0.031. Letting them into the objective distorts the treble fit
by 0.0028 elsewhere. A loss that charges residuals past 0.06 linearly gains 0.0042 in the treble and
costs 0.0006 in the bass, and is the less question-begging way to get the same effect as excluding
them by name.

The line falls faster than the model can. The model's fastest falls are capped at 16.7 units/s by
`inertiaMs`, the line's reach 32.9 / 30.2 with no ceiling, and the real cancel is a briefer and more
violent dump than the model's. Removing the inertia lifts the cap and costs 0.22 overall. Between
alike sforzando-on events (same starting level, states and punch length) the line's own spread is
0.010–0.031 in the first 150 ms against the model's error of 0.027–0.056, so below roughly 0.02 on
those rows the roll cannot distinguish one model from another.

Of the terms proposed for the transits and refitted against a common baseline and budget, a
narrowed sforzando valve band (0.0338 / 0.0428) and a through-flow load on the blower
(0.0339 / 0.0450) add to one another (0.0312 / 0.0401 together) and are kept. A dead band in the
drive buys the same as either alone and nothing once the pair is there, a grip at the closed rail
nothing, and a band of its own for the cancelling valve helps the treble and hurts the bass. With
the crescendo off the model over-drives a sforzando by about a quarter of its excursion at 150 ms.
With the crescendo on it is close to right.

## 12. The time axis

Whole-roll error of the fitted constants under each axis, the constants having been fitted on the
scan map:

| axis | duration | bass | treble |
| --- | ---: | ---: | ---: |
| SUPRA tempo map, 0.22 % per foot | 328.8 s | 0.03182 | 0.04336 |
| spool law, 100 % effect, held to that duration | 328.8 s | 0.03189 | 0.04339 |
| spool law, 80 % | 328.8 s | 0.03180 | 0.04336 |
| spool law, 0 % (constant speed) | 328.8 s | 0.03191 | 0.04363 |

Everything from full spool acceleration to none lies within 0.0003 on a fit whose refit-to-refit
noise is 0.0028, and the order is not stable. The line cannot decide the acceleration, and the
choice rests on provenance (`sources.md` §1). Over the 16.63 m of music the SUPRA map gives 325.4 s
and Gottschewski's law 323.1 s (100 %) or 327.3 s (80 %).

## 13. The pedals

Roll 3309 alternates 93, 94, 93, 94 over its 533 damper punches with one same-line adjacency, so
the pedal is a set/cancel pair. The shortest release-and-retake is 212 ms from the off-punch to the
next on-punch, the fifth percentile of the 267 lifts 248 ms, the median lift 331 ms and the median
press 693 ms. An editor does not punch a lift the instrument cannot make, so a full fall much beyond
200 ms is hard to defend. That and Welte's controls 9b and 9c are the only bounds, since no drawn
line records the pedals and nothing in `src/model/pedal.ts` is fitted. Sweeping the total travel:

| travel (ms) | presses cut short | lifts cut short | dampers left up to |
| ---: | ---: | ---: | ---: |
| 140 | 1 | 0 | 0.000 |
| 180 (default) | 14 | 0 | 0.000 |
| 220 | 32 | 12 | 0.044 |
| 300 | 49 | 141 | 0.170 |

So Hagmann's conjecture of half-pedalling by superimposition is possible on this roll and not
demonstrated by it. On a second roll, WR0225_02 (Schumann, *Träumerei*), the pedal changes about
once every 1.5 s against every third of a second here, one lift of 60 ms is probably a detector
artefact, and the dampers are in transit for 7.1 % of the roll against 21.6 %. That roll punches at
23.7 px against 3309's 20.86, which is why the punch diameter is a property of the scan and not of
the emulator (`src/roll/aperture.ts`).

## Limitations

- One roll, one performance, one instrument. Nothing here shows the constants transfer.
- Bass and treble disagree on the F rail (0.912 / 0.952), the hook face (0.576 / 0.617), the lead
  (109 / 76 ms) and the fast-crescendo plateau (4.24 / 3.62). The shared central F.F. gridline can
  move the two scales in opposite directions, and how much is calibration has not been separated.
- The slow decrescendo rests on about 1 % of the roll and the crescendo-off fast crescendo on 9 and
  15 episodes. The slow-state note-density slopes rest on 35 to 44 distinct seconds.
- Only the falling face of the pin is visited, so its extent and the position of its centre against
  the printed gridline are not measured, and whether it blocks upward is undecidable here.
- The rising rests that order the two faces are 13 and 7.
- The crescendo offsets in §5 show that a difference exists without measuring it reliably.
- The steep-edge check re-traced three windows, not the whole roll.
- The depth of a subito piano is masked by the stops in nine cases in ten.
