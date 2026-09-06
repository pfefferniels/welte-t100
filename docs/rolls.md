# What six rolls say about the constants

Six SUPRA rolls carry drawn Handnuancierung lines and have been traced. Each was fitted
separately with the `pneumatic` model, two seeds, 320 generations, the robust loss, identical
code. This document reads the result. The tables it argues from are in `docs/rolls-round1.md`
and `docs/rolls-round1.json`, produced by `src/cli/compare.ts`. Nothing here is generated, and
every number quoted was recomputed from the JSON rather than copied from the Markdown (§8).

The question is Niels' rather than the model's. If different machines drew the lines on
different rolls, then a constant fitted on one roll is a property of that machine and not of the
Welte mechanism, and the constants have to be fitted per roll before they are compared at all.
Gottschewski's finding gives the same warning from the other side: the instruments that drew the
lines were out of regulation, the length of the mezzoforte-to-pianissimo process differing from
roll to roll by more than paper speed explains and sometimes between the two halves of one roll,
"which should not happen" (2024, 14:21–15:17), so he normalises the lines to a default setting
derived from several emulations before using them (15:27).

## 1. The six rolls

| Welte | druid | performer, title | scan rows | observed bass / treble |
| --- | --- | --- | ---: | ---: |
| 1348 | jn038xx9588 | Felix Mottl, Wagner, *Lohengrin* | 212 390 | 86.4 % / 93.7 % |
| 1474 | ns598kr8616 | Olga Samaroff, Liszt, Tannhäuser march | 381 304 | 94.2 % / 94.8 % |
| 1478 | ym773gh2267 | Olga Samaroff, Grieg, concerto in A minor | 442 749 | 97.3 % / 96.8 % |
| 2739 | ws250sr1272 | Claude Debussy, *Préludes* | 144 882 | 72.7 % / 51.7 % |
| 3309 | jq774vx6544 | Wilhelm Backhaus, Schubert, *Militärmarsch* | 198 630 | 93.3 % / 93.0 % |
| 3357 | kw215gn3365 | Hubert Flohr, Raff, *Cachoucha* | 252 498 | 95.9 % / 91.1 % |

Performers and titles as the SUPRA index records them.

"Observed" is the share of scan rows whose value the fit was allowed to see, which is where the
tracer found ink or faint ink. Rows flagged as rule, hole or gap are masked. The shares are those
of the round-1 traces the fits ran on. A second tracing round has since raised them on seven of
the twelve halves and been fitted, which §10 compares.

Three caveats travel with the traces. On 2739 the drawing is faint, and the low treble share is
partly genuine rest on the P.P. rule rather than a failure of the tracer, which round-2 overlays
confirm. On 3357 the strokes are about 15 px wide with a dark edge on the soft side, and the
tracer rides that edge, so 3357's absolute levels may sit a few hundredths of a scale unit away
from a centre-of-stroke reading, consistently within the roll. The two Samaroff rolls are the
best witnessed of the six.

## 2. Fit quality, and what two seeds decide

Held-out agreement on the alternating blocks the fit never saw.

| Welte | RMSE bass | RMSE treble | MAE bass | MAE treble | r bass | r treble | bias bass | bias treble | seed spread |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1348 | 0.0293 | 0.0372 | 0.0205 | 0.0262 | 0.982 | 0.977 | −0.0036 | −0.0077 | 0.0003 |
| 1474 | 0.0230 | 0.0438 | 0.0177 | 0.0246 | 0.997 | 0.989 | +0.0010 | −0.0033 | 0.0001 |
| 1478 | 0.0204 | 0.0528 | 0.0126 | 0.0214 | 0.997 | 0.982 | −0.0002 | +0.0054 | 0.0017 |
| 2739 | 0.0247 | 0.0315 | 0.0161 | 0.0205 | 0.993 | 0.991 | −0.0032 | +0.0015 | 0.0012 |
| 3309 | 0.0284 | 0.0365 | 0.0182 | 0.0204 | 0.994 | 0.991 | −0.0063 | −0.0025 | 0.0009 |
| 3357 | 0.0296 | 0.0168 | 0.0178 | 0.0113 | 0.994 | 0.998 | −0.0032 | −0.0005 | 0.0071 |

The seed-spread column is the difference between the two seeds in the two held-out RMSE added
together. Every roll fits about as well as 3309 did, held-out RMSE between 0.017 and 0.053 of the
printed scale on a scale whose rails are roughly 0.02 and 0.90, with correlation 0.977 and above
throughout. Bias per half stays under 0.008 everywhere. So the model carries five rolls it was
not built on about as well as the one it was built on, which is the first thing worth saying and
does not depend on any of the comparisons below.

