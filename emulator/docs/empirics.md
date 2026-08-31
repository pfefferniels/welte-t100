# What the drawn Nuancierung line does when the punched code changes

Measured on Welte-Mignon roll 3309 (Backhaus, Schubert *Militärmarsch* in Es-Dur,
Stanford `jq774vx6544`), comparing `out/jq774vx6544/curves.csv` against the expression
tracks of the SUPRA raw MIDI for the same scan. Bass and Discant are measured separately
throughout. Everything below is reproducible from `emulator/analysis/`: `measure.py`
writes `emulator/data/measurements.json`, `constants.py` prints the derived constants,
`figures.py` draws `emulator/docs/figures/`.

## What this means for the model

1. **The line runs ahead of the punches.** The Bass line reaches a feature 109 ms before
   the punch that names it (95 % CI 106–110 ms, n = 227), the Discant line 76 ms
   (73–79 ms, n = 274). Two independent estimates agree. The two row systems have been
   checked against each other where a punch crosses the drawn line and share an origin to
   within one scan row, so the offset is not a registration artefact (§7). An emulator
   driven by the punches will therefore reproduce the drawn shape only if it is allowed
   to act early, or if the comparison shifts one of the two series. The offset is closer
   to constant as a distance on the paper (65 px Bass, 46 px Discant) than as a duration,
   which points at the geometry of how the roll was laid out rather than at a reaction
   time.
2. **The default state is a decrescendo, and its rate falls off with the level.** With
   nothing latched, `dv/dt = (v∞ − v)/τ` with τ = 592 ms and v∞ = 0.041 (Bass), τ = 661 ms
   and v∞ = 0.035 (Discant). A constant rate is rejected: weighted rms 0.019 against 0.120
   for the constant fit. midi2exp's constant-rate slow decay has the wrong shape.
3. **The Mezzoforte hook is a hard stop, and the level the line lands on is not the printed
   M.F. line.** It holds at 0.576 (Bass) and 0.617 (Discant) on the roll's printed scale,
   that is 0.62–0.64 of the way from the P stop to the F stop, and 0.08–0.12 above the
   printed M.F. gridline. Referred to the fortissimo stop of the same hold, which removes a
   common-mode drift of the whole traced line, the level is steady to a standard deviation of
   0.0013–0.0015, or 0.627 and 0.645 of the P-to-F travel (sd 0.002–0.003). With the hook engaged the line never goes below it and moves above
   it freely. The obvious way for this to be a tracer artefact, the band around a printed
   gridline that cannot be read, has been tested for and ruled out: measured in raw scan
   columns the stop is a single clean mode 37 px (Bass) and 57 px (Discant) from the
   gridline, and not one hook-engaged row falls within 6 px of it (§6).
   Two things the roll cannot settle, and both matter for how the number is used. All
   twenty-two Mezzoforte-on punches fire while the line is at the fortissimo stop, so every
   arrival at the stop is from above. That means the roll never shows whether the pin blocks
   the upward direction as well, and it never shows a lower face of the pin if there is one.
   **The 0.08–0.12 offsets are therefore upper bounds on how far the hook is regulated above
   the printed midpoint, not estimates of it** (§6).
4. **The stops are not the printed P.P. and F.F. lines either.** The line rests at 0.017
   and 0.912 (Bass), 0.022 and 0.952 (Discant). Fortissimo falls short of the printed
   F.F. gridline by 0.09 and 0.05 respectively.
5. **The crescendo latch changes the fast crescendo.** With the sforzando latched on, the
   line rises at a peak 5.65 units/s when the crescendo latch is also on, and 3.46 when it
   is off. For the Discant the figures are 5.16 and 3.37. The two ports cannot be modelled
   as alternatives. Taking the crescendo conduit to be permanently joined to the bellows,
   so that cancelling the crescendo turns it into a leak working against the sforzando,
   predicts a gap of the slow crescendo rate plus the slow decrescendo rate at the same
   position. That accounts for 65 % of the observed gap in the Bass and 60 % in the
   Discant (§4), which makes the result much less surprising without closing it.
6. **The fast decrescendo is far faster than midi2exp assumes, and far faster than the fast
   crescendo.** It crosses the full stop-to-stop span in about 55 ms (Bass) and 62 ms
   (Discant) at its sustained rate, against midi2exp's 400 ms. The fast crescendo, at 211 and
   257 ms with the crescendo latch on, is closer to midi2exp's 300 ms. The two are therefore
   **not balanced: the fall is 3.9 to 4.3 times the rise**, sustained rate or peak rate, which
   contradicts Welte's control 6c and is measured without reference to any model (§4, §11b).
7. **All six functions latch.** Every perforation is short (median 66–119 ms) and the
   opposing hole is what ends the state. The sforzando-on hole is re-triggered freely
   while the latch is already on, so an emulator must treat a repeated on-punch as a
   no-op rather than as a new event.
8. **The line records the bellows, not the delivered vacuum.** Aligned on individual note
   attacks the line dips by 2.0 and 2.6 scan pixels, and by 7 to 11 on chords of five notes or
   more. It is all commanded motion: excluding the neighbourhood of expression events removes
   it, and on the rows where the line is provably pinned against the M.F. stop, so the bellows
   cannot move, there is nothing above the shifted controls, with a bound of 0.4 and 0.5 px
   (0.0008 and 0.0010 scale units). A trace of delivered vacuum would have to show a dip there
   and does not (§8b).
9. **Note density leaves a small trace in the line, and it is not the blower.** The line's
   position while resting on the M.F. stop correlates weakly and negatively with note density
   in both halves, r = −0.11 and −0.14, robust to excluding the neighbourhood of every punched
   hole. But the sharper test fails: if a shared supply sagged under load it would slow the
   bellows closing and leave the opening alone, and neither happens. The best-supported
   closing state, the fast crescendo, shows a slope indistinguishable from zero in both
   halves, while the opening states carry the only clearly non-zero slopes and point in
   **opposite directions in the two halves**, which no shared blower can do (§8). The residual
   correlation is more likely musical than pneumatic, the hand nuancer working the lever
   differently where the music is denser. A model can ignore it.
10. **The roll does not couple the sforzando to the crescendo, and cannot say whether the
   sforzando latches.** Sforzando and crescendo punches co-occur no more often than chance,
   and the on-pair slightly less often, so if Hagmann's relay sets the crescendo whenever the
   sforzando is set, the model must supply that coupling itself (§10). On the latching
   question this section once concluded that it latches. That is withdrawn: the windows it
   rested on mostly had the crescendo latched as well, and the one group that did not shows
   the Bass line **falling** at −0.62 units/s, near the momentary prediction. A clean window
   is very nearly unobtainable on this roll. What the punching does say is that **63 % of
   Bass sforzando-on perforations arrive while the latch would already be set** (39 % in the
   Discant), which would make several hundred holes pointless under a latching reading
   (§11).

## How the two series were compared

`curves.csv` gives one row per pixel row of the scan, with `y_px = tick + 16482` and a
`seconds` column taken from the roll's own tempo map, so the punches and the line share a
time axis without further work. Rows flagged `hole`, `rule` or `gap` are interpolation and
are masked to NaN before anything is computed, and dropped rather than filled. That
removes 6.1 % of Bass rows and 6.5 % of Discant rows. Every count of samples given below
is a count of `ink` or `faint` rows.

Rates of change come from a central difference over a fixed number of scan rows: 6 rows
(≈ 10 ms) where the motion is fast, 60 rows (≈ 100 ms) for the slow states, where the
value resolution of the trace would otherwise quantise the slope too coarsely to read.

Latch state is reconstructed from the leading edge of each perforation. Where the state
has to be aligned with the line, it is shifted by the measured lead of the half.

## 1. What is punched