The seed spread is the yardstick everything else has to be held against, and it is not small in
the place it matters. On 3309 the two seeds score within 0.0009 of each other in summed held-out
RMSE and yet settle on `alpha` 1.314 against 1.429 in the bass and on `releaseTarget` −0.231
against −0.379. On 3357 the two seeds differ by 0.0071, which is larger than the difference
between several rolls' fits, and its treble `alpha` comes out 0.733 against 1.366. A parameter
that moves that far at equal score is not decided by the roll, and a difference between two rolls
smaller than that is a difference between runs.

The two constants concerned are close to degenerate. Over all 24 half-fits, two seeds by two
halves by six rolls, `alpha` and `releaseTarget` correlate at r = −0.895. A low exponent with an
asymptote near the open rail and a high exponent with an asymptote well below it describe nearly
the same decay over the range the line actually occupies. Neither is separately determined, and
their cross-roll differences should be read as one quantity and not two.

A note on a figure that has circulated in this mission. The values `alpha` 1.52 and
`releaseTarget` −0.46 for 3309 come from `docs/fit-pneumatic.published.json`, the older published
fit, which does not reproduce under the present code. Neither refit seed gives them. The range
the two refit seeds actually span in the bass is 1.314 to 1.429 and −0.231 to −0.379.

## 3. The parameters, by what they should belong to

### 3.1 Mechanism

These should be the same on every roll if one kind of machine drew them all: the flow exponent,
the four conductances, the valve timings and band, the through-flow load and the sforzando
asymptote.

None of them agrees across the six rolls within the seed spread, and for most of them the
disagreement is larger than any seed spread on any roll.

| parameter | bass range | largest seed spread | treble range | largest seed spread |
| --- | --- | ---: | --- | ---: |
| `alpha` | 0.588 to 1.434 | 0.195 | 0.587 to 1.366 | 0.633 |
| `sforzandoTarget` | 1.22 to 2.86 | 0.488 | 1.63 to 2.99 | 0.671 |
| `sforzandoRate` | 1.05 to 4.12 | 1.45 | 0.81 to 5.25 | 6.72 |
| `crescendoRate` | 0.648 to 1.296 | 0.222 | 0.233 to 0.868 | 0.308 |
| `releaseRate` | 0.496 to 0.928 | 0.383 | 0.459 to 0.809 | 0.289 |
| `throughFlowLoad` | 0.069 to 0.547 | 0.060 | 0.000 to 0.661 | 0.044 |
| `valveBand` | 0.016 to 0.743 | 0.604 | 0.027 to 0.863 | 0.508 |

Two readings are possible and the fits cannot separate them. Either the machines differ, or the
model has more freedom than six rolls can pin down and the search is filling it differently each
time. The second reading has direct support: `sforzandoRate` in the treble has a cross-roll range
of 4.44 and a seed spread on one roll of 6.72, so that parameter is undecided within a roll
before any roll is compared with another. The same holds for the four valve timings
(`membraneFillMs`, `assistFillMs`, `valveTailMs`, `inertiaMs`), where the seed spread is of the
order of the cross-roll range in every case. Nothing should be concluded from those five.

`throughFlowLoad` is the one mechanism constant whose cross-roll differences clear the seed
spread by a wide margin in both halves. 1348 wants 0.55 in the bass and 0.66 in the treble
against 0.07 to 0.25 everywhere else, and the seeds agree with each other to within 0.06. That is
a real difference between the fits. Whether it is a difference between machines or the term
absorbing something else about a roll whose measurement is thin (1348 records no hook arrivals at
all, §3.2) cannot be told from here.

`alpha` clusters loosely. 3309, 3357 and 1478 sit near or above 1 in at least one half, 2739 and
1348 sit near 0.6 in both. Given the degeneracy with `releaseTarget` and 3357's treble spread of
0.633, the cluster is weaker than it looks, and the two rolls at the bottom are the two whose
traces are the least complete and the faintest respectively.

### 3.2 Regulation of the instrument

`mezzoforte`, `crescendoTarget` and `releaseTarget` are where the instrument was set rather than
how it was built. This is the group Gottschewski's claim bears on directly.

The fitted `mezzoforte` should not be used for the comparison. It lies above the measured hook
face on all ten halves where a measurement exists, median +0.085 of the printed scale, and on two
rolls it rests on its own upper bound of 0.75 in both seeds (2739 treble at 0.7499, 1348 treble
at 0.7498). A value against a wall is set by the wall.

The measurement is the better witness, and it is not a fit. The hook face read off the drawn line
itself, for the four rolls that clear the 20-arrival threshold:

| Welte | bass face | arrivals | sd | treble face | arrivals | sd |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1474 | 0.524 | 111 | 0.040 | 0.590 | 126 | 0.029 |
| 1478 | 0.557 | 87 | 0.009 | 0.533 | 136 | 0.009 |
| 3309 | 0.575 | 151 | 0.009 | 0.617 | 112 | 0.008 |
| 3357 | 0.627 | 45 | 0.013 | 0.539 | 39 | 0.025 |

The four faces span 0.103 of the printed scale in the bass and 0.084 in the treble, against a
within-roll scatter of 0.008 to 0.040. That is the clearest evidence in this material that the
instruments were set differently, and it rests on counted arrivals rather than on a search. Two
reservations belong with it. 3357's treble face of 0.539 sits about 0.03 above the printed M.F.
gridline and rests on three plateaus inside one hold, which is the artefact the documentation
rules out for 3309 by three separate tests and has not ruled out elsewhere. And the measurement's
plateau band is fixed at 0.45 to 0.78, so an instrument regulated far outside that would report
no arrivals rather than a wrong number. 2739 (5 and 8 arrivals) and 1348 (none at all) fall below
the threshold and are absent from the table for that reason.

`crescendoTarget` is decided per roll in the bass, ranging 0.712 to 0.871 with a seed spread of
at most 0.024. All six sit short of the fortissimo rail, which is what the mechanism requires and
what the Leseregeln state. In the treble the range is 0.738 to 0.927 once 2739 is set aside. 2739's
treble fit puts the asymptote at 1.969, above its own closed rail, with a seed spread of 0.78,
so that cell says nothing.

`releaseTarget` cannot be read on its own, for the reason given in §2.

### 3.3 Drawing apparatus

The two rails and the lead are measured off each roll, and they differ between rolls by far more
than the measurement's own scatter.

| Welte | bass rails | span | treble rails | span | lead bass | lead treble |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| 1348 | 0.0225 to 0.8975 | 0.875 | 0.0325 to 0.8875 | 0.855 | −79 | −85 |
| 1474 | 0.0325 to 0.9225 | 0.890 | 0.0875 to 0.9225 | 0.835 | −61 | −44 |
| 1478 | 0.0425 to 0.8925 | 0.850 | 0.0325 to 0.8625 | 0.830 | −60 | −46 |
| 2739 | 0.0225 to 0.8025 | 0.780 | 0.0225 to 0.8575 | 0.835 | −41 | −60.5 |
| 3309 | 0.0175 to 0.9125 | 0.895 | 0.0225 to 0.9525 | 0.930 | −65 | −46 |
| 3357 | 0.0475 to 0.8675 | 0.820 | 0.0375 to 0.8725 | 0.835 | −63 | −19 |

The lead spans 66 scan rows across the six rolls against a within-roll interquartile range of 3
to 9.5 rows over 32 to 320 counted collapses. The pen ran ahead of the punches by a different
amount on each sheet, which is the least surprising result here and the one best supported. The
measured open rail spans 0.030 across the six bass halves and 0.065 across the six treble halves,
and the closed rail 0.120 and 0.095. That is the group where a
difference between machines, or simply between set-ups on different days, is expected, and it is
also the group the emulator can neutralise, which §4 uses.

Two systematic offsets are worth recording, because they are properties of the fit rather than of
any roll. The fitted lead is more negative than the measured one in 11 of 12 halves, median
−7.4 rows. The fitted `mezzoforte` is above the measured face in all 10 halves that have one. In
both cases the second fitting stage moves a pinned constant in the same direction on nearly every
roll, so the offsets are not evidence about the instruments.

`scaleWarp` belongs here by argument rather than by measurement. No roll measures it, its bass
range is 0.43 to 1.74 against a largest seed spread of 0.35, and its meaning is the curvature of
bellows travel against the printed scale, which is a property of the linkage that carried the
pen. It is left in the row's own parameters in both transfer variants for want of anything to
substitute.

### 3.4 What sits on a bound

Five values in the best-seed table lie within a thousandth of their box of a bound, and the ones
that matter recur in both seeds: `mezzoforte` at its 0.75 ceiling on 2739 treble and 1348 treble,
`throughFlowLoad` at zero on 2739 treble, `membraneFillMs` at zero on 1348 bass, and
`sforzandoAssistRate` at its ceiling of 80 on 3309 treble. Four of the 24 half-fits put
`mezzoforte` on its ceiling, always on one of the two rolls whose hook the trace cannot witness.
Those cells are set by the box and carry no information about the roll.

### 3.5 Do the disagreements follow a pattern?