| half | code | punches | slots after joining bridges | chained | median length (ticks) | median (ms) | p10–p90 (ms) | max (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bass | sforz_on | 587 | 361 | 107 | 39 | 65.8 | 35.6–107.9 | 156.2 |
| bass | sforz_off | 225 | 219 | 6 | 50 | 83.0 | 53.5–113.6 | 141.8 |
| bass | cresc_on | 168 | 168 | 0 | 72 | 118.7 | 88.7–155.3 | 231.0 |
| bass | cresc_off | 153 | 153 | 0 | 71 | 117.2 | 92.2–156.8 | 214.1 |
| bass | mf_on | 11 | 11 | 0 | 68 | 114.9 | 107.6–156.5 | 193.0 |
| bass | mf_off | 11 | 11 | 0 | 74 | 118.9 | 106.4–134.3 | 137.4 |
| bass | soft_pedal_on / off | 2 / 1 | | | 70 / 74 | 118.1 / 123.7 | | |
| bass | motor_on / off | 12 / 10 | | | 102 / 101 | 168.6 / 172.7 | | 275.4 |
| treble | sforz_on | 443 | 443 | 0 | 67 | 111.4 | 52.5–239.0 | 571.2 |
| treble | sforz_off | 273 | 273 | 0 | 50 | 83.0 | 53.1–114.1 | 170.4 |
| treble | cresc_on | 161 | 161 | 0 | 67 | 109.8 | 85.6–136.9 | 170.5 |
| treble | cresc_off | 150 | 150 | 0 | 66 | 107.7 | 81.9–140.3 | 213.5 |
| treble | mf_on | 11 | 11 | 0 | 69 | 115.9 | 85.1–138.8 | 156.2 |
| treble | mf_off | 11 | 11 | 0 | 68 | 110.0 | 88.1–133.0 | 142.6 |
| treble | sustain_on / off | 267 / 266 | | | 60 / 56 | 98.2 / 94.3 | | 208.7 |
| treble | rewind | 1 | 1 | 0 | 586 | 915.0 | | |

Nothing here is a long held slot. The longest expression perforation on the roll outside
the rewind hole is 571 ms, and the median for every code is between 66 and 119 ms. The
sforzando and crescendo functions therefore work as latches, and the drawn line confirms
it: a level held for several hundred milliseconds after a 60 ms punch is only consistent
with a latch.

Chaining is a Bass sforzando-on habit. 587 perforations become 361 slots when
perforations separated by 29 ticks or less are joined (that threshold is SUPRA's own
bridge factor of 1.37 times the roll's 20.9 px average hole width), and 107 of those slots
are made of more than one punch. The Discant sforzando-on holes are not bridged but are
simply longer, with a p90 of 239 ms against 108 ms in the Bass. Either way, sforzando-on
outnumbers sforzando-off roughly 1.6 to 1, so the latch is often re-triggered while
already set.

## 2. Event-triggered averages

`figures/event-triggered-bass.png`, `figures/event-triggered-treble.png`.

Each panel averages the line over occurrences of one code, aligned on the leading edge of
the punch, baseline-subtracted over −150 to −120 ms, and censored at each trace's own next
expression event, so the sample size falls with the lag. The grey trace in each panel is
that sample size, and the plotted mean stops where fewer than five events contribute.
Only genuine state changes are counted, since a sforzando-on that merely re-triggers a
latch that is already set finds the line already against the F stop and would drag the
average the wrong way.

Sample sizes, after requiring both a genuine transition and a clear 150 ms before the
punch (0 ms for the Mezzoforte codes, of which there are only eleven each):

| code | bass n | treble n |
| --- | ---: | ---: |
| sforz_on | 160 | 221 |
| sforz_off | 110 | 204 |
| cresc_on | 33 | 23 |
| cresc_off | 28 | 16 |
| mf_on | 11 | 11 |
| mf_off | 11 | 11 |

Read at the punch, the sforzando responses are already largely complete, which is the lead
showing up: the Bass line has risen 0.30 of the 0.32 it will reach by the time the
sforzando-on hole arrives, and has fallen 0.48 by the time the sforzando-off hole arrives.
The crescendo responses are slow and monotone, reaching about 0.15 (Bass) and 0.07
(Discant) by 400 ms.

The two Mezzoforte panels are not interpretable on their own. 41 of the 44 M.F. punches
have a sforzando-off or a crescendo-off within 250 ms after them, and it is that punch,
shifted by the lead, which produces the fall visible just after lag zero. The hook's own
effect is not separable on this roll. It is visible only as the stop level in section 6.

## 3. Shape of the response

The discriminating test is drawn in the phase plane, rate of travel against position,
where each candidate law has a signature that needs no time alignment:

| law | signature in the phase plane |
| --- | --- |
| constant rate (what midi2exp assumes) | a horizontal line |
| exponential toward v∞ | a straight line through zero at v∞, gradient −1/τ |
| orifice flow, `dv/dt = C·√(v∞ − v)` | a concave curve meeting zero at v∞ |

Fits are weighted by bin count. The score is the weighted rms of the bin medians against
the fitted law. `figures/phase-plane-slow.png` and `figures/phase-plane-fast.png`.

### Slow states

| half | state | samples | bins | constant | exponential | orifice √ | best |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| bass | slow crescendo | 7 249 | 12 | 0.129 | 0.031 | 0.023 | orifice |
| bass | slow decrescendo | 2 030 | 7 | 0.120 | 0.019 | 0.064 | exponential |
| treble | slow crescendo | 3 439 | 10 | 0.063 | 0.040 | 0.036 | orifice |
| treble | slow decrescendo | 963 | 7 | 0.137 | 0.012 | 0.061 | exponential |

The constant-rate model is rejected in all four cases, by a factor of four to eleven in
rms. For the slow decrescendo the exponential is clearly the better of the two curved
laws. For the slow crescendo the two are within a factor of 1.3 of each other and the data
do not separate them, partly because a slow crescendo on this roll rarely gets above 0.62
before something else intervenes, so the fitted asymptote is an extrapolation beyond the
observed range and should not be trusted as a physical quantity.

The two decrescendo measurements rest on little data: 2 030 Bass rows and 963 Discant rows,
about 1 % and 0.5 % of the roll. That is what is left after excluding rows at a stop, rows
with the hook engaged, and the first 250 ms after any state change. The fits are
nevertheless clean, with seven bins of at least 40 samples each.

### Fast states

None of the three laws describes a fast excursion. The rate against position is not
monotone. Read against time since the line began to move, and keeping the starting
conditions apart, the picture is straightforward (`figures/fast-valve-opening.png`): the
rate climbs from about 2 units/s to its full value over roughly the first 50 ms in the
Bass and 110 ms in the Discant, holds there, and falls away as the F stop is approached.
That first stretch is the valve opening, so the low rate at low positions in the phase
plane is a property of the time since the trigger rather than of the position. Fitting a
monotone law across the whole excursion mixes the two and returns parameters that mean
nothing. For the Discant fast decrescendo the exponential fit even gives a negative τ.

Pooling the starting conditions makes this worse rather than better: the excursions that
start at the Mezzoforte stop are short and already high, so what looks like a decay in a
pooled average is largely the short excursions dropping out of it.

For the fast decrescendo the shape is not resolvable at all. The median excursion lasts
33 ms, about 20 scan rows, and the rate is still climbing at 45 ms, so most falls are
stopped before they reach full speed. The quoted peak of about −22 units/s belongs to the
longer falls only.

The honest summary is that the fast valves are best described as a constant rate with a
finite opening time and a roll-off near the stop, and that no single closed-form law is
supported by this roll.

## 4. Time constants

Slow states, from the exponential fit, with the crossing times that fit implies. An
exponential never reaches its asymptote, which rules out the printed P.P. line as an
endpoint, so the crossings quoted run between 0.1 and 0.5 on the printed scale.

| half | state | τ (ms) | v∞ | rate at 0.1 | rate at 0.5 | 0.1 → 0.5 | 0.5 → 0.1 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bass | slow crescendo | 1 168 | 0.766 | +0.570/s | +0.228/s | 1 072 ms | |
| bass | slow decrescendo | 592 | 0.041 | −0.100/s | −0.776/s | | 1 211 ms |
| treble | slow crescendo | 2 601 | 1.154 | +0.405/s | +0.251/s | 1 242 ms | |
| treble | slow decrescendo | 661 | 0.035 | −0.099/s | −0.703/s | | 1 299 ms |

Fast valves, by episode, split by what else is latched. "Peak" is the fastest 10 ms window
in an episode, "plateau" the median over the middle half of it, and "span" the time the
plateau rate would need for the whole stop-to-stop distance.

| half | valve | other latch | episodes | peak (units/s) | plateau (units/s) | span (ms) |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| bass | fast crescendo | crescendo off | 9 | +3.46 | +2.68 | 334 |
| bass | fast crescendo | crescendo on | 51 | +5.65 | +4.24 | 211 |
| bass | fast crescendo | hook engaged | 129 | +5.40 | +3.81 | 235 |
| bass | fast decrescendo | crescendo on | 66 | −22.16 | −16.37 | 55 |
| bass | fast decrescendo | hook engaged | 134 | −15.54 | −9.16 | 98 |
| treble | fast crescendo | crescendo off | 15 | +3.37 | +2.22 | 420 |
| treble | fast crescendo | crescendo on | 66 | +5.16 | +3.62 | 257 |
| treble | fast crescendo | hook engaged | 129 | +3.62 | +2.19 | 425 |
| treble | fast decrescendo | crescendo off | 5 | −20.98 | −15.49 | 60 |
| treble | fast decrescendo | crescendo on | 81 | −22.28 | −14.96 | 62 |
| treble | fast decrescendo | hook engaged | 165 | −16.13 | −9.51 | 98 |

The Bass fast decrescendo with the crescendo latch off has only one usable episode, so
that row is missing. The hook-engaged rows are lower because the excursion is stopped by
the hook part way through, and should not be read as a different valve speed.

`figures/fast-rates-by-state.png` shows the crescendo-latch effect. The interquartile
ranges for crescendo on and crescendo off do not overlap in either half, and the episodes
in each group are spread over the whole roll rather than sitting in one passage, so it is
not a local artefact. What is behind it is open. Nine and fifteen episodes is a thin basis
for the crescendo-off figure.

Set beside midi2exp's constants:

| | midi2exp | this roll |
| --- | --- | --- |
| slow decay | 2 380 ms for P → M.F., constant rate | exponential, τ ≈ 590–660 ms, crossing 0.5 → 0.1 in 1.2–1.3 s |
| fast crescendo | 300 ms | 211–257 ms with the crescendo latch on, 334–420 ms without |
| fast decrescendo | 400 ms | 55–62 ms |

The fast crescendo is of the right order. The fast decrescendo differs by a factor of six
to seven, and the slow decay differs in shape as well as in speed.

### Why the crescendo latch speeds the sforzando up

Conduit 39 is joined to the bellows permanently, and the crescendo relay only
switches its far end between blower vacuum and atmosphere. So with the sforzando
set and the crescendo cancelled, 39 admits air and works against the sforzando.
With the crescendo set, both conduits pull the same way. If the two paths simply
add, the gap between the two cases should be the slow crescendo rate plus the slow
decrescendo rate at the same position, both already measured above.

The two groups of episodes do not cover the same positions, so the gap is taken
band by band over the positions both groups reach, weighted by the smaller of the
two counts in each band.

| half | bands | observed gap | predicted gap | share explained |
| --- | ---: | ---: | ---: | ---: |
| bass | 4 (v = 0.13–0.28) | +1.15 units/s | +0.75 units/s | 65 % |
| treble | 8 (v = 0.08–0.43) | +1.08 units/s | +0.65 units/s | 60 % |

Pooled over all positions rather than matched, the shares are 56 % and 53 %. The
matched figures are the fairer ones, because the crescendo-off episodes sit lower
on the scale on average.

So the additive-conductance reading accounts for most of the gap, roughly two
thirds, and the same fraction in both halves. It is the right kind of explanation
and it makes the result much less surprising. It is not the whole of it: the
observed gap also grows with position faster than the prediction does, from +0.79
to +1.41 units/s across the Bass bands where the prediction moves only from +0.70
to +0.82. Something beyond the two measured slow conductances is contributing, and
it grows as the bellows closes. Nine and fifteen crescendo-off episodes remain a
thin basis for the comparison.

## 5. Is the decrescendo always running?

It is always running, as midi2exp assumes, though its rate is not the one midi2exp uses.
Whenever the crescendo and sforzando latches are both off and the hook is not holding, the
line falls, never rises, and is never still. The rate depends on the current level, and
that dependence is close to exactly linear, which is what an exponential relaxation toward
a floor gives. The floor sits at 0.041 (Bass) and 0.035 (Discant), within about 0.02 of the
measured P stop. Nothing in the data supports a constant rate: the rate at 0.5 is roughly
eight times the rate at 0.1.

## 6. The Mezzoforte hook

`figures/mezzoforte-level.png`.

| | bass | treble |
| --- | ---: | ---: |
| stop level on the printed scale | 0.5755 | 0.6171 |
| 95 % CI over plateau visits | 0.5746–0.5766 | 0.6158–0.6184 |
| plateau visits contributing | 222 | 114 |
| spread across visits (sd) | 0.042 | 0.020 |
| rows on the plateau | 30 196 | 27 778 |
| offset above the printed M.F. gridline (upper bound, see below) | +0.076 | +0.117 |
| position between the P and F stops | 0.623 | 0.639 |
| the same, per hold and referred to the F stop | 0.627, sd 0.002 | 0.645, sd 0.003 |
| hook engaged for | 45.5 % of the roll | 45.5 % |

The interval is taken over plateau visits rather than over rows, so that the
autocorrelation of 1.7 ms samples does not inflate it. The spread across visits is larger
than the interval suggests, 0.042 and 0.020 with the loose plateau definition used for that
table. A tighter definition, used for the plateau classification below, gives a much more
repeatable figure: a standard deviation of 0.007 to 0.008 across visits, and only 0.002 to
0.004 within a single hold.

Every level in this section is the one the line reaches when it arrives at the stop
descending. Whether the pin also has a lower face that a rising bellows would meet is
treated below, because it changes what the offset from the printed gridline means.

With the hook engaged the line does not go below the stop. Four observed Bass rows in
89 291 sit more than 0.02 below it, in two runs of at most three rows, and 474 Discant rows
in 89 205 (0.5 %). The deepest the line ever gets below the stop is 0.025 (Bass) and 0.061
(Discant). Meanwhile 63 % of Bass and 56 % of Discant rows with the hook engaged sit above
the stop, and the line moves there freely.

With the hook released, only 4.3 % and 5.6 % of rows fall within 0.02 of the level, with no
mode there, so the level exists only while the hook is set.

### Does the pin show two faces?

A pin is a physical object with extent along the direction the bellows travels, so it does
not arrest the bellows at one level but at two. A board descending onto it comes to rest
against the upper face, a board rising onto it against the lower face, and the band between
them cannot be occupied at all while the pin is down. On that reading, what has been called
"the stop level" above is whichever face the bellows happened to arrive at, and since every
one of the twenty-two engagements is an arrival from above, the levels measured here are the
upper face.

To test it, every settled stretch inside a Mezzoforte hold was classified by the direction
the line was travelling as it came to rest. A stretch counts as settled if it runs at least
25 rows with the rate under 0.10 units/s. The direction is the line's net travel over the
100 ms before it settles, with a threshold of 0.010 scale units.

| | bass | treble |
| --- | ---: | ---: |
| plateaus inside holds | 289 | 256 |
| arrived from above | 150, at 0.5752 (sd 0.0072) | 113, at 0.6169 (sd 0.0079) |
| arrived from below | 4, at 0.6024 (sd 0.0263) | 1, at 0.6140 |
| ambiguous | 135 | 142 |

There is no second face here. The handful nominally arriving from below are marginal
classifications, with net approach travel of only 0.010 to 0.013 scale units over 100 ms,
two or three pixels of creep, and they land at or *above* the from-above level rather than
below it. A genuine arrival at a lower face would require the line to have been beneath the
pin, and it never is. Which is what the hypothesis itself predicts: with every engagement
made from the fortissimo stop, and no crossing of the stop anywhere on the roll, the line
has no way of getting underneath the pin to come up against it.

The four low Discant plateaus at 0.592 to 0.597, which were read earlier as visits resting
low and which are the obvious candidates for a lower face at about 0.021 below the from-above
level, do not survive the check. All four were approached **from above**: net travel over the
preceding 200 ms of −0.192, −0.333 and −0.333 for the three at 37.2 to 39.4 s, and −0.002 for
the one at 63.9 s, which was already resting there. They belong to holds 2 and 3, whose own
from-above medians are 0.6060 and 0.5991, the two lowest on the roll. In the Bass the
equivalent search finds nothing at all: none of the 289 plateaus sits more than 0.015 below
the from-above level.

What the plateau levels do show is a stop that is very repeatable within a hold and drifts a
little between them. Within a single hold the from-above level has a standard deviation of
0.002 to 0.004, one or two pixels. Between holds the median runs from 0.5684 to 0.5870 in
the Bass and from 0.5991 to 0.6247 in the Discant, a spread of 0.005 and 0.008. The low
Discant plateaus are ordinary between-hold variation of that size, not a second level.

**So the roll gives the upper face only, and the pin's centre is not measurable from it.**
That changes what the offset from the printed M.F. gridline means. The +0.076 and +0.117
are the distance from the printed midpoint to the face the line lands on when descending, so
they are *upper bounds* on how far the hook is regulated above the printed midpoint, not
estimates of it. If the printed gridline did mark the pin's centre, the pin would have to
have a half-extent of 0.076 and 0.117 scale units, which is 36 px and 55 px on the scan.
Whether that is a plausible pin depends on the linkage between the bellows board and the pen
that drew the line, which is not known here, so no thickness in millimetres is quoted. The
two halves would in any case need pins of noticeably different extent for both printed
gridlines to be centred, which is a strain on the reading rather than a refutation of it.

### The question reopened, with the rails set aside

The test above asks for the direction over the 100 ms before the line settles, with a
threshold of 0.010 scale units. Repeating it over 250 ms with a threshold of 0.020, and
setting aside the stretches that come to rest at a rail, gives a different answer. Setting
the rails aside matters: 53 of the 177 settled stretches inside a Bass hold, and 37 of 159
in the Discant, rest at the fortissimo rail rather than at the hook, and every one of them
was reached from below. Counted among the arrivals from below they swamp the question.

Away from both rails, and counting each stretch once:

| | bass | treble |
| --- | ---: | ---: |
| settled stretches away from the rails | 124 | 122 |
| arrived from above | 70, median 0.5813, range 0.569 to 0.776 | 80, median 0.6270, range 0.606 to 0.638 |
| arrived from below | 13, median 0.6398, range 0.615 to 0.672 | 7, median 0.6694, range 0.666 to 0.693 |
| arrived level | 38, median 0.5849 | 32, median 0.6260 |

The separation is 0.059 in the Bass and 0.042 in the Discant. In the Discant the two groups
do not overlap at all: every one of the 80 arrivals from above rests between 0.606 and 0.638,
and every one of the 7 arrivals from below between 0.666 and 0.693.

Two cautions. The samples arriving from below are 13 and 7, so the second level rests on
little. And the result is sensitive to the direction window, which is why the stricter test
above finds almost nothing: those 4 Bass and 1 Discant stretches are the subset of these that
also show 0.010 of travel in the last 100 ms.

What the two tests agree on is the sign. Every stretch that arrives from below rests *above*
the level that arrivals from above rest at, in both halves and under both criteria. The
stricter test recorded this as a puzzle, since a pin that excludes a band should put the
rising rest below the falling one. A stop that yields elastically in the direction it is
pushed puts it above, which is what is seen. The model follows that reading, and it is worth
saying plainly that the reading is what a score-neutral change was adopted on: fixing both
faces from these levels leaves the fit at 0.0406 and 0.0557, exactly where it was. What it
buys is not accuracy but determinacy. The extent had been a free parameter that ran to its
bound at 0.229 in the Bass; measured, it is 0.050 and 0.041, and the two halves agree.

### What moves the stop between holds

The per-hold medians drift by more than the within-hold scatter, 0.019 in the Bass and 0.026
in the Discant against a within-hold standard deviation of 0.002 to 0.004, so something
systematic is moving. Three candidates were tested and the answer is a fourth.

**It is not the spacing of the printed scale.** Measured against position along the roll, the
correlation is identical whether the level is taken in scale units or in raw scan columns from
the local M.F. gridline: −0.004 against −0.004 in the Bass, +0.472 against +0.472 in the
Discant. The two measures agree exactly because the tracer's gridline model is a rigid
translation, and the local M.F.-to-F.F. spacing is constant to within 0.0 px over the whole
roll. That also means the comparison has no power to detect a residual in the *translation*,
which would move the scale value and the pixel offset by the same amount. A different
reference is needed.

**The fortissimo stop provides it, and it says the drift is mostly in the trace.** The F stop
is a mechanical limit that no hook can move, and it is visited many times inside every hold.
Per hold, the two levels move together almost exactly:

| | bass | treble |
| --- | ---: | ---: |
| holds with both levels readable | 9 | 9 |
| between-hold sd of the M.F. stop | 0.0034 | 0.0057 |
| between-hold sd of the F stop | 0.0027 | 0.0054 |
| correlation between the two across holds | **+0.90** | **+0.97** |
| M.F. stop referred to the F stop of the same hold: sd | **0.0015** | **0.0013** |
| the same, as a fraction of the P-to-F travel | 0.6266, sd 0.0022 | 0.6449, sd 0.0026 |

Two independent mechanical stops cannot drift in lockstep at r = 0.90 and 0.97 with nearly
equal spreads. What is moving is the whole traced line with respect to the printed gridlines,
and it carries the hook and the F stop with it. Referring the hook to the F stop of its own
hold removes 56 % of the between-hold standard deviation in the Bass and 77 % in the Discant,
and what is left, 0.0015 and 0.0013, is no larger than the scatter within a single hold. The
stop itself is steadier than the raw per-hold medians suggest.

**Approach speed does something too, in one half only.** Taking the fastest 10 ms of the
200 ms before each plateau settles, arrivals range from a drift at 0.7 units/s to a sforzando
collapse at 22.5. In the Bass the landing level falls as the arrival gets faster, within holds
as well as across them: r = −0.51 within-hold (n = 148 over 10 holds), a slope of
−0.0007 scale units per unit/s, so about 0.016 across the whole observed speed range. In the
Discant there is no such effect and the sign is the other way, r = +0.19 with a bootstrap
interval from −0.27 to +0.45. A rebound or a compressible facing would be a natural reading of
the Bass result, but one half showing it and the other not is too little to claim it. It is in
any case small beside the common-mode drift.

**The sentence to print about the uncertainty.** The Mezzoforte stop sits at 0.576 (Bass) and
0.617 (Discant) on the printed scale, repeatable to a standard deviation of 0.002 to 0.004
within one hold and 0.003 to 0.006 across holds, most of which is common-mode movement of the
whole traced line: referred to the fortissimo stop of the same hold the level is steady to
0.0013 to 0.0015, or 0.627 and 0.645 of the travel from the P stop to the F stop with a
standard deviation of 0.002 to 0.003.

### One-sided or two-sided? The roll cannot say

An earlier draft of this section read the observation above as showing that the hook blocks
downward travel only. That was an overclaim, and the correction is worth stating carefully,
because the two readings are a real modelling choice. Hagmann has the pin as a stop at the
midpoint that confines the bellows to whichever half of its travel it is already in, and a
pin standing in the travel path is two-sided by construction, so the live question is not
really which kind of stop it is but whether this roll could tell. A hook
engaged while the line is above the stop then leaves the line above it, free in the upper
half and unable to come down, which is exactly what is observed. A one-sided floor predicts
the same thing in that case. The readings differ only when the hook engages while the line
is below the stop, and they are separated by counting crossings of the stop level with the
hook engaged: a two-sided stop forbids upward crossings, a floor permits them, and both
forbid downward ones.

A crossing is counted when the line passes between two runs of at least 20 rows established
more than 0.03 clear of the stop, with no Mezzoforte-off in between and with every row of
the path between them witnessed. That last condition matters: a crossing bridged by rows the
tracer could not read proves nothing either way.

| | bass | treble |
| --- | ---: | ---: |
| hook holds in which the line is ever established below the stop | 0 of 11 | 1 of 11 |
| rows established below the stop, of the hook-engaged rows | 0 of 90 350 | 66 of 90 326 |
| **upward crossings** | **0** | **0** |
| **downward crossings** | **0** | **0** |
| candidates rejected as unwitnessed | 0 | 1 up, 1 down |

The test has no power. The reason is plain in the code: **all twenty-two Mezzoforte-on
punches fire while the line is standing at the fortissimo stop**, at 0.904 to 0.918 in the
Bass and 0.924 to 0.954 in the Discant, against stops at 0.576 and 0.617. The editor never
engages the hook from the lower half of the travel, so the case that would separate the two
readings never arises on this roll.

The one Discant candidate does not rescue it, and fails the witnessing condition outright.
It is a single episode at 37.6 to 38.4 s in which the line sits at 0.575 to 0.582 for about
200 ms and then rises to the F stop, and 212 of the 428 rows bridging the two established
runs are `gap`, `hole` or `rule` rather than seen. Half of that crossing is interpolation.
It also comes paired with a downward crossing, which *both* readings forbid, so it is better
read as one hook visit sitting low than as a passage through a barrier. That reading is
supported by the rest of the Discant material below the stop: of the six runs of at least 10
rows more than 0.02 below it, four are flat plateaus at 0.592 to 0.597 with a median
absolute rate of 0.03 to 0.04 units/s, which is a hook visit resting about 0.02 low against
a visit-to-visit spread of 0.020.

So the count is zero crossings in either direction, on a test that could not have detected
one. The roll is consistent with both readings and decides neither, and the same silence
accounts for the missing lower face above: the line never gets beneath the pin, so it never
comes up against it. What the roll does decide is the level of the face the line lands on,
and that the line never crosses that face downward while the hook is set. Whether the pin
also blocks the upward direction has to be settled somewhere else, by fitting the two
variants against the drawn line or from the mechanism itself.

The stop is therefore a calibration point, and it disagrees with the printed scale. On the
roll's own printed scale it sits 0.076 and 0.117 above the M.F. gridline, and on the
mechanism's stop-to-stop travel at 0.62 and 0.64. The Bass and Discant figures
differ by 0.04 of the printed span, which is 10 px on the scan, larger than the tracer's
uncertainty. Whether that is a real difference between the two hooks or a defect in how
the shared central F.F. gridline calibrates the two halves is not settled here.

### Is the stop an artefact of the band the tracer cannot read?

The tracer cannot tell the drawn line from a printed gridline, so rows where the two
coincide are flagged `rule` and interpolated. If the stop were in fact on the printed M.F.
gridline, the tracer would miss the line exactly there and report only the shoulders on
either side, which could manufacture a mode just above. The check was made three ways and
the answer is no.

First, the flag composition. Far from being degraded, the hook-engaged stretches are the
cleanest part of the trace:

| flag | bass, hook engaged | bass, released | treble, hook engaged | treble, released |
| --- | ---: | ---: | ---: | ---: |
| `ink` | 98.41 % | 87.78 % | 97.80 % | 87.27 % |
| `faint` | 0.41 % | 2.02 % | 0.95 % | 1.92 % |
| `hole` | 1.10 % | 2.17 % | 0.46 % | 2.06 % |
| `rule` | 0 rows of 90 350 | 3.26 % | 2 rows of 90 326 | 3.38 % |
| `gap` | 0.08 % | 4.78 % | 0.77 % | 5.37 % |

Across 180 676 hook-engaged rows there are two `rule` rows in total. The artefact would
need a raised `rule` or `gap` fraction while the hook is set, and the fractions go the
other way.

Second, the width of the excluded band, measured rather than inferred. The values carried
by `rule`-flagged rows near the middle of the scale span 0.4873 to 0.5126 in the Bass and
0.4875 to 0.5128 in the Discant, which matches the 0.489–0.511 that `rule_halfwidth_px`
of 5.0 implies. The stops at 0.576 and 0.617 lie 0.063 and 0.104 above the top of that
band, that is five and eight times its half-width away.

Third, and most directly, the raw traced column. Measuring in scan columns against the
local printed M.F. gridline takes the calibration out of the question altogether. With the
hook engaged, and with nothing masked, the Bass column shows a single clean mode 37 px
towards the F.F. line from the gridline, with the peak running from 33 to 39 px, and the
Discant a single mode at 57 px, peak 51 to 61 px. Not one row in either half falls within
±6 px of the gridline. The M.F.-to-F.F. spacing is 238.3 px (Bass) and 234.9 px (Discant),
so those modes stand 0.078 and 0.121 scale units above the gridline, that is stops at
0.578 and 0.621, agreeing with the figures above to within 0.004. The lower row of `figures/mezzoforte-level.png` shows this: a peak, not
two shoulders with a hole between them.

The empty stretch above the gridline in the upper panels is real and is not exclusion. With
the hook engaged, the band from 0.513 to 0.55, which is clear of the `rule` band and
perfectly readable, contains no rows at all, of any flag. With the hook released the same
band holds 4 503 Bass and 5 402 Discant rows, 94 % of them `ink`. The tracer reads that band whenever
the line goes there. While the hook is set the line simply never goes there, which is what a
hard stop above the gridline predicts.

### How long the hook is held

Forty-five per cent of the roll is a large fraction to rest on eleven perforations, so the
holds themselves are worth stating. Each half has eleven hook-on to hook-off intervals, of
median 10.0 s (Bass) and 10.6 s (Discant), ranging from 2.4 s to 27.0 s and from 3.0 s to
26.9 s. They total 150.0 s and 149.9 s of the 328.8 s of drawn line, which is where the
45.5 % comes from. The four longest holds in each half account for roughly two thirds of it.

Within those stretches the line is not sitting on the stop throughout. Of the hook-engaged
observed rows, 37.3 % (Bass) and 43.4 % (Discant) are within 0.02 of the stop and 21.5 % and
24.2 % are within 0.02 of the F stop, which is the mass at 0.9 in the histogram. Those rows
do have the hook latched. The line is free to move above the stop while the hook is set, so
a sforzando carries it to the F stop and back down to the hook, and that is what the excerpt
figure shows happening several times a second.

## 6b. Does the line rebound at the rails as it does at the hook?

Where the line arrives at the Mezzoforte hook after a fast collapse it does not simply stop.
It goes a little past the level it settles at and springs back, which is a compliant contact
rather than a rigid one. Whether the two rails behave the same way decides whether a model may
give them the hook's constants.

Each arrival is aligned on the first row within 0.01 of the stop, and the trajectory is
measured from the level the line settles at 150 to 300 ms later. An arrival counts only if it
approached faster than 5 units/s, if the line is still at the stop at the end of the window,
and if **every row of the window from −100 to +300 ms is witnessed**, so that no bridged gap
can manufacture a smooth curve. That last condition costs 44 and 55 arrivals at the forte stop
and 65 and 136 at the hook. `figures/stop-arrivals.png`.

| | bass forte | treble forte | bass piano | treble piano | bass hook | treble hook |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| arrivals | 34 | 28 | **0** | **1** | 72 | 76 |
| arrival speed | 5.1–7.1 /s | 5.1–6.8 /s | – | – | 6.4–20.2 /s | 13.8–24.4 /s |
| overshoot past the stop | +0.0041 | +0.0066 | – | – | +0.0031 | +0.0046 |
| rebound back past the resting level | −0.0019 | +0.0005 | – | – | **−0.0238** | **−0.0115** |
| rebound at | – | – | – | – | +14 ms | +20 ms |
| full cycle | none | none | – | – | ≈ 32 ms | ≈ 32 ms |

**The hook rings and the rails do not.** At the hook the line goes 0.003 to 0.005 past the
stop within a few milliseconds, swings back past its resting level by 0.024 (Bass) and 0.012
(Discant) at 14 to 20 ms, and is settled by about 50 ms: one visible cycle of a heavily damped
bounce, of the same period in both halves. At the forte stop there is no swing back at all.
The Bass creeps up 0.004 over some 80 ms and decays, and the Discant bumps up 0.007 at +10 ms
and decays monotonically, neither of them crossing the resting level.

The bounce is in the ink and not in the path-finding. Re-tracing a window rich in hook
arrivals at a fiftieth of the step penalty leaves it unchanged: on the same five Discant
arrivals the accepted trace, a re-trace at 0.050 and a re-trace at 0.001 give an overshoot of
+0.0064, +0.0066 and +0.0064 and a rebound of −0.0143, −0.0140 and −0.0142, agreeing point by
point to 0.002 (§12 has the method).

### But the rails are never struck hard

Before this is read as the rails being rigid, the reason they show nothing has to be stated:
**not one arrival at either rail exceeds 10 units/s**, in either half. Raising the bar from 5
to 10 units/s leaves 0 and 0 arrivals at the forte stop, against 70 and 76 at the hook, and
901 and 729 candidate contacts at the forte stop are rejected for being too slow. The two
samples do not overlap in speed at all.

That is not an accident of selection. The fast crescendo rolls off over the last sixth of its
travel (§3), so the line decelerates into the forte stop, while the hook sits in the middle of
the travel where a fast decrescendo is still running at full speed. The rails are approached
gently because the mechanism runs out of pressure difference as it nears them.

So the comparison the shared-constants assumption needs, the same linkage arriving with the
same momentum, **cannot be made on this roll**. What can be said is narrower and still useful.
The rails show no rebound at the speeds at which they are actually reached. If the hook's
amplitude scales with speed, and in the Bass it does, weakly (overshoot against arrival speed
r = +0.299, slope +0.00055 units per unit/s, 95 % CI +0.00010 to +0.00098, over 6.4 to
20.2 /s, against a Discant slope of +0.00024 with an interval spanning zero), then a hook-like
compliance at a 6 units/s arrival would give an overshoot of about 0.001, which is half a
traced pixel and below anything this roll can show.

The practical consequence is that the choice barely matters. Sharing the constants is not
justified by evidence, and it is also close to harmless, because a compliance calibrated at
the hook is never exercised at the rails. Dropping it there and keeping it only at the hook is
the reading the data supports.

## 7. Lead of the line over the punches

`figures/lead.png`.

Two independent estimates, both with the same sign.

The first scans a candidate offset and asks which one maximises the difference in mean
rate between latch on and latch off, over the whole roll. It peaks at 122 ms (sforzando)
and 109 ms (crescendo) for the Bass, 102 ms and 95 ms for the Discant, in every case with
the line ahead.

The second measures, for each sharp collapse of the line, the offset to the nearest
sforzando-off punch:

| half | n | median | 95 % CI | IQR | as paper distance |
| --- | ---: | ---: | --- | ---: | ---: |
| bass | 227 | 108.6 ms | 106.3–110.0 ms | 9.9 ms | 65 px |
| treble | 274 | 75.7 ms | 72.9–79.3 ms | 17.2 ms | 46 px |

An interquartile range of 10 ms on 227 events is a tight relation. Section 13 measures the
same offset for the other controls with a definition that does not depend on how sharp the
feature is, and finds that they differ: a single offset for the whole half is not enough.
The two methods
agree to within about 14 ms for the Bass and 26 ms for the Discant, the scan being the
looser of the two because it averages over the whole roll including passages where the
latch state is ambiguous.

Expressed as paper distance the offset is more nearly constant along the roll than it is
in time. Over the three thirds of the roll the Bass offset runs 67, 65 and 64 px, that is
114, 110 and 103 ms. The Discant runs 53, 47 and 44 px, that is 91, 78 and 70 ms. Neither is
exactly constant, and the Discant drifts noticeably in both units, so the evidence for a
fixed distance rather than a fixed delay is suggestive rather than conclusive.

The sign is worth stating plainly, because it runs the other way from what one would
expect. Gottschewski's account, that the punches were derived from the line and set
ahead of it to compensate the hand-nuancer's reaction time, predicts that the line lags
the punches. On this roll the line leads them, by roughly 5.5 mm (Bass) and 3.9 mm
(Discant) of paper. Before reading that as a claim about the recording practice, note that
it also has a mundane possible cause: it assumes that the row SUPRA reports for a
perforation is its leading edge and that the traced line and the hole detection share a
row origin exactly. Both are plausible and neither has been checked against the image
here. A 65 px offset is close to the length of a perforation, which is the kind of
coincidence that ought to be ruled out before the finding is used.

### Do the two row systems share an origin?

The lead rests on the traced rows and SUPRA's hole rows meaning the same thing, so
it is worth checking rather than assuming. `curves.csv` flags a row `hole` where a
punch has removed the paper under the drawn line, which gives 282 (Bass) and 255
(Discant) places where the two systems can be compared directly.

The tracker column of MIDI key k sits at x = ORIGIN + (k − 14) × 37.7561 px in the
scan. ORIGIN is fitted here rather than taken from the metadata, by asking which
value lets a perforation on the column the drawn line was crossing account for the
most `hole` runs. It comes out at 153.0 px (Bass) and 151.5 px (Discant), and at
that value 281 of 282 and 255 of 255 runs are explained. The keys involved are 55
to 66 under the Bass line and 67 to 79 under the Discant line, which is where those
columns fall. The fit is thus its own check.

| | bass | treble |
| --- | ---: | ---: |
| `hole` runs matched to a perforation | 281 / 282 | 255 / 255 |
| median run length | 4 rows | 5 rows |
| run start − punch start, all runs | +13 rows | +11 rows |
| run end − punch end, all runs | −12 rows | −14 rows |
| run start − punch start, square crossings | +4 rows | +5 rows |
| run end − punch end, square crossings | −5 rows | −4 rows |
| midpoint offset, all runs | 0.0 rows (95 % CI −1.0 to +0.5) | −0.5 rows (−3.0 to +0.5) |
| midpoint offset, square crossings | 0.0 rows (−1.5 to 0.0) | 0.0 rows (−0.5 to +0.5) |

The drawn line loses its ink over the middle of a perforation and not over the
whole of it, which is what a round-ended hole crossed by a line of finite width
should give: the run sits inside the punch, inset at both ends. The inset is
smaller for the 109 and 86 runs of at least 10 rows, where the line crosses the
column squarely, than for the grazing crossings, exactly as that reading predicts.

What matters is that the inset is symmetric. A constant offset between the two row
systems would move both ends the same way. Instead they move equally and
oppositely, and the midpoint of the run sits on the midpoint of the punch to within
one scan row, about 1.7 ms. `figures/row-origin.png`.

The two systems therefore share an origin. The lead of 109 ms (Bass) and 76 ms
(Discant) is 65 and 46 rows, against a residual uncertainty in that origin of under
two rows. The mundane explanation is ruled out and the lead stands.

On the convention itself: SUPRA's raw MIDI brackets the paper hole as scanned, note
on at its first row and note off at its last. midi2exp assumes exactly that, and
supplies the tracker-bar allowance itself, adding
`int(tracker_width × 0.75 + 0.5)` = 13 px to note-off ticks only, with
`tracker_width = 1.413 mm × 300.25 ppi / 25.4 = 16.70 px`
(`Expressionizer::applyTrackBarWidthCorrection`, and `MidiRoll::trackerize` does the
same for the note tracks). Our file carries no `TRACKER_EXTENSION` metadata and is
marked `MIDIFILE_TYPE: hole`, so no allowance has been applied to it. The one-sided
correction is a simplification: a round tracker hole opens before the paper hole's
leading edge is fully over it and closes after its trailing edge has passed, so the
physical allowance is two-sided. That does not affect the lead, which is measured
from the punch midpoints.

## 8. Note density

Two tests, both weak and both negative in sign.

The first takes the residual of the observed rate against what the fitted slow-state law
predicts, in the slow states with the hook released, and correlates it with a boxcar count
of note onsets per second over a 500 ms window. r = −0.134 for the Bass (block-bootstrap
95 % CI −0.242 to −0.021, 24 451 rows) and −0.220 for the Discant (−0.330 to −0.085,
21 123 rows).

The second is cleaner. While the hook is engaged the line rests against a mechanical stop
and ought to be perfectly still. It is not: the standard deviation of its position on the
plateau is 0.0135 (Bass) and 0.0134 (Discant), about 3 px. That wobble correlates with
note density at r = −0.112 (CI −0.199 to −0.015, 39 297 rows) and −0.140 (−0.245 to
−0.027, 45 663 rows). The regression slope is −1.4 × 10⁻⁴ scale units per note per second
in both halves, so between median density (12–14 notes/s) and the 95th percentile
(34 notes/s) the line sits about 0.003 lower, roughly 0.7 px.

Punches under the drawn line are themselves more frequent when more notes sound, so the
test was repeated with an exclusion zone of 20 and then 60 scan rows around every row the
tracer could not witness. The correlation does not move: −0.112, −0.116, −0.118 for the
Bass and −0.140, −0.143, −0.144 for the Discant. The `hole` flag itself correlates with
note density at only r = 0.04.

So the association is real in the statistical sense and consistent across the two halves. It
was read here at first as a regulator effect. Neither the differential test below nor the
note-triggered test in §8b supports that reading, or any other pneumatic one. It is also small: the shift between
median and high note density is about a fifth of the spread of the wobble itself, and
visible only in aggregate over tens of thousands of rows. It is a hint that the line
carries something beyond the expression code. What that something is stays open, and a
first model can ignore it.

### Does the blower sag when many notes sound?

A better-posed version of the same question, and one with a differential prediction. One
blower feeds the note pneumatics and, through wind chamber 15, the relay that evacuates the
Nuancierbälge. If the supply sags under load there is less vacuum to close the bellows with,
which should slow the closing and leave the opening, which runs off atmosphere and the
spring, alone. So the slow and fast crescendo should lose rate as note density rises, and the
slow decrescendo and the sforzando release should not.

The rate depends on where the bellows already is, and note density is not independent of
that, so each slope is taken within bands of position 0.05 wide: every sample is compared
with the median rate and the median density of its own band. Intervals are block bootstraps
over one-second blocks. Density is note onsets per second over a 500 ms boxcar.

| half | state | | rows | distinct seconds | slope per note/s | 95 % CI | rate lost at p95 density | bands of the same sign |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| bass | slow crescendo | closing | 7 249 | 44 | +0.0010 | −0.0031 to +0.0037 | −6 % | 6 of 12 positive |
| bass | slow decrescendo | opening | 2 030 | 36 | −0.0022 | −0.0067 to +0.0014 | +19 % | 2 of 7 |
| bass | fast crescendo | closing | 11 827 | 184 | +0.0023 | −0.0057 to +0.0115 | −2 % | 7 of 18 |
| bass | sforzando release | opening | 4 847 | 175 | **+0.0292** | **+0.0061 to +0.0572** | −10 % | 14 of 18 |
| treble | slow crescendo | closing | 3 439 | 35 | **+0.0087** | **+0.0038 to +0.0147** | −106 % | 6 of 10 |
| treble | slow decrescendo | opening | 963 | 13 | −0.0150 | −0.0345 to +0.0053 | +36 % | 3 of 7 |
| treble | fast crescendo | closing | 16 460 | 195 | +0.0018 | −0.0024 to +0.0070 | −2 % | 15 of 19 |
| treble | sforzando release | opening | 4 965 | 194 | **−0.0199** | **−0.0406 to −0.0015** | +7 % | 4 of 18 |

**The differential pattern is not there, and what is there contradicts it.**

The two states the hypothesis predicts should be affected show nothing. The fast crescendo is
the best supported state on the roll, 209 and 259 episodes spread over 184 and 195 distinct
seconds, and its pooled slope is indistinguishable from zero in both halves. Its sign is
positive in both, the wrong way for a sagging supply. Band by band the Bass is mildly negative
through the middle of the travel, from −0.003 to −0.017 between 0.03 and 0.58, turning
positive only in the top bands, which is the predicted direction over most of the range. The
Discant over the same bands is flat to slightly positive, +0.002 to +0.008. One half faintly
in the predicted direction and the other not is not a result.

The two states the hypothesis predicts should be *unaffected* carry the largest and the only
clearly non-zero slopes, and they point in opposite directions in the two halves. The
sforzando release slows with density in the Bass, +0.029, and speeds up with it in the
Discant, −0.020, both with intervals clear of zero and both large, a tenth of the rate at high
density. A shared blower cannot slow one half and speed the other.

The same-half against other-half comparison does not rescue it either. For a shared supply
the other half's density should matter about as much as this half's. For the Bass sforzando
release the other half's density gives the larger slope, +0.079 against +0.017 for its own,
which is the shared-supply signature. For the Discant release it is the other way round,
−0.028 for its own against −0.007 for the other half. The two halves disagree about which
load matters as well as about the sign.

The circular-shift control does at least show that these are alignments rather than slow
trends. Sliding the density series 30 s along the roll takes every interval back across zero,
including the two significant ones.

Two of the entries above should not be leaned on at all. The slow states survive so little
of the roll once the rails, the hook and the settling time are excluded, 44 and 35 distinct
seconds for the crescendo and 36 and 13 for the decrescendo, that a one-second block
bootstrap has only a few dozen blocks to work with. The treble slow crescendo's apparently
strong slope is the clearest case: its band slopes run +0.010, +0.027, +0.030, +0.039, +0.016,
+0.004, −0.034, −0.054, −0.072, changing sign in the middle of the range, so the pooled figure
is an artefact of how the bands are weighted rather than an effect.

The asymptote test, taking the level a slow crescendo settles towards and splitting the
episodes at the median density, does come out in the predicted direction in the Bass: 1.15 in
the quiet half against 0.83 in the busy half. It rests on eleven episodes each side, the
fitted asymptote and time constant trade against one another, and the Discant has only nine
usable episodes in total and cannot be split. It is too thin to count either way.

**What this leaves.** The drawn line records the nuance bellows of the recording machine, not
of a reproducing piano, so the supply in question is that machine's, and the note density here
is a proxy for what the pianist was playing. On this roll that supply leaves no differential
mark: closing and opening are not affected differently, and the effects that do reach
significance are of opposite sign in the two halves, which is the signature of a confound
rather than of a shared blower. The most economical reading of the residual correlations,
including the small one reported earlier in this section, is musical rather than pneumatic:
the hand nuancer was working the lever differently where the music was denser, and there is no
reason for that to have the same sign in both hands.

## 8b. Is there note-locked structure in the line? What the line records

This is the test that bears on what the drawn line physically is. The Regelbalg senses the
vacuum delivered to the note pneumatics and acts on the cone valve, not on the Nuancierbalg.
So a trace of **bellows travel** cannot contain wiggles locked to individual note attacks,
while a trace of **delivered vacuum** must. The boxcar in §8 was 500 ms wide and smeared
exactly the feature that decides it: an attack loads the pneumatics for tens of milliseconds.

The test is model-free. The line is high-passed by subtracting its own running mean over
150 ms, computed over witnessed rows only so that a punched gap neither contributes to the
smooth part nor leaves a step. Notes struck within 30 ms of one another are one attack, which
keeps dense passages from carrying the average: 9 593 onsets become 2 964 attacks, of median
size 3. Every figure is set against the same average computed on the attack times circularly
shifted by twelve different amounts, which keeps their rhythm and destroys only their
alignment. Amplitudes are given in scan pixels, one pixel being 0.0021 scale units.
`figures/note-locked.png`.

### There is a large note-locked dip, and it is not the tracer

Over every witnessed row the line dips after an attack, by −2.0 px (Bass) and −2.6 px
(Discant) at +28 to +54 ms, four times the spread of the shifted controls. Restricted to
attacks of five notes or more it reaches **−7.1 px and −11.3 px**, five to seven times the
controls, while attacks of one or two notes give −0.06 px and +0.01 px, which is nothing.

Two tracing explanations can be ruled out. A note hole punched through the drawn line would
produce structure locked to the attack, but the dip is as large for notes whose tracker
columns lie well away from the traced band as for those that cross it (−2.2 px against
−2.1 px in the Bass, −3.7 against −4.6 in the Discant), and it survives excluding a margin of
60 rows around every row the tracer could not witness.

### But it is commanded motion, not vacuum

The dip disappears as soon as the expression code is taken out of the picture.

| half | condition | rows | attacks at lag 0 | dip | control sd | ratio |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| bass | every witnessed row | 184 965 | 2 887 | −1.96 px | 0.47 | 4.1 |
| bass | excluding ±200 ms of any expression event | 45 943 | 563 | −0.09 px | 0.12 | 0.7 |
| bass | **line pinned at the hook throughout** | 3 927 | 71 | **−0.16 px** | 0.20 | **0.8** |
| treble | every witnessed row | 184 433 | 2 855 | −2.60 px | 0.63 | 4.1 |
| treble | excluding ±200 ms of any expression event | 38 200 | 340 | −0.23 px | 0.20 | 1.1 |
| treble | **line pinned at the hook throughout** | 4 735 | 86 | **−0.13 px** | 0.25 | **0.7** |

The last row of each half is the decisive one, and it is defined from the line rather than
from the punches: only rows where the line stays within 0.02 of the Mezzoforte stop for the
whole of the ±250 ms window, so that the bellows is demonstrably against a mechanical stop and
cannot move for the entire average. That leaves 2.0 % and 2.4 % of the roll. There, the
note-triggered average is **smaller than the shifted controls**. The same holds for the large
chords that drive the effect elsewhere: on pinned rows they give a ratio of 0.9 in both halves.

So the sequence is: a large dip everywhere, nothing once the expression events are excluded,
nothing where the bellows is pinned. The scaling with chord size points the same way once it
is read properly. Big chords are where the accents fall, so a note-triggered average picks up
the commanded excursions that follow them, and the apparent load dependence is that
coincidence rather than a pneumatic one. With the bellows pinned it is gone.

### The bound, and what it means

On the pinned rows the 95 % bound on any note-locked feature is **0.40 px in the Bass and
0.49 px in the Discant**, that is 0.0008 and 0.0010 scale units. The trace's own
reproducibility at the steepest edges is 0.0003 (§12), so the bound is about three times
that: the null is a real one and not a failure of resolution at the level that matters. It
rests on 71 and 86 attacks, which is the price of requiring the bellows to be provably still.

**The line records the position of the Nuancierbalg, not the delivered vacuum.** That is now
a positive result rather than an absence of an alternative: where the bellows cannot move, the
line does not move with the notes, and where it can, everything that looks note-locked is
accounted for by the expression code. One caveat should stand with it. If the pen linkage has
any appreciable inertia of its own it would attenuate a 30 ms wiggle, and nothing here
measures that, so the bound is on what reached the paper rather than on what the vacuum did.

## 9. Rails and range

`figures/rails.png`.

| | bass | treble |
| --- | ---: | ---: |
| P stop | 0.017 | 0.022 |
| F stop | 0.912 | 0.952 |
| stop-to-stop span | 0.895 | 0.930 |
| within 0.02 of the P stop | 1.4 % of rows | 6.3 % |
| within 0.02 of the F stop | 14.1 % | 17.2 % |
| line at rest (\|dv/dt\| < 0.08/s) | 33.1 % | 34.2 % |
| observed minimum | −0.033 | −0.021 |
| observed maximum | 0.962 | 1.031 |

The stops are read as the modes of the distribution of positions at which the line is at
rest, which is what a mechanical stop produces. The P stop sits essentially on the printed
P.P. gridline, within 0.02 of it in both halves, so the outer gridline does mark the
mechanism's travel limit. The F stop does not: it falls 0.088 (Bass) and 0.048 (Discant)
short of the shared central F.F. gridline. The handful of rows beyond the stops, and the
Discant maximum of 1.031, are tracing excursions rather than travel.

Both halves spend far more time against the F stop than against the P stop, and about a
third of the roll with the line not moving at all.

## 10. Is the sforzando-crescendo coupling punched into the roll?

Hagmann (1984) reports two things about the T-100 relay that neither midi2exp nor
pianolatron represents: that setting Sforzando always also sets Crescendo, so the
bellows is held closed through the crescendo conduit as well, and that cancelling
Sforzando runs through openings 11 and 9 together, opening 9 serving only to cancel
the crescendo that was set with it. Whether he means the roll is punched that way or
the relay does it internally is ambiguous in the text. The roll can say.

Co-occurrence at this event density is not negligible by chance, so the same
statistic is computed against 2 000 circularly shifted copies of the sforzando
series, which keeps its own rhythm and destroys only its alignment with the
crescendo series.

| half | pair | n | perforations overlapping | within ±40 rows | chance | 95 % of chance | excess |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |
| bass | sforz on / cresc on | 587 | 4.6 % | 3.4 % | 6.8 % | 4.6–9.4 % | −3.4 % |
| bass | sforz off / cresc off | 225 | 10.7 % | 8.0 % | 6.2 % | 3.6–9.3 % | +1.8 % |
| treble | sforz on / cresc on | 443 | 6.8 % | 4.1 % | 6.6 % | 4.5–8.8 % | −2.5 % |
| treble | sforz off / cresc off | 273 | 8.4 % | 6.2 % | 6.1 % | 3.7–9.2 % | +0.1 % |

Every excess sits inside the chance interval, and the offset distributions are broad
and flat with no peak at zero (`figures/sforzando-crescendo-coupling.png`). The
median offset is +42 rows for the Bass sforzando-on to crescendo-on pair with an
interquartile range of −584 to +475 rows, which is to say the nearest crescendo-on
punch is wherever the music happened to put it.

If anything the sforzando-on and crescendo-on codes avoid one another slightly,
3.4 % against a chance 6.8 % in the Bass, and the sforzando-off to crescendo-on pair
more clearly so, 2.2 % against 6.8 %. That is what one would expect if the editor
treated the two as alternatives, reaching for the fast valve or the slow one but
not both at once.

The reading is therefore unambiguous for the punching and silent about the relay:
**the coupling is not in the roll**. If Hagmann's relay does set the crescendo
whenever the sforzando is set, an emulator has to supply that internally, because
the punched code will not supply it. Nothing here tests whether the relay does it,
and the additive-conductance result in section 4 is the closest this roll comes to
an answer: with the sforzando set and the crescendo latch left off, the line still
rises, but at about 60 % of the rate it reaches when the crescendo latch is also on.
That is what an uncoupled relay predicts. A relay that always set the crescendo with
the sforzando would give one rate, not two.

## 11. Does the sforzando latch? The roll cannot say, and what it does say favours the momentary reading

*Amendment.* What follows prices a momentary drive against a plain latch and does not price a
third option, a momentary drive strong enough to saturate. §14 shows that on rises reaching the
fortissimo stop the height is set by the stop and carries no information about the perforation,
which a latch and a saturating momentary drive predict alike. The test that separates them is
whether the line still rises after the port has closed, and it does not: over 100 (Bass) and
105 (Discant) clean rises the median travel occurring after the port closed is 3.2 % and 1.3 %,
not one finishes more than 200 ms after the port closed, and the rate a momentary drive would
need, 2.15 and 2.24 units/s at the median, sits at or below the fast-crescendo plateau §4
measures at 4.24 and 3.62. So the roll's evidence is against a *latch* rather than for a drive
that stops with its punch, and the section's conclusion stands as stated. The whole-roll
argument below, that a latch would pin the bellows at the stop for about 60 % of the roll
against a line that is within 0.02 of it only 14 % and 17 % of the time, remains the strongest
leg and is untouched.

midi2exp treats the sforzando as active only while its perforation is under the
tracker bar. Hagmann has it latch until cancelled. The roll carries 225 (Bass) and
273 (Discant) sforzando-off perforations, and the interval from an on-punch to the
next cancel has a median of 252 ms (Bass) and 297 ms (Discant), with a p90 of 2.0
and 1.9 seconds. That the cancelling line exists at all was read here at first as a
hint towards latching, but a cancel is needed under either reading, since the fast
decrescendo has to be commanded somehow.

Regressing the excursion on the two candidate predictors is inconclusive and mildly
misleading. On stop-free episodes the excursion correlates −0.35 (Bass) and −0.29
(Discant) with the length of the perforation and +0.30 and +0.23 with the interval
to the cancel, and the partial correlations keep the negative sign on the
perforation length. A negative coefficient is not what the momentary reading predicts either, and
the likeliest reason is that long sforzando slots fall in passages where the line is
already high and has less room to travel. Neither predictor explains much, and the
test is close to circular anyway, since the episode is cut at the next event.

The direct test is what the line does after it stops rising. On stop-free episodes the rise
ends 65 ms (Bass) and 55 ms (Discant) before the perforation closes, well before the cancel,
which arrives in every single case afterwards, a median 626 ms and 533 ms later. If the
sforzando were momentary the line would by then be falling at the slow decrescendo rate.
Taking every case where at least 150 ms of clear line lies between the rise ending and the
cancel gave +0.010 units/s in the Bass and +0.908 in the Discant, against a momentary
prediction of about −1.0, and an earlier version of this section concluded from that pair of
numbers that the sforzando latches.

**That conclusion does not survive, and is withdrawn.** Two things are wrong with it.

The first is a confound. The crescendo latch is engaged for 63.0 % of the Bass roll and
56.1 % of the Discant, so most of those windows have the crescendo set as well, and a latched
crescendo on its own would hold the line up or walk it slowly upward, which is the behaviour
that was being read as evidence for the sforzando. Splitting the windows by the crescendo
state, which is constant across each of them because the window is cut at the next expression
event either way:

| half | crescendo | n | observed rate | 95 % CI | momentary predicts | crescendo alone predicts |
| --- | --- | ---: | ---: | --- | ---: | ---: |
| bass | on | 16 | +0.048 /s | −0.005 to +0.131 | −1.075 | +0.076 |
| bass | **off** | **6** | **−0.622 /s** | **−0.936 to −0.046** | −0.979 | +0.125 |
| treble | on | 21 | +1.024 /s | +0.152 to +1.211 | −0.985 | +0.180 |
| treble | **off** | **23** | **+0.903 /s** | **+0.789 to +0.998** | −0.936 | +0.192 |

The Bass crescendo-on group is exactly what a latched crescendo alone predicts, +0.048 against
+0.076, and says nothing about the sforzando. The Bass crescendo-off group, which is the only
Bass evidence that bears on the question at all, **falls** at −0.62 with an interval clear of
zero, much nearer the momentary prediction of −0.98 than a hold. Six cases, but pointing the
other way from the published conclusion.

The second is the Discant, which still shows a rise with the crescendo cancelled and is the
last support for the latching reading. Splitting each window in half shows that it is not a
hold at all: the rate over the first half is +0.083 units/s and over the second half +1.057.
A latched valve driving towards a target would decay across the window, not accelerate. What
accelerates at the end of a window is the next excursion arriving. The window is cut 30 ms
before the line should begin responding to the next punch, using the median lead of 76 ms, but
the Discant lead scatters with an interquartile range of 132 ms on the rise onset, so on a
good fraction of these windows the next excursion has already begun inside it. The Bass
crescendo-off group behaves as settling should, −1.238 over the first half and −0.194 over the
second.

So neither half supports the latching reading once the crescendo is controlled for, and the
Discant number that appeared to is an artefact of window placement against a variable lead.

**Why the roll cannot settle it.** Under the set-and-cancel reading the sforzando latch would
be engaged for 60.7 % of the Bass roll and 59.8 % of the Discant, in 216 and 272 intervals of
median 463 ms and 291 ms. With the crescendo engaged for another 63.0 % and 56.1 %, a window
in which the sforzando is set, the crescendo is not, the line is clear of both stops, and no
other punch intrudes is very nearly unobtainable: requiring in addition that no further
sforzando pulse falls inside leaves two such windows in the Bass and one in the Discant. That
is why the episode test has so little to work with, and why the whole-roll fit is the better
instrument for this particular question.

**The punching itself argues for the momentary reading.** Of 587 Bass sforzando-on
perforations, **371, that is 63 %, arrive while the latch would already be set**. In the
Discant it is 171 of 443, or 39 %. Under a set-and-cancel reading those punches do nothing at all,
and the editor would have been cutting several hundred holes to no purpose. Under a per-pulse
reading every one of them does work. A roll punched as a chain of repeated on-pulses is
evidence about what the mechanism was expected to do with them.

**What survives.** The sforzando code carries real information about loudness either way: the
mean drawn value is 0.628 while the latch would be set against 0.459 while released in the
Bass, and 0.674 against 0.486 in the Discant. And the cancelling perforations are certainly
doing something, since a fast decrescendo follows them reliably (§2, §4). What is not
established here is whether the on-line's effect persists after its perforation has passed.
The whole-roll comparison in the emulator, which reads the sforzando as momentary at an RMSE
of 0.081 and 0.084 against 0.177 and 0.174 for the latched reading, is a far better-powered
test than anything this section can offer, and it points at the momentary reading.

## 11b. What sets the depth of a subito piano

Welte's controls 4c and 4d have a long cancelling perforation return the bellows fully and a
short one only partly, so on a regulated playback instrument the depth of a fall should follow
the length of the punch that commanded it. The alternative is that the bellows falls until
something countermands it, in which case the depth follows the interval to the next
sforzando-on and the cancelling valve is acting as a latch.

The fall is located from the drawn line alone. Its onset is the first row within 300 ms of the
punch where the line is dropping faster than 1.5 units/s, and its bottom is the lowest point
before the line has sustained a rise for 12 rows. Nothing in that refers to a punch, because
ending the fall at the next event would build the second hypothesis into the measurement.

### Neither. The depth is set by which stop the fall runs into

| | bass | treble |
| --- | ---: | ---: |
| collapses located | 213 | 250 |
| ends at the Mezzoforte hook | **69 %** | **61 %** |
| ends at the piano rail | 19 % | 28 % |
| ends at neither | 13 % | 11 % |
| spread of the bottom, hook-stopped falls | sd 0.0054 | sd 0.0072 |
| spread of the bottom, rail-stopped falls | sd 0.0062 | sd 0.0052 |

Nearly nine falls in ten end against a mechanical stop, and where they stop is reproducible to
about 0.006, three traced pixels. The depth is then simply the level the fall started from
minus the level of whichever stop it met, and there is nothing left for the punch or the
interval to decide.

### The punch-length relation is real, has the wrong sign, and is a confound

Over all collapses the depth correlates with the length of the cancelling slot at
**r = −0.244** in the Bass (95 % CI −0.349 to −0.134) and **−0.155** in the Discant (−0.306 to
−0.006). Both intervals exclude zero and both are negative, which is the opposite of what 4c
and 4d predict. Holding the starting level does not remove it, −0.254 and −0.188.

Holding the stop does. Longer cancelling punches fall more often where the hook is set,
r = +0.26 in both halves, and hook-stopped falls are shallower, 0.31 against 0.82 in the Bass
and 0.33 against 0.80 in the Discant. With the hook state held the partial correlation between
punch length and depth is **+0.006 in the Bass and +0.133 in the Discant**. The punch length
does not set the depth. What it does is co-occur with the passages where the hook is in the way.

### The interval sets it only in the eighth of cases where no stop intervenes

Of the falls ending at neither stop, 25 in the Bass and 28 in the Discant:

| | bass | treble |
| --- | ---: | ---: |
| depth against the interval to the next sforzando-on | r = +0.060 (−0.346 to +0.284) | r = +0.628 (−0.040 to +0.865) |
| the same, starting level held | +0.130 | **+0.586** |
| depth against the cancelling punch length | −0.124 | +0.077 |
| the same, starting level held | −0.236 | −0.235 |

The Discant shows a substantial interval effect and the Bass shows none, on 28 and 25 cases
with an interval that just includes zero. It is worth recording and it is not enough to carry a
claim about the apparatus. The related question, whether the bottom coincides with the next
sforzando-on, gives the same picture: 1 % and 4 % of hook-stopped falls turn at the next
on-punch, against 41 % and 14 % of those ending at neither stop.

### But the factor of four is real, and it is in the rates

The conflict with Welte's control 6c does not need the depths at all, and it should not be
argued from them, because the stops mask everything there. It is visible directly in the rates
already measured in §4, where the roll speaks plainly:

| | fast crescendo | fast decrescendo | ratio |
| --- | ---: | ---: | ---: |
| bass, sustained rate | +4.24 /s | −16.37 /s | **3.86** |
| bass, peak rate | +5.65 /s | −22.16 /s | **3.92** |
| treble, sustained rate | +3.62 /s | −14.96 /s | **4.13** |
| treble, peak rate | +5.16 /s | −22.28 /s | **4.32** |

Welte's 6c requires nine sforzando on-off pairs to hold the bellows at mezzoforte, so the two
per-pulse increments must be equal and opposite. The drawn line says the falling one is
between 3.9 and 4.3 times the rising one, on 51 and 81 clean episodes each way, measured
without reference to any model. **A model that needs the cancelling valve about four times the
stronger is not compensating for something else. It is matching an asymmetry that is in the
line.**

So the reading is that the conflict is real and belongs to the rates rather than the depths.
Whether it means the recording apparatus was regulated differently from a playback instrument
is a claim this roll supports but cannot prove: what it shows is that the machine which drew
this line did not satisfy 6c. Hagmann records that the recording apparatus is undocumented,
and nothing here says what it was, only that its two fast valves were not balanced the way the
playback regulation prescribes.

## 12. How well the trace follows the steepest edges

The fitted emulator's residual sits almost entirely in narrow spikes at the sforzando rises
and the subito-piano collapses. At those edges the line moves about 20 scale units per second,
which at 474 px to the scale unit and about 604 rows per second is roughly 16 px of lateral
movement per scan row, a stroke lying nearly across the band. The tracer charges 0.05 per
pixel of lateral movement against an ink discount of at most 1.0 per row, so a 16 px step
costs 0.8 against a saving of 1.0. Those are the same order, and the worry is that the trace
takes a cheaper, shallower path than the ink actually draws, in which case part of the
model's error would be the trace failing to follow rather than the model failing to predict.

### The penalty cannot flatten a ramp

The cost is `penalty × |Δcolumn|`, charged once per row transition and linear in the distance.
Summed along a monotone traverse from one column to another it comes to
`penalty × |total displacement|` whatever the number of rows it is spread over: moving 300 px
in five rows costs exactly what moving it in fifty does. A penalty of this form is indifferent
to how steep a monotone edge is, and cannot smooth one. What it does charge for is going out
and coming back, so if anything is clipped it is the tip of a spike, not its flanks, and the
saving from clipping a tip by d pixels is `2 × penalty × d`, which for 20 px is 2.0, or two
rows of ink discount.

### The step distribution has no ceiling

| | bass | treble |
| --- | ---: | ---: |
| witnessed row-to-row steps | 185 035 | 184 302 |
| median | 0.5 px | 0.5 px |
| 99th percentile | 10 px | 11 px |
| 99.9th percentile | 26 px | 25 px |
| maximum | **70 px** | **78 px** |
| above 8 px | 1.36 % | 1.72 % |
| above 16 px | 0.40 % | 0.38 % |

Single-row steps of 70 and 78 px occur, four to five times the 16 px the arithmetic above
worried about, and the tail decays smoothly from 6 px to 38 px with no pile-up anywhere. If
the penalty were capping lateral movement there would be a cliff, and there is none.

### Re-tracing at a lower penalty

Three windows of 2 500 rows were chosen for containing the most steep edges, at rows 29 500,
132 000 and 176 500, and re-traced at step penalties of 0.050, 0.010, 0.005 and 0.001, all
else equal. The 0.050 run is a control: it should reproduce the accepted trace, and differs
from it only in where the chunk boundaries fall. The comparison drops 300 rows at each end for
that reason. Peak rate reached, in scale units per second:

| window | half | accepted | p = 0.050 | p = 0.010 | p = 0.005 | p = 0.001 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 29 500 | bass | 24.0 | 24.0 | 22.8 | 27.2 | 27.4 |
| 29 500 | treble | 19.5 | 19.5 | 19.5 | 19.5 | 24.6 |
| 132 000 | bass | 32.7 | 32.7 | 32.7 | 32.7 | **75.9** |
| 132 000 | treble | 25.0 | 25.2 | 27.5 | 27.5 | **41.7** |
| 176 500 | bass | 25.8 | 25.8 | **33.4** | **82.5** | **92.6** |
| 176 500 | treble | 27.0 | 27.4 | 27.0 | **40.9** | **77.6** |

Down to a penalty of 0.010, a fifth of the accepted value, the steepest edges do not get
materially steeper: four of the six cases are unchanged and the other two move by 2.5 units/s.
Below that the figures run away, and the reason is visible in the paths. The 92.6 units/s in
the Bass at 176 500 is a single-row jump of 404 px, more than a third of the band in 1.7 ms,
which is not a drawn line but the path leaping to unrelated ink.

Where those runaway paths go is the point. Of the 71 rows where the p = 0.010 Bass re-trace
of that window departs from the accepted trace by more than 0.02, **all 71 are flagged
`hole`**: the paper is punched away and there is nothing to follow. At p = 0.005 it is 177 of
181. Those rows are interpolation and are excluded from every measurement in this document
already. On rows that are witnessed the departures are few: 4 to 24 rows in 1 900 per window
and half, against 1 to 7 for the control at the same penalty.

So the two effects cross at about p = 0.01. Above it nothing changes, below it the path starts
following punch edges instead of ink. The accepted 0.05 is on the safe side of that, and
buying a factor of five of headroom costs nothing.

### The floor, which is the number to stop optimising below

Disagreement between the accepted trace and each re-trace, pooled over the three windows, on
witnessed rows where the line is moving faster than 8 units/s:

| half | penalty | steep rows | median | p95 | p99 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bass | 0.050 (control) | 251 | 0.0003 | 0.0129 | 0.0258 | 0.0312 |
| bass | 0.010 | 251 | 0.0003 | 0.0201 | 0.0366 | 0.0510 |
| bass | 0.005 | 250 | 0.0003 | 0.0151 | 0.0292 | 0.0433 |
| bass | 0.001 | 250 | 0.0003 | 0.0142 | 0.0287 | 0.1908 |
| treble | 0.050 (control) | 318 | 0.0003 | 0.0114 | 0.0396 | 0.0803 |
| treble | 0.010 | 318 | 0.0004 | 0.0397 | 0.0620 | 0.0967 |
| treble | 0.005 | 318 | 0.0004 | 0.0322 | 0.0584 | 0.0967 |
| treble | 0.001 | 316 | 0.0003 | 0.0116 | 0.0289 | 0.0868 |

**The typical disagreement is 0.0003 to 0.0004 scale units, and it does not depend on the
penalty.** The scatter in the tail, a p95 of 0.011 to 0.040 and a p99 of 0.026 to 0.062, is no
larger for a re-trace at a fifth or a fiftieth of the penalty than for the control at the same
penalty, so it is the trace's own run-to-run reproducibility rather than anything the penalty
decides. In round terms the ground truth at the steepest edges is good to **0.0003 typically
and about 0.03 at the ninety-ninth percentile**.

Set against a fitted residual of 0.044 and 0.060 with spikes to ±0.3, the trace is not the
limiting factor. The spikes are an order of magnitude above the trace's own scatter even at
its p99. **The residual at the steep edges is the model's**, with the qualification that
chasing it below about 0.03 at those particular rows would be chasing the trace.

`figures/steep/` holds twelve crops of the scan at the steepest edges, two per window and
half, with the accepted trace in cyan and the p = 0.010 re-trace in yellow drawn over the
original pixels. Where only one colour is visible the two coincide.

## 13. The offset control by control, and what its scatter costs

Section 7 measured the offset between the drawn line and its punches from sforzando-off
collapses, the sharpest feature on the roll. A model that applies one offset per half is
assuming that the rest of the codes sit the same way and that the event-to-event scatter is
irreducible. Neither turns out to be true.

### Locating a feature consistently across controls

A definition tied to a fixed rate threshold would place a gentle feature later than a sharp
one for reasons of sharpness alone. What is used here instead is the **half-maximum onset**:
find the extremum of the rate within 250 ms of the punch, then walk back to where the rate
last stood at half of it. Events with no extremum of the right sign above a floor are declined
rather than forced. The offset is the punch time minus that onset, so a positive number means
the line moves first.

| half | control | tracker column | n | median offset | 95 % CI | IQR | median peak rate |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| bass | sforzando off | 304 px | 224 | **97.4 ms** | 96.1 to 99.1 | 12.9 | 16.5 /s |
| bass | sforzando on | 342 px | 450 | **103.2 ms** | 100.7 to 105.8 | 122.0 | 5.3 /s |
| bass | crescendo off | 229 px | 145 | 70.1 ms | 64.3 to 75.9 | 60.4 | 1.1 /s |
| bass | crescendo on | 266 px | 131 | 51.4 ms | 47.4 to 53.5 | 89.6 | 0.6 /s |
| bass | mezzoforte on | 191 px | 11 | −42.5 ms | −54.9 to −27.7 | 22.7 | 16.9 /s |
| bass | mezzoforte off | 153 px | 9 | −65.9 ms | −116.9 to −47.0 | 22.4 | 19.7 /s |
| treble | sforzando off | 3 738 px | 270 | **63.4 ms** | 62.3 to 65.5 | 21.8 | 16.8 /s |
| treble | sforzando on | 3 701 px | 372 | **74.1 ms** | 70.7 to 76.4 | 39.5 | 5.0 /s |
| treble | crescendo off | 3 814 px | 136 | 44.0 ms | 38.6 to 55.4 | 96.9 | 1.1 /s |
| treble | crescendo on | 3 776 px | 119 | 19.6 ms | 9.9 to 26.5 | 125.4 | 2.5 /s |
| treble | mezzoforte on | 3 852 px | 11 | −77.7 ms | −93.0 to −53.2 | 33.2 | 15.9 /s |
| treble | mezzoforte off | 3 889 px | 10 | −63.7 ms | −73.7 to −52.5 | 17.8 | 19.8 /s |

Two rows should be struck before anything is read into them. The Mezzoforte codes have no
feature of their own on this roll (§2): what the locator finds near them is the co-located
sforzando-off collapse, which arrives after the M.F. punch, and that is why those offsets come
out negative. They are not measurements of the hook.

**The medians differ by far more than their intervals**, by 52 ms across the Bass controls and
55 ms across the Discant. How much of that is real and how much is the definition needs saying.
A half-maximum onset on a gradual feature falls later relative to the true start of motion than
on a sharp one, which biases the crescendo offsets downward, and the crescendo peak rates here
are fifteen to thirty times smaller than the sforzando ones. The comparison that is safe is
sforzando-on against sforzando-off, both of them sharp: the on-code sits **5.8 ms later in the
Bass and 10.7 ms later in the Discant**, with intervals that do not overlap. Even that pair
differs threefold in peak rate, so the crescendo figures should be treated as showing that a
difference exists rather than as measuring its size.

### It is not a skew of the sheet

The six expression lines of a half sit 37.76 px apart, spanning 189 px, while the drawn line
sits 1 400 to 1 700 px away across the paper. If the sheet ran through the drawing and punching
stages at a skew, the offset would rise linearly with the lateral separation between the drawn
line and the punched one. Regressing the four well-measured controls of each half on that
separation:

| | slope | residual sd |
| --- | ---: | ---: |
| bass alone | +0.227 rows/px | 7.8 rows |
| treble alone | −0.209 rows/px | 8.4 rows |
| both halves together | −0.006 rows/px | 12.3 rows |

**The two halves give slopes of opposite sign**, which no single skew can do. The combined
figure is not evidence either: with the two halves 3 500 px apart and only their means to work
with, a slope and an intercept fit two points exactly. A skew large enough to account for the
20-row difference between the halves would move the offset by **1.1 rows, about 1.8 ms, across
the six lines of a half**, against an observed within-half spread of 30 rows. The differences
are per-control and not per-column, and a skew of the implied size is unmeasurable here.

### What the scatter within one control is made of

Taking the sforzando-off collapses, where the feature is sharpest and there are 221 and 265
usable events:

| | bass | treble |
| --- | ---: | ---: |
| median offset | 97.4 ms | 63.4 ms |
| interquartile range | 12.9 ms | 21.5 ms |
| robust scale (MAD-based sd) | 9.35 ms | 14.12 ms |
| correlation with position along the roll | −0.269 | −0.388 |
| correlation with the level at the event | +0.178 | +0.437 |
| correlation with the speed of the collapse | −0.145 | −0.273 |
| variance explained by the three together | 10.5 % | 36.7 % |
| **residual sd after removing them** | **4.57 ms** | **5.02 ms** |
| the same, in scan rows | 2.69 | 2.95 |

The residual is quoted after dropping the badly located tail, 4.5 % and 2.3 % of events, which
inflates the raw standard deviation to 29 and 27 ms while leaving the interquartile range
untouched. All three predictors are known to a model at run time or are its own output, so
none of this is out of reach.

### The floor

For each witnessed row, the local slope of the drawn line times the timing scatter gives the
position error a perfectly correct model would still incur. Squared, averaged over the roll and
square-rooted:

| half | scatter used | implied RMSE | of which from rows above 8 units/s |
| --- | ---: | ---: | ---: |
| bass | 9.35 ms, one offset per half | **0.022** | 0.018 |
| bass | 4.57 ms, systematics modelled | **0.011** | 0.009 |
| treble | 14.12 ms, one offset per half | **0.036** | 0.031 |
| treble | 5.02 ms, systematics modelled | **0.013** | 0.011 |

Between 80 and 84 % of it comes from the 1.9 % and 2.3 % of rows moving faster than 8 units/s,
which is where the model's residual sits. Set against a held-out 0.044 and 0.060, the
one-offset floor accounts for a quarter of the Bass error in variance terms and a third of the
Discant's. That is short of the 0.026 the floor was feared to be in the Bass, and close to it
in the Discant.

There is a second cost that the floor above does not include. A model with one offset per half
also mis-places the crescendo codes relative to the sforzando ones by something of the order of
30 to 45 ms. Those features are gentle, so the error per row is small, but they cover most of
the roll: an error of 45 ms applied to the 88 % and 84 % of rows moving slower than 2 units/s
would add **0.021 and 0.023** on its own.

So the timing budget divides into three parts, and two of them are addressable. Per-control
offsets are worth about 0.021 to 0.023 and are the cheapest thing to fix. Modelling the three
systematic terms within a control roughly halves the steep-edge floor, from 0.022 and 0.036 to
0.011 and 0.013. What is left below that, **0.011 in the Bass and 0.013 in the Discant**, is
placement scatter with no structure this roll can find, and is the number to stop at.

## 14. Where the model's error sits, and how far it can go

Everything above measures the line. This section measures the *residual*, and it is included
here because most of what it finds is a property of the roll rather than of any model.

**Sightings stranded in unreadable stretches.** Splitting the squared error by time since the
most recent expression code tripped, the worst band on the roll was rows more than two seconds
after any code: rmse 0.098 (Bass) and 0.116 (Discant), two to four times any other band. They
turn out to be the lead-in and the run-out. Past the last code the flags run 54 % `gap` and
17 % `rule`, and the rows still marked `ink` or `faint` are scattered isolated dots spread over
0.3 scale units with no line between them. At 2 % of the scored rows they carried 8 % and 13 %
of the squared error. Requiring a sighting's own neighbourhood to be mostly readable removes
them; the score on the performance proper is unchanged, 0.0393 in the Bass either way, which
is the check that this removes artefact and does not move the yardstick.

**Per-row tracing noise.** White noise of standard deviation s makes a second difference have
variance 6s², and real travel contributes only a·dt², four orders of magnitude smaller at
1.7 ms. So the second difference of the traced line estimates its own noise:

| speed band | rows | trace noise | residual rmse |
| --- | ---: | ---: | ---: |
| still | 35 635 | 0.0009 | 0.0333 |
| moving | 120 881 | 0.0012 | 0.0345 |
| fast | 20 373 | 0.0026 | 0.0597 |
| very fast | 6 244 | 0.0089 | 0.0635 |

Bass; the Discant is the same within a factor of 1.5. Per-row noise is therefore not what
limits a model here. It says nothing about systematic trace error, which is the larger worry.

**What the mechanism's own repeatability allows.** Sforzando-on events were grouped by
starting level (to 0.1), crescendo and Mezzoforte state, and punch length (to 40 ms), and the
spread of the drawn response *between* alike events measured against the model's error on the
same events:

| lag | spread between alike events | model's error |
| ---: | ---: | ---: |
| 30 ms | 0.013 / 0.010 | 0.029 / 0.027 |
| 60 ms | 0.030 / 0.015 | 0.044 / 0.047 |
| 100 ms | 0.031 / 0.021 | 0.042 / 0.052 |
| 150 ms | 0.020 / 0.017 | 0.056 / 0.056 |

Bass / Discant, from 16 and 18 groups of three or more. Beyond 150 ms the grouping stops
controlling anything, because later codes have arrived, and the apparent spread of 0.07 to
0.13 is not a floor. Within the window that is controlled the model sits two to three times
above the roll's own repeatability, so there is real headroom, and below roughly 0.02 the roll
cannot distinguish one model from another. The grouping is coarse, so 0.02 is an upper bound
on the floor rather than the floor.

**The residual is not a simple missing term.** Regressing it on model velocity, acceleration,
level, distance below the forte stop, note density, time since the last trip and |velocity|,
all standardised, explains 1.1 % of its variance in the Bass and 1.6 % in the Discant. No
damping term, no inertia term, no level-dependent gain and no wind-load term is waiting to be
added. Note density in particular is flat: where the line rests at the fortissimo rail, its
level correlates with note density at r = 0.06 and 0.17 across 80 and 61 rest stretches.

**Where it does sit.** Two thirds of the error is within 250 ms of a code tripping, and it
decays with time since the trip (Bass rmse 0.0445 under 100 ms, 0.0246 at 0.5 to 1 s). Among
stretches where the line is still for 0.25 s or more:

| | bass | treble |
| --- | ---: | ---: |
| at a rail | n=85, rmse 0.032, 7.4 % of error | n=67, rmse 0.047, 11.5 % |
| hook set, off the rails | n=126, rmse 0.017, 3.0 % | n=122, rmse 0.024, 3.0 % |
| hook cancelled, off rails | n=19, rmse 0.040, 2.6 % | n=16, rmse 0.048, 1.5 % |

With the faces set from measurement the hook is the best-modelled state on the roll, and the
rails the worst. The rail level does drift along the roll, r = −0.36 (Bass) and +0.63
(Discant), but the signs are opposite and adding a linear level drift makes the held-out score
worse in the Bass, 0.0390 against 0.0386, and does nothing in the Discant. So the correlation
is not a scale drift.

**The model's collapses are almost all correct.** A sforzando cancel from high up sometimes
takes the model all the way to the piano rail, which looked like the model's most conspicuous
failure. It is not. Of cancels starting above 0.85 the model runs to the floor on 16 of 121
(Bass) and 18 of 164 (Discant), and in all 16 and in 17 of the 18 the drawn line goes to the
floor as well, stopping at 0.02 to 0.07. Where the model does not collapse, the Mezzoforte
latch is set in 99 to 100 % of cases and the line stops within 0.05 of the measured face. So
the hook accounts for the arrested falls and the model has that right.

What is left is one Discant cancel, at 145.0 s, where the line falls from 0.924 and stops near
0.60 with no hook latched and no code active. With its neighbour at 143.9 s it is the largest
single block of error on the roll; one episode at 144.2 s carries 7.3 % of the total squared
error. Instrumenting the model through it shows the reopening assist reaching a drive of
-23.1 against the crescendo conduit's +0.03 to +0.39, so no plausible crescendo rate could
arrest a cancel here, and the drawn line's own fall decelerates smoothly as though toward a
floor near 0.6 rather than meeting a barrier. What arrests it is not known.

**Four structural variants, all refuted.** The height the drawn line reaches on a rise does
not follow how long the sforzando punch is, r = −0.28 (Bass) and −0.00 (Discant), while the
model's height does, r = +0.36 and +0.42, and the drawn peak's spread across rises is 0.011
and 0.013 against the model's 0.023. The line goes to the fortissimo rail whatever the punch,
because a rail is what stops it, and it is the rising-side mirror of §11b.

Two cautions on reading that as a defect. The comparison is conditional: these rises were
selected by requiring the drawn line to reach 0.88, so its peak is bounded below by the
selection and above by the rail, and the model is merely scored on the same events. And the
Bass figure of −0.28 is a negative correlation rather than a null, most likely the same
confound §11b found on the falling side, that longer punches start where the line is already
high. The safe statement is that the height reached carries no positive information about
punch length in either half, and that the model's height does because it does not always reach
the rail. Whether that is a fault in the valve law or in what stops the excursion is exactly
what the repairs below test. Four were tried, each scored against the published fit at 0.0392
(Bass) and 0.0521 (Discant) overall:

| variant | bass overall | treble overall | mean rise deficit, bass / treble |
| --- | ---: | ---: | ---: |
| as fitted, graded opening | 0.0392 | 0.0521 | +0.0128 / +0.0067 |
| the sforzando latches | 0.2703 | 0.2541 | +0.0102 / +0.0029 |
| `sforzandoRate` × 2 | 0.1079 | 0.1433 | +0.0102 / +0.0029 |
| snap-action valve, releases 50 % below trip | 0.1154 | 0.1470 | +0.0102 / +0.0029 |
| static friction in the linkage, 0.05 | 0.0398 | 0.0554 | — |

*These were all run at fixed constants, and that is now known to be the wrong test.* Every
figure in the table changes one thing and leaves the other twenty-four where the published fit
put them. A term whose value only pays once the drive is reshaped around it cannot show up that
way, and on this model the compensating moves are large: refitting around a narrowed valve band
halves `sforzandoRate` while `sforzandoTarget` moves from 2.08 to 2.82, so the drive changes
shape rather than scale, and no impulse-neutral rescaling reaches that basin. Seeding the band
at a quarter of its width and letting a coordinate sweep refit everything else still lands at
0.0404, worse than sweeping the published fit, because a local sweep cannot travel that far
either. Two of the variants below were subsequently refit properly by other means and both
improve on the published fit; what follows should be read as showing what these terms do *at
the published constants*, which is not what they are worth.

The first three all drive the rise deficit down to the same floor and cost three to five times
the overall error, because each makes *every* rise reach further, not only the short-punched
ones that fall short. The floor itself is the point: 0.0102 and 0.0029 of the deficit survives
unlimited drive, because the drawn peak lies above the model's rail. Static friction, a dead
band below which the net drive moves nothing, is the only one that does not hurt, and it helps
by 0.0001 to 0.0002 on held-out blocks, consistently in sign across both halves and at the
rail. That is inside the ±0.002 spread across search seeds, so the roll does not support it
without a refit that lets it trade against everything else.

**The line falls twice as fast as the model can.** Taking the speed over a six-row window
wherever the trace is continuous:

| units per second | p50 | p90 | p99 | p99.9 | max |
| --- | ---: | ---: | ---: | ---: | ---: |
| drawn, falling (Bass) | 0.21 | 1.68 | 15.95 | 22.14 | **32.87** |
| model, falling (Bass) | 0.37 | 3.53 | 14.90 | 16.08 | 16.66 |
| drawn, falling (Discant) | 0.22 | 2.02 | 16.82 | 22.45 | **30.18** |
| model, falling (Discant) | 0.52 | 8.39 | 14.29 | 15.35 | 15.82 |

The model's twelve fastest falls are 16.7, 16.6, 16.6, 16.6, 16.5 … a hard ceiling set by its
own reopening drive. The line's are 32.9, 32.0, 29.8, 29.2, 27.4 …, spread smoothly, with no
ceiling. This is not the pen failing to follow, which was the obvious reading: the pen achieves
twice what the model does. Taken with the cancel census above, where the model's collapses go
too deep, the real cancel is a briefer and more violent dump than the model's, and the model
compensates for a rate it cannot reach by staying open longer. Giving the cancelling valve its
own bleed, which Welte's separate bores 20 and 29 would permit, does not repair it at the
published constants: over a grid of tail constants from 8 to 40 ms and assist rates up to three
times, nothing beats the shared tail on held-out blocks, and the variant that does reproduce
the observed peak speed costs 0.011. That grid also had the wrong parameter under it. The
ceiling is not the cancelling valve, which opens fully — the peak of the cancelling term has a
median of 0.999 and 0.970 and 219 of 219 Bass episodes exceed 0.9 — and the drive available at
x = 0.90 is 22.9 and 30.5 units/s against the 16.5 and 16.0 actually reached. It is `inertiaMs`
at 33.3 and 38.5 ms: the velocity relaxes towards the flow-driven velocity with that time
constant, and a collapse whose median duration §3 puts at 33 ms never gets there. Removing the
inertia takes the Bass ceiling to 23.4, which is the 22.9 the drive was already offering, at a
cost of 0.22 in overall rmse.

**The error is concentrated in a handful of windows.** Four windows in each half, 1.2 % and
1.8 % of the scored rows, carry **25.8 %** and **36.1 %** of the squared error; without them
the whole-roll figures fall from 0.0392 to 0.0340 and from 0.0521 to 0.0421. One bass stretch
of 378 rows at 273.4–274.0 s carries 16.3 % of the Bass roll on its own, and one Discant
episode at 144.2 s carries 7.3 % of its roll.

**There is no population of holds at arbitrary levels.** This began as the most conspicuous
qualitative failure: the line descends part-way and stops while the model runs on. Inventoried,
it is 17 episodes a half, 5.5 % and 2.4 % of squared error, and the levels are not arbitrary.
Of the intermediate rows 4581 of 5303 (Bass) and 1967 of 3121 (Discant) lie between 0.70 and
0.85, which is the crescendo's own asymptote, measured at 0.766 and 1.154 in §4. Demanding a
contiguous stretch of 0.15 s, still to 0.03 units/s, under a latched crescendo alone, clear of
both rails and 300 ms clear of any sforzando port, leaves eight stretches in the Bass and one
in the Discant. Three windows that looked like one phenomenon are three: 197.5 s is a
rise-amplitude error against that asymptote and not an arrest at all, 278.2 s a fall the model
overshoots, and only 272.8 s a genuinely arrested fall.

Over the whole population of cancels the model is right: the ratio of drawn to model peak fall
rate has a median of 1.10 and 1.22 and a 10th-to-90th range of 0.88–1.55 and 1.06–1.65, and
only 2 Bass and 4 Discant cancels fall at less than half the model's rate. Two of those matter,
at 273.54 and 144.98 s, and neither is a trace artefact: at 273.5 the printed M.F. gridline
sits at x = 1905–1909 in every row and the drawn ink is a separate group at 1920–1932.

**Two cancels the code cannot account for.** The two events that dominate what is left,
273.54 s (Bass) and 144.98 s (Discant), have entirely ordinary perforations: both ports open
fully, as every sforzando-off port on the roll does, with an open area of 80 ms against a
population median of 82 and 80, at the 42nd and 53rd percentile, and a length of 105 ms. The
code does not distinguish them from the cancels the model gets right.

Nor is the mechanism generally variable. Taking cancels alike in everything the code records —
punch length 80 to 130 ms, starting above 0.85, hook released — the Bass gives 17 events whose
peak fall rate runs from 18.0 to 27.2 units/s between the 5th and 95th percentiles and whose
depth runs from 0.82 to 0.88, a tight distribution. The Discant gives seven, of which **six
fall 0.92 to 0.93 at 20.7 to 22.7 units/s and one, at 145.0 s, falls 0.34 at 7.2 units/s**.

So the same punch, in the same state, produced a quite different result once. The trace is not
the explanation: at 273.5 the printed gridline sits at x = 1905–1909 in every row and the drawn
ink is a separate group at 1920–1932. Whatever happened there was in the mechanism or on the
paper, and nothing in the punched code records it. Four windows a half of this kind carry a
quarter and a third of the squared error, so a model driven by the code alone cannot be scored
below about 0.034 and 0.042 on this roll however good it is.

**Three parameterisations of one deficiency, and one real second effect.** Four terms were
proposed for the residual above and refitted against a common baseline and budget, seventeen
constants moving with each. Held-out rmse:

| | bass | treble |
| --- | ---: | ---: |
| baseline | 0.0365 | 0.0476 |
| a dead band in the drive | 0.0340 | 0.0436 |
| a narrowed valve lift band | 0.0338 | 0.0428 |
| a through-flow load on the blower | 0.0339 | 0.0450 |
| **valve band and through-flow together** | **0.0312** | **0.0401** |
| all three | 0.0312 | 0.0391 |
| a grip at the closed rail | 0.0364 | 0.0455 |

Alone the first three buy nearly the same thing, which is what three descriptions of one
deficiency look like. The valve band and the through-flow load add to each other, 0.0338 and
0.0339 apart against 0.0312 together, so those two are separate effects. The dead band adds
0.0000 (Bass) and 0.0010 (Discant) once the pair is there, and the rail grip buys nothing in
the Bass and collapses to 0.018 whenever the dead band is free, so it is the same effect
confined to the rail.

Two cautions on the numbers. They come from one search protocol with the pin faces free, so
they are comparable within the table and not against the headline fit. And the valve band there
is the shared form, one band serving both relay valves, which is separately shown to wreck the
cancel: with the bands separate the pair should gain more and the dead band be more redundant,
not less.

**One interaction the pooled averages concealed.** §2's event-triggered averages put the model
0.013 too high 150 ms after a sforzando-on in the Bass, which looks like a small rate error.
Split by whether the crescendo latch was set at the trip, it is not:

| lag | crescendo off | crescendo on |
| ---: | ---: | ---: |
| 50 ms | +0.010 / −0.002 | −0.015 / −0.034 |
| 100 ms | +0.037 / +0.018 | −0.003 / −0.020 |
| 150 ms | +0.055 / +0.041 | −0.007 / −0.007 |
| 200 ms | +0.019 / −0.001 | −0.010 / −0.008 |

Bass / Discant, model minus drawn. With the crescendo off the model over-drives the sforzando
by about a quarter of its excursion; with it on the model is close to right. The pooled figure
is the weighted mean of the two. Which of the two constants is wrong is not settled here.
The model's absolute error 100 ms after a sforzando-on also correlates with the level the line
started from, r = −0.50 and −0.52, worst from low down. Punch length, note density, the gap
since the previous sforzando and position along the roll all sit under |r| = 0.22.

## Limitations

- One roll, and one performance. Nothing here shows that the constants transfer to another
  Welte roll, another instrument, or another take.
- Bass and Discant disagree on several numbers that ought to match if the two halves share
  a mechanism: the F stop (0.912 against 0.952), the hook level (0.576 against 0.617), the
  lead (109 ms against 76 ms), and the fast crescendo plateau (4.24 against 3.62 units/s).
  Some of that may be calibration, since the two halves share the central F.F. gridline and
  a systematic error there moves both scales in opposite directions. Some may be real.
  This has not been separated.
- The slow decrescendo rests on about 1 % of the roll, and the fast crescendo with the
  crescendo latch off on nine and fifteen episodes. Those are the two thinnest numbers here.
- The lead is measured from the sforzando-off collapse, which is the sharpest feature
  available. Whether it applies equally to the crescendo and Mezzoforte codes is only
  weakly supported, by the state scan, which cannot resolve a difference of a few tens of
  milliseconds between the latches.
- The additive-conductance comparison rests on 9 and 15 crescendo-off episodes, and is
  carried by the size of the effect rather than by the number of cases.
- The sforzando latching test failed for want of clean windows, and an earlier conclusion
  drawn from it has been withdrawn (§11). Expression states on this roll overlap so heavily
  that isolating one of them episode by episode is often not possible, and a whole-roll fit
  is the better instrument for questions of that shape.
- The co-occurrence test says only that the coupling is absent from the punching. It says
  nothing about whether the relay performs it, which this roll cannot show.
- Whether the Mezzoforte pin blocks travel in one direction or both is likewise undecidable
  here, because the hook is only ever engaged from the fortissimo stop (§6). For the same
  reason only one face of the pin is ever visited, so the pin's extent, and with it the
  position of its centre against the printed gridline, cannot be measured from this roll.
- The two slow states survive only 35 to 44 distinct seconds of the roll once the rails, the
  hook and the settling time are excluded, which is too little for a block bootstrap to be
  trusted. Every slow-state figure in §8 should be read with that in mind.
- The steep-edge check re-traced three windows of 2 500 rows, not the whole roll, and its
  floor of 0.0003 typically and 0.03 at the p99 is measured on 251 and 318 steep witnessed
  rows (§12).
- The per-control offsets in §13 rest on a half-maximum onset, which falls later on a gentle
  feature than on a sharp one. The sforzando pair can be compared safely, while the crescendo
  figures show only that a difference exists, without measuring its size reliably.
- Whether the piano and forte stops are compliant cannot be tested here, because the line
  never reaches either of them faster than 10 units/s while the hook is always struck at 14
  to 24 (§6b).
- The note-locked null in §8b rests on 71 and 86 attacks, which is what requiring the bellows
  to be provably still costs, and it bounds what reached the paper rather than what the
  delivered vacuum did, since the pen linkage's own inertia is not known.
- The depth of a subito piano is set by which stop the fall meets in about nine cases in ten,
  so this roll can say very little about what would set it if no stop intervened: that rests
  on 25 and 28 falls (§11b).
- No attempt is made here to model the line. Everything above is measurement.