Not one that six rolls can establish. Correlating each parameter against roll length, observed
coverage and Welte catalogue number as a proxy for date, no coefficient survives inspection. At
n = 6 a two-tailed test at p = 0.05 needs |r| ≥ 0.811. Two coefficients pass that line and both
are one roll. Treble `crescendoTarget` against coverage gives r = −0.98, and dropping 2739 leaves
r = +0.30. Bass `mezzoforte` against coverage gives r = −0.96, and the ordering is led by 2739,
the roll with the lowest coverage and no pinned hook. Dropping it leaves r = −0.75, where the
threshold at n = 5 is 0.878. The measured bass hook face against catalogue number gives r = +0.82
on four rolls, where the threshold at n = 4 is 0.950.

Performer gives nothing either. The two Samaroff rolls do not resemble each other more than the
rest, which §4 shows more directly.

One asymmetry is consistent. `sforzandoTarget` and `crescendoTarget` are both lower in the bass
than in the treble on all six rolls, without exception. Under a sign test that is p = 0.031 for
each, uncorrected, and nine parameters were examined, so it is suggestive rather than
established. It points the same way as Hagemann's measurement on one instrument, that for the
same change of vacuum from −100 to −200 mm water column the Discant dome travels 11 mm against
the Bass dome's 8 mm, which he attributes to the cone valves and seats not being identical
between the halves (2001, p. 26). If the same drive carries the Discant further, an asymptote
fitted on the printed scale should sit higher there. The analogy is loose, since Hagemann's
ladder is in vacuum and the model's targets are in bellows travel, and he gives one point of the
relation between them. It cannot be read as a confirmation.

## 4. Transfer between rolls

Row A's constants are run on column B's punched code and scored against B's drawn line over
every row B's tracer witnessed. *As fitted* takes A's parameters unchanged. *Re-registered*
replaces `piano`, `forte` and `leadRows` with B's own measured values, so that A's registration
of the pen on its own sheet is not charged against B's line. All six rolls settle all three, and
the two variants differ in all 72 cells.

| variant | half | mean own | mean foreign | mean foreign / own |
| --- | --- | ---: | ---: | ---: |
| as fitted | bass | 0.0297 | 0.0859 | 3.14 |
| as fitted | treble | 0.0390 | 0.1038 | 3.23 |
| re-registered | bass | 0.0350 | 0.0799 | 2.37 |
| re-registered | treble | 0.0494 | 0.0929 | 1.93 |

Constants do not transfer wholesale. A foreign roll's constants describe a line about twice to
three times as badly as the roll's own, and no roll is an exception.

Re-registration removes part of the penalty and not most of it. Off the diagonal the mean falls
by 6.9 % in the bass and 10.5 % in the treble, and it improves 19 of 30 pairs in the bass and 24
of 30 in the treble. On the diagonal it costs, 0.0297 to 0.0350 and 0.0390 to 0.0494, which is
expected, since a fit had tuned the registration to its own line and the measurement puts it
back. So the answer to the question whether re-registration accounts for most of the loss is no.
About a tenth of the excess is registration on this evidence, and a factor of about two remains
after it is removed. Whatever separates the rolls is mostly not where the pen sat on the paper.

The closest pair, by the mean of the two directions' penalties relative to each target's own
score, is 3357 and 1478 in both halves, 1.48 in the bass and 1.17 in the treble. They share
neither performer nor date nor length. In the treble 1478's constants score 0.0483 on 3357, which
is very slightly better than 3357's own re-registered whole-roll score of 0.0490, the only such
crossing in the matrix.

The two Samaroff rolls, 1474 and 1478, the same pianist and adjacent catalogue numbers, rank 13th
of 15 pairs in the bass at 2.94 and 5th of 15 in the treble at 1.61. On this evidence they do not
share a machine or a setting more than any other pair does. That is a negative result and it is
one of the clearer ones here, because these are the two best-witnessed traces in the set, so the
failure to resemble each other is not easily blamed on the tracing. It also has an obvious
reading. Gottschewski dates the SUPRA copy of 1478 to 18 January 1923 against another copy of
30 April 1920, so one recording session did not mean one punching, still less one drawing
session, and two rolls from the same sitting need not have met the same pen.

## 5. Travel times against Schmitz

The times are free travel from `src/model/timings.ts`, with nothing clamped and the Mezzoforte
pin ignored, integrated in the model's own bellows travel, which `scaleWarp` then bends onto the
printed scale. Schmitz read his off drawn lines on the printed scale, from rolls other than
these, and his Bild 4 is a hand drawing digitised from a 300 dpi scan (1981, pp. 4–5). The two
quantities are therefore not strictly the same, and the comparison is looser than a table makes
it look.

| span | across the twelve halves | Schmitz 1981 |
| --- | --- | --- |
| sforzando, P to F | 159 to 326 ms, median 252 | ≈ 200 ms |
| sforzando release, F to P | 21 to 130 ms on 10 halves | ≈ 150 ms |
| slow crescendo, P to M.F. | 1100 to 5644 ms on 11 halves | 1300 to 1400 ms |
| slow decrescendo, e-folding from M.F. | 812 to 2580 ms | ≈ 700 ms |

The sforzando is the one span where the rolls agree with each other and with him. All twelve
halves lie within a factor of two of his 200 ms, ten of them between 100 and 300 ms, and the
seed spread on this quantity has a median of 7 ms against a cross-roll range of 167 ms. The
single exception is 2739's treble, where the two seeds give 159 and 67 ms, and 2739's treble is
the half with 51.7 % coverage. So the fast closing time is the best-determined quantity in this
material and the one place where six independently fitted rolls say the same thing.

The slow decrescendo does not agree with Schmitz. Every one of the twelve e-folding times is
longer than his 0.70 s, by factors of 1.2 to 3.7. It also does not agree between seeds well
enough to compare rolls with confidence: the median seed spread is 329 ms against a cross-roll
range of 1768 ms, and on 3357's treble the two seeds give 1039 and 2580 ms. The differences
between rolls in this span are real in the sense that they exceed the seed spread on most halves,
and they are exactly the quantity Gottschewski reports as varying from roll to roll and between
halves. The fits are consistent with his observation without being able to confirm it, since a
systematic offset from his figure of this size suggests the two quantities are not measured the
same way.

The slow crescendo to M.F. is slower here than Schmitz's 1.3 to 1.4 s on ten of eleven halves,
1348's bass at 1100 ms being the exception, and reaches 5.6 s on 3357's treble. The seed spread
on this span is small, a median of 52 ms, so the disagreement with him is not a search artefact.

Every "never reached" and every 30000 in `docs/rolls-round1.md` follows from a fitted asymptote
lying short of the destination, and the integrator's limit of 30 s is what 30000 means.

- *Slow crescendo, P to F* is unreachable on nine of twelve halves because `crescendoTarget` sits
  below the closed rail, which is the model's whole claim about the crescendo and what the
  Leseregeln require. 3309 bass has a target of 0.808 against a rail at 0.906, 3357 bass 0.712
  against 0.859.
- 2739's bass reaches neither the closed rail nor the Mezzoforte level, its `crescendoTarget` of
  0.740 lying just below its fitted `mezzoforte` of 0.746. Those two numbers straddle by 0.006 on
  a roll whose hook the trace cannot witness, so the "never reached" is a knife edge and not a
  statement about the instrument.
- 2739's treble and 1474's treble never complete the two spans that end at the open rail, because
  their `releaseTarget` was fitted above `piano`, at +0.006 against 0.003 and at +0.112 against
  0.045. A bellows whose asymptote lies above the rail cannot reach it, and on both rolls this is
  the same near-degenerate pair discussed in §2, both having `alpha` near 0.59.

## 6. The two hypotheses

**Different machines drew different rolls.** The numbers are consistent with it and do not
establish it. What is shown is that no roll's constants describe another roll's line nearly as
well as its own, by a factor of about two after registration is neutralised, and that this holds
for all 30 ordered pairs. What is not shown is that the machine is the cause. A fit with this
many free parameters, two seeds and one loss can land in different places on two rolls that came
from the same machine, and §2 shows it landing in visibly different places on the *same* roll
between two seeds. The strongest single piece of evidence for the hypothesis is not a fit at all:
the measured hook face varies by about 0.10 of the printed scale across four rolls whose
within-roll scatter is 0.008 to 0.040. The weakest link in it is that Niels' hypothesis is about
the drawing machine, while the hook face is a regulation of the instrument being recorded, and
those need not be the same thing.

**The instruments were out of regulation** (Gottschewski 2024, 14:21–15:17). The measured hook
faces support the general shape of the claim. His specific finding, that the mezzoforte-to-
pianissimo length differs from roll to roll and sometimes between halves, corresponds to the slow
decrescendo here, where the fitted e-folding times do run from 812 to 2580 ms and where bass and
treble differ within every roll, by 83 ms on 2739 and by 1305 ms on 3357. Two seeds are not enough
to carry it. On five of the twelve halves the two seeds differ by more than 400 ms, and on 3357's
treble by 1541 ms, which is most of the cross-roll range of 1768 ms. The whole family also sits a
factor of 1.2 to 3.7 above his own figure. His claim is not tested here, and this material is not
yet in a position to test it.

**What would decide it.** Two things, neither of which exists in SUPRA as far as this mission
found. The same punched roll drawn twice, which would separate the machine from the code and put
a number on run-to-run variation of the drawing itself. In each of the three two-copy pairs among
the candidates exactly one copy carries lines, so SUPRA offers no such pair. And a roll with
lines whose drawing instrument is known and documented, which would turn "the machines differ"
into a statement with a referent. Failing those, more seeds per roll would at least separate the
search from the roll, and that is cheap.

## 7. Limitations

1. **Two seeds.** The spread reported is an absolute difference between two runs and not a
   standard deviation. Where it is large it proves the parameter undecided. Where it is small it
   does not prove the parameter decided.
2. **The tables are the round-1 fits on the round-1 traces.** Two tracer defects have since been
   fixed, a rule-riding path and a gridline shoulder cheaper than paper. Both cost the round-1
   fits rows rather than corrupting values, since the affected rows were flagged and masked, so
   the fits here are not wrong in what they saw. The second round has since been run and is in
   §10. It changes no conclusion of §2 to §6, and the reasons for reading the tables from round 1
   all the same are given in §10.5.
3. **The measurement's thresholds.** 20 arrivals and 30 collapses are a judgement, no roll seen
   so far sits near either line, and the plateau band is fixed at 0.45 to 0.78. The rails have no
   evidence test at all: the histogram always returns a fullest bin, so a line that never reaches
   a rail still yields two numbers, which matters most for 2739, whose measured rail span of
   0.780 in the bass is the narrowest of the six.
4. **3357's stroke edge.** Its absolute levels may sit a few hundredths off, self-consistently
   within the roll. Its treble hook face is the one flagged as untrustworthy on independent
   grounds. Both its seeds also disagree more than any other roll's.
5. **2739's coverage.** The fit saw 72.7 % of the bass and 51.7 % of the treble. The three
   strangest cells in the whole comparison are all in that treble half: a crescendo asymptote at
   1.969, above its own closed rail, a through-flow load at zero, and a Mezzoforte level on its
   0.75 ceiling.
6. **The transfer matrix does not neutralise everything.** `mezzoforte` stays with the donor
   deliberately, since it is the regulation the mission wants to compare, and `scaleWarp` and the
   four relative lead offsets stay with the donor because no roll measures them. The second
   variant therefore removes the registration it can measure and leaves the registration it
   cannot, which sets a floor under the residual factor of two.
7. **Schmitz's figures are a hand drawing** read off rolls other than these, and the model's
   travel times are integrated in bellows travel rather than on the printed scale. The agreement
   on the sforzando and the disagreement on the decrescendo both carry that caveat.

## 8. Cross-checks

Everything quoted above was recomputed from `docs/rolls-round1.json` and the fit files rather
than read out of `docs/rolls-round1.md`.

- **Held-out RMSE.** The recorded and recomputed columns agree to the last digit on all twelve
  halves, difference exactly zero. The reproduction failure `compare.ts` was written to catch
  applies only to `fit-pneumatic.published.json`, which is not the file compared here.
- **Seed spread.** Recomputed from `<druid>-seed{1,2}.json` for all six rolls and both halves. It
  reproduces the `±` column, and it shows that the `alpha` 1.52 and `releaseTarget` −0.46 quoted
  for 3309 elsewhere in this mission belong to the published fit and not to either refit seed.
- **Travel times.** The e-folding closed form was reimplemented independently and reproduces all
  twelve table entries to the millisecond. A separate reimplementation of the traversal
  integrator reproduces the traversal entries as well, checked on 3357 bass at 5144 ms and 1474
  bass at 2262 ms.
- **Observed-row shares** were recomputed as `measured.observedRows / rows` per half.
- **At-bound marks** were recomputed against the bounds parsed out of `src/model/pneumatic.ts`,
  in the best-seed fits and in all 24 seed fits.
- **Transfer variants** differ in all 72 cells, which is what must happen when every roll settles
  all three registration constants.

## 9. Sources

- Hermann Gottschewski, "Insights to the Editing Process of the Dynamics and Pedalling on Welte
  Mignon Piano Rolls", 3rd Global Piano Roll Meeting, Sydney, 26 July 2024, cited by timestamp.
- Reinhard Hagemann, "Einstellanleitung für Welte-Mignon", *Das Mechanische Musikinstrument* 80
  (2001), pp. 25–27.
- Hans-W. Schmitz, "Welte-Mignon und Hupfeld DEA. Zwei Reproduktionssysteme in Konkurrenz", *Das
  Mechanische Musikinstrument* 19 (1981), pp. 3–10, Bild 4.

`docs/sources.md` carries the full apparatus for all three.

## 10. Round 2: the same fits on the improved traces

The tracer was corrected twice after the round-1 traces were made, once for a path that rode a
gridline rather than paying to cross it and once for a gridline shoulder the mask did not cover.
Every roll was traced again and fitted again with the same code, the same two seeds and the same
320 generations. This section holds the two rounds against each other. Every figure in it was
recomputed from `docs/rolls-round1.json` and `docs/rolls-round2.json` rather than read out of a
table. The first round-2 comparison paired the new fits with the old traces, which §10.1 records
because the check that caught it is worth knowing about.

### 10.1 A first comparison that read the wrong traces

The first round-2 comparison compared the round-2 fits against the round-1 traces, and it is worth
recording how that happened and how it showed, because the check that caught it is one the tool
carries for the purpose.

`src/cli/compare.ts` reads the fit files it is pointed at, and loads each roll's traced curves
through `loadRoll`, which takes them from `out/<druid>/curves.csv` under the repository root. That
directory held the round-1 traces at the time, so the run paired new fits with old curves. Two
things showed it, neither depending on a reading of the code. The measured-constants block was
byte-identical to round 1 on all twelve halves, which cannot happen if a different trace was read.
And the file's own reproduction check, which runs the recorded parameters through the model again
on the fit's own mask, disagreed on all twelve halves by up to 0.0045, where the round-1 run had
agreed to the last digit.

The files have since been regenerated with `out/` pointed at the round-2 traces and the round-2
refit of 3309 in the headline file, and `docs/rolls-round2.json` and `docs/rolls-round2.md` are now
the clean comparison. Everything in this section is taken from them.

They were checked against an independent rebuild made in a scratch copy of the source, and the two
agree exactly. All 144 transfer cells are identical to the last bit, as are the travel times, the
fitted parameters and the held-out scores. The regenerated file's measured block now differs from
round 1 on all twelve halves and matches a separate run of `src/truth/measure.ts` over the round-2
traces on all twelve. Its reproduction check closes to 3·10⁻¹⁸, machine precision, against 0.0045
before the regeneration. The same scratch harness run against the round-1 traces reproduces the
measured block of `docs/rolls-round1.json` exactly, which is what licenses it as a control.

### 10.2 Fit quality

Held-out RMSE per half and the summed seed spread, round 1 against round 2.

| Welte | bass | treble | seed spread |
| --- | --- | --- | --- |
| 1348 | 0.0293 → 0.0279 | 0.0372 → 0.0376 | 0.0003 → 0.0001 |
| 1474 | 0.0230 → 0.0234 | 0.0438 → 0.0439 | 0.0001 → 0.0001 |
| 1478 | 0.0204 → 0.0219 | 0.0528 → 0.0519 | 0.0017 → 0.0019 |
| 2739 | 0.0247 → 0.0269 | 0.0315 → 0.0253 | 0.0012 → 0.0054 |
| 3309 | 0.0284 → 0.0279 | 0.0365 → 0.0389 | 0.0009 → 0.0004 |
| 3357 | 0.0296 → 0.0249 | 0.0168 → 0.0171 | 0.0071 → 0.0011 |

Summed over the twelve halves the held-out error falls from 0.3740 to 0.3678, and five of the
twelve halves improve. The masks differ between rounds, since the wider rule mask reassigns rows,
so these are not two measurements of one quantity and the small total is not evidence that the new
traces are better. The coverage figures in §10.3 are the honest statement of what changed.

Two rolls change character. 3357's seed spread falls from 0.0071 to 0.0011 and its bass improves
from 0.0296 to 0.0249, so it is no longer the roll whose fit the seeds least agree on. 2739 takes
that place, its spread rising from 0.0012 to 0.0054, while its treble improves from 0.0315 to
0.0253. Roll 3309, whose round-1 trace is Niels' validated reference, is the one roll that loses
coverage in both halves and its treble is the largest single regression, 0.0365 to 0.0389.

### 10.3 The measured constants barely moved

This is the part of the comparison that does not depend on any fit, and it is the most stable.

| quantity | largest move between rounds | for scale |
| --- | --- | --- |
| hook face | 0.0022 (1474 bass) | within-roll sd 0.008 to 0.048 |
| lead | 1.0 scan row (three halves) | cross-roll range 66 rows |
| closed rail | 0.0000, identical on all twelve halves | cross-roll range 0.120 |
| open rail | 0.0300 (3309 bass) | cross-roll range 0.030 bass, 0.065 treble |

The ordering of the hook faces is identical in both halves and both rounds, and the set of four
rolls that clear the 20-arrival threshold does not change. 2739 goes from 5 and 8 arrivals to 4
and 8 and 1348 still records none, so both stay unpinned. The lead moves by at most one row
anywhere. §3.2 and §3.3 therefore stand as written.

The open rail on 3309's bass is the exception and deserves naming. It moves from 0.0175 to
−0.0125, below the printed P.P. gridline, a move of 0.030 which is the whole cross-roll range of
that constant in the bass. It is also the one constant §7 item 3 already says has no evidence
test, the histogram returning a fullest bin whatever the line does, and the wider round-2 rule
mask is the obvious way for that bin to move. The fit did not follow it far, 0.0304 to 0.0229. I
would not read a change of instrument into it.

Coverage rises on seven halves and falls on five. 2739's bass gains most, 72.7 % to 77.8 %, while
its treble holds at 51.7 % to the tenth of a point, which confirms that the missing discant rows
there are the drawing and not the tracer. 3357 gains 1.3 and 3.3 points, 1478 gains 0.5 and 0.9, 1348 gains 0.8
and 1.1. 3309 and 1474 lose a few tenths in both halves.

### 10.4 The fitted constants moved, the cross-roll picture did not

Of the 324 free-parameter cells, 79 moved between rounds by more than the larger of the two
rounds' own seed spreads for that cell. They are concentrated in the five relative lead offsets and
in the valve timings, which §3.1 had already found undecided within a roll. The largest single
move is 2739's treble `releaseTarget`, from +0.006 to −0.016.

Against that, every conclusion of §2 to §6 that was stated about the six rolls together survives.

| conclusion | round 1 | round 2 |
| --- | --- | --- |
| foreign over own, as fitted, bass and treble | 3.14, 3.23 | 3.08, 3.24 |
| foreign over own, re-registered | 2.37, 1.93 | 2.39, 1.88 |
| re-registration gain off the diagonal | 6.9 %, 10.5 % | 6.3 %, 11.6 % |
| closest pair, both halves | 3357 with 1478 | 3357 with 1478 |
| Samaroff pair, rank of 15 | 13th bass, 5th treble | 12th bass, 4th treble |
| sforzando P to F | 159 to 326 ms, median 252 | 168 to 310 ms, median 248 |
| decrescendo e-folding | 812 to 2580 ms, all above 700 | 798 to 2608 ms, all above 700 |
| bass target below treble, both asymptotes | 6 of 6 rolls | 6 of 6 rolls |
| r(`alpha`, `releaseTarget`), best seed, 12 halves | −0.869 | −0.941 |
| fitted `mezzoforte` above the measured face | 10 of 10, median +0.085 | 10 of 10, median +0.080 |

Three of these are worth a sentence. The transfer factors move by less than 0.06 on a quantity of
about 2 to 3, so the finding that constants do not transfer and that registration does not explain
it is not an artefact of one tracing. The degeneracy between the flow exponent and the release
asymptote tightens rather than loosens, which argues further against reading either alone. And the
bass-below-treble asymmetry holds at 6 of 6 for both asymptotes in both rounds, with the sforzando
gaps widening, so it is the most reproducible of the weak findings.

One round-1 oddity is repaired. 2739's treble `crescendoTarget` was fitted at 1.969 in round 1,
above its own closed rail, on the half with 51.7 % coverage. In round 2 it comes out at 0.891
against a rail at 0.923. Every roll and half now has its crescendo asymptote short of the closed
rail, which is what the mechanism requires and what the Leseregeln state, so §3.2's claim holds
without the exception it had to carry. The treble range narrows from 0.738 to 1.969 down to 0.739
to 0.927.

The bound-resting cells change membership without changing the lesson. `mezzoforte` still sits on
its 0.75 ceiling on 1348's and 2739's treble, the two rolls whose hook the trace cannot witness.
3309's treble `sforzandoAssistRate` comes off its ceiling. `throughFlowLoad` at zero now appears on
1474's treble as well as 2739's, and `inertiaMs` at zero appears on both of 2739's halves.
`throughFlowLoad` remains the one mechanism constant separating 1348 from the rest, 0.57 and 0.67
against 0.06 to 0.32, though its bass seed spread rises to 0.52 and that half of the claim is now
undecided.

### 10.5 Which round the tables should be read from

The tables in §1 to §6 should go on being read as round 1, and `docs/rolls-round1.md` is the file
to quote. Both comparisons are now internally consistent, so this is a choice about which to
present rather than a constraint. Round 1 keeps it because it is the round the published
comparison page renders and the round every figure in §1 to §6 was computed from, and because
nothing in the argument would change if it were swapped. `docs/rolls-round2.md` may now be quoted
in full.

Nothing in the argument turns on the choice. The two rounds agree on every cross-roll conclusion,
and where they differ round 2 is the tidier of the two, having lost the one asymptote that sat
above its own rail. Whenever the move is made, the tables, this document and
`artifacts/rolls-summary.json` should move together rather than one at a time, since the one thing
worth avoiding is a document that quotes two rounds in adjacent sentences.
