# The T-100 signal path, perforation to Nuancierbalg

A reading of **Anhang 13** (Hagmann 1984, p. 186, "Skizze zur Tonerzeugung beim Welte-Mignon-Klavier
T 100", captioned "Nach Welte 2") at native resolution, together with the chapter text (pp. 95–103),
the blower chapter (pp. 71–78), the Tonerzeugung chapter (pp. 103–110) and Anhang 12 (pp. 180–185).

This document is a companion to `pneumatics.md`, not a replacement. Where the two disagree, §11 says
so.

## 0. Method, and how to check any of this

`pneumatics.md` §8.4 worked from the rendered page. The plate is embedded in the PDF as a **1-bit
CCITT stencil, 1744 × 2480 px for the whole A4 sheet** (≈ 211 dpi, so 1 px = 0.120 mm on the page),
and extracting that bitmap directly is noticeably better than any render, and better than the cached
PNG (1006 × 1262) that was supplied with this task. Everything below is read off the native bitmap.

```
pdfimages -png -f 186 -l 186 "…/Hagmann - 1984 - …pdf" a13     # Anhang 13  (T-100)
pdfimages -png -f 187 -l 187 "…" a14                            # Anhang 14  (T-98)
pdfimages -png -f 172 -l 172 "…" a4                             # Anhang 4   (blower, lettered)
```

All coordinates below are **native pixels on that 1744 × 2480 bitmap of p. 186**, origin top left.
The crops and helper scripts are in this session's scratchpad under `sp/` (`c.py` for fractional
crops, `p.py` for pixel crops, `g.py` for a crop with a labelled coordinate grid, `runs.py` for
measuring ink-run widths).

Marking convention, as in `pneumatics.md`:

- **DRAWING** — read off Anhang 13 (or Anhang 14 where said).
- **HAGMANN** — his text.
- **INFERENCE** — mine.

**Anhang 14 is the T-98 and is used below only as a second drawing of parts that Hagmann says are
common to both scales** (the nuancing unit 85–101, p. 96, and the blower assembly 1–6, which carries
the identical numbering on both plates). Every T-100-specific claim is sourced to Anhang 13 or to the
T-100 pages 95–100. The T-98 relay numbers (64–84) appear nowhere in this document except where
explicitly flagged.

**One thing about the plate's provenance that should be known before any of it is weighed.** Anhang
13 (T-100) and Anhang 14 (T-98) both carry the caption **"Nach Welte 2"**, and the bibliography
(p. 256) gives Welte 2 as *"Welte-Mignon-Reproduktionsklavier. [**Betriebsanleitung T 98**]"*. So the
**T-100 plate is redrawn after a T-98 manual.** Anhang 12 is a different kind of source: Hagmann's
footnote 53 (p. 108) gives its basis as "**Welte 17 (T 100)**; Welte 13 (T 98); Ergänzungen in Welte
2", i.e. Welte's own Skalarolle booklet *for the T-100*. Where the plate and Anhang 12 disagree about
the T-100, Anhang 12 rests on a T-100 source and the plate does not. This matters in §11.1.

---

## 1. The two answers asked for first

### 1.1 The supply vacuum is regulated, by a spring-loaded reservoir with a hard ceiling

Parts 1–6 on Anhang 13 are the blower and its magazine bellows. **The supply is regulated, but by a
passive spring-and-reservoir with droop, not a servo, and it regulates asymmetrically**: it puts a
hard clamp on *too much* vacuum and only a limited, finite buffer against *too little*. Details in
§4. In brief:

- **Against a demand surge it is a finite buffer.** Hagmann, p. 73: when the blower momentarily
  delivers too little "weil – etwa bei vollgriffigem Spiel – viel Luft ins System eindringt", the
  bellows spring opens the reservoir and "gleicht damit das Leistungsgefälle aus". The word is
  **"kurzfristig"**, twice. Once the reservoir has opened as far as it goes, it has nothing left, and
  the vacuum then sags with demand until the blower's higher speed stage is commanded.
- **Against excess vacuum it is a hard clamp.** The reservoir is sucked shut until a spike opens a
  safety valve (p. 73). That is a saturation, not proportional regulation, and Hagmann says it is
  what sets the fortissimo: "die Kraft der Balgfeder und die Einstellung des Sicherheitsventils
  bestimmen die Stärke des Fortissimo-Anschlags".
- **It has droop.** Hagmann, same paragraph: "Je später das Sicherheitsventil betätigt, je mehr also
  der Magazinbalg zugesaugt wird, desto stärker wirkt sich die Kraft der Balgfeder aus und desto mehr
  wird die Saugleistung des Gebläses durch den Magazinbalg unterstützt." The regulated vacuum is a
  function of how far the reservoir has been sucked shut, so it is not a constant.
- **No time constant is given anywhere.** Hagmann has no figure for the reservoir's volume, its
  spring rate, its response time, or the vacuum it holds. **HAGMANN** for all of the above.

**What defeats it, and the bearing on the sag hypothesis.** Hagmann states the sag directly, in the
T-98 pressure-equalising-valve passage (p. 74): "Sobald aber, weil beispielsweise vollgriffige
Akkorde angeschlagen werden und viel Normaldruck ins System eindringt, die Saugleistung im
Hauptkanal (H) nachlässt …". The whole device exists to detect that condition. On the T-100 the same
condition is handled by the roll instead, through the Widerstand lines 9/10 (pp. 74–75, Anhang 10),
which switch the blower motor between two speeds. So on the T-100 the main-trunk vacuum:

1. sags when many notes sound, once the reservoir's buffer is used up;
2. steps up and down whenever the roll commands the other blower stage;
3. is clamped at the top by the safety valve.

None of that is regulated away by the Regelbalg 91, which corrects only the *delivered* vacuum
downstream of the cone valve.

### 1.2 The relay taps its vacuum upstream of the cone valve, at the reservoir

**Traced on Anhang 13, unbranched, with high confidence.**

Conduit **14** is drawn as a two-wall duct at **x = 1348 / 1362** (lumen ≈ 10 px). Its upper end is
the horizontal channel that carries the label **15** (leader touching the channel at y ≈ 562, i.e.
the relay's common vacuum wind chamber). It runs straight down the sheet to **y ≈ 930**, turns right,
and enters the end block of the magazine bellows **2**.

At that same point, **y ≈ 928**, the horizontal trunk **85** arrives from the left, coming from the
**right-hand half of wind chamber 86**. The label **5** sits on that junction. So conduit 14, trunk
85 and the reservoir all meet at one node.

I checked the run for branches programmatically: over y ∈ [600, 925] the pipe presents exactly two
ink runs at x ≈ 1348 and 1358 on every row except those occupied by the "14" glyph itself (y ≈ 713–760).
There is no tee anywhere along it.

**Therefore the relay's driving vacuum is the trunk vacuum, taken upstream of cone valve 87.** It
does not carry the nuanced (post-cone-valve) vacuum, so there is no feedback path from the current
dynamic level back into the relay. Hagmann's phrase "in der jeweils vom Gebläse erzeugten Stärke"
(p. 98) fits exactly, and his own footnote 29 to that phrase is "Das Gebläse arbeitet bekanntlich auf
zwei Stufen." **DRAWING**, corroborated by **HAGMANN**.

**But upstream is not the same as constant.** The consequence the model has to carry is this: the
relay's driving vacuum, and with it *the vacuum that closes the Nuancierbalg*, is the trunk vacuum
described in §1.1. Wind chamber 15 feeds valve chambers 22 and 38; valve chambers 22 and 38 feed
conduits 23 and 39; conduits 23 and 39 close the Nuancierbalg. So:

> **A sag in the trunk vacuum slows the closing of the Nuancierbalg, and the Regelbalg cannot
> compensate for it,** because the Regelbalg acts on the cone valve, downstream, and has no influence
> on chamber 15.

That is the mechanism behind the hypothesis being tested, stated in Hagmann's own components.
**INFERENCE**, but only in the sense of composing three of his statements; each link is his.

Two riders. First, a deeper vacuum also makes the *opening* faster, since opening is atmosphere
flowing into a bellows whose interior sits at the trunk vacuum, so the whole nuancing time scale
stretches and shrinks together rather than one direction only. Second, the Nuancierbalg is closed
against its own internal spring (p. 96), so with a sagged vacuum the fully-closed (forte) position
may not be reachable at all: forte is a soft limit, not a hard stop. Both **INFERENCE**.

---

## 2. Stage-by-stage, for each of the six functions

Common anatomy of a relay unit, from Hagmann's crescendo description (p. 98), which he then says the
others follow "in gleicher Weise":

```
Gleitblock opening → conduit → membrane chamber → membrane → (bleed bore back to chamber 15)
                                    ↓
                              valve, lifted
                                    ↓
      valve chamber cut off from atmosphere chamber 17, connected to vacuum chamber 15
                                    ↓
                       conduit to the Nuancierung → bellows
```

### Stage A — the tracker port opens (all six)

Circular hole, 1.8 mm (rot-neu, from c. 1910) or 2.2 mm (rot-alt), step 0.9 mm, pitch 3.2 mm (p. 76),
crossing a rectangular glide-block opening. **HAGMANN** for the dimensions.

In time: a ramp, whose slope is set by the paper speed. Two things the model may not have. The port
is under suction, and the glide-block vacuum is deliberately kept low so as not to drag the paper
(p. 104), but it still varies with the blower stage (p. 77). And the *paper speed itself is not
constant*: the Windmotor has a regulating valve to compensate for the varying glide-block vacuum, and
Hagmann says plainly that it does not fully succeed — "die Stockungen im Transport des Notenbandes
vermag sie nicht vollständig zu vermeiden; sie ergeben sich … noch aus anderen Gründen als der
wechselnden Saugspannung am Gleitblock und sind durch das Regelventil nicht zu beheben" (p. 78).
**HAGMANN.**

### Stage B — the relay membrane fires on a puff, not on a level

This is the stage most likely to be missing from a model, and Hagmann is unusually explicit about it
(p. 98, crescendo, and by his own statement the pattern for all of them):

> "Trifft eine Perforation des Notenbandes auf die Oeffnung 10 des Gleitblocks, so tritt über die
> Kondukte 34 Luft in die Membrankammer 35, die über die Bohrung 37 mit Saugwind versehen wird –
> wobei jene Bohrung dergestalt dimensioniert ist, dass sie in Membrankammer 35 und Kondukte 34 wohl
> den geeigneten Unterdruck zu erzeugen, **nicht aber den eintretenden Luftstoss zu neutralisieren
> vermag. Der Luftstoss bewirkt die Anhebung** der beiden durch einen unbiegsamen Draht miteinander
> verbundenen Membranen 36 und 40 …"

So the chamber is a leaky integrator: the bleed bore continuously restores the vacuum, and the
membrane lifts on the *pulse*. That gives a **duration threshold**, and Welte normed it. Anhang 12,
control 4b (p. 182), T-100, in full:

> "Im Bass und Diskant gleichzeitig Eingabe von sechs kurzen Perforationen Sforzando an: Die
> Nuancierbälge 90 müssen sich in sechs Schritten von der Piano- zur Mezzoforte-Stellung bewegen.
> Nach Rückfall in die Piano-Stellung Eingabe von sechs **noch kürzeren** Perforationen Sforzando an:
> **Die Nuancierbälge 90 dürfen sich nicht bewegen.** Wird die Mezzoforte-Stellung zu früh oder zu
> spät erreicht, Korrektur an 20 (T 100) oder 82 (T 98)."

A short perforation gives a partial step; a shorter one gives nothing at all. **HAGMANN**, and this
is regulation practice, so it is good evidence.

In time: threshold on the *rate-integral* of the incoming air, i.e. approximately on perforation
duration at a given paper speed and glide-block vacuum; below it, no output. The adjuster is bore 20
(T-100).

### Stage C — the valve lifts, and drops again with a tail

The membrane lifts a valve that cuts the valve chamber off from atmosphere chamber 17 and connects it
to vacuum chamber 15. On the release side Hagmann is again explicit that this is not a step (p. 99,
crescendo-off): "so senkt sich das Doppelventil 47 **in jenem Masse, als die Membrankammer 44 über
die Bohrung 46 evakuiert wird**". The valve sinks *to the extent that* the chamber is re-evacuated,
so it passes through partial lifts, over a time set by the bleed bore.

Anhang 12 calibrates that tail for the sforzando-off unit at bore 29 (control 4e, p. 183): three
short single perforations must bring the bellows back to piano in exactly three steps.

In time: a first-order release with an adjustable time constant, and partial conductance during it.
**HAGMANN.**

### Stage D — the latch, where there is one

Crescendo-on, sforzando-on and mezzoforte-on each carry a second membrane in a divided hold chamber,
rigidly wired to the first. Once the valve is up, the valve chamber's vacuum also reaches the *upper*
half of the hold chamber, so the second membrane is held up by a pressure difference and the function
survives the end of the perforation. Cancelling admits vacuum to the *lower* half through the cancel
conduit, the difference vanishes, and atmosphere from chamber 17 pushes the valve back down. Hagmann
gives this once, for crescendo (pp. 98–99), and says the others work "in gleicher Weise".

On the drawing the three hold chambers are, with the number pairs read off Anhang 13:

| Unit | membrane / chamber pair | passage from valve chamber to the upper half | cancel conduit |
|---|---|---|---|
| Sforzando on | 24 / 25 | **26** | 32, from valve 31 |
| Crescendo on | 40 / 41 | **42** | 48, from valve 47 |
| Mezzoforte on | 55 / 56 | **57** | 62, from the MF-off valve |

Hagmann names only 40, 41 and 48. The assignment of the lower number to the membrane and the higher
to the chamber follows his 40/41; **DRAWING** for the pairs 24/25 and 55/56 and for the three
passages 26, 42, 57, **INFERENCE** for which member of each pair is which.

The three "off" units (Sf-off 27–33, Cresc-off 43–48, MF-off 59–62) have no hold chamber, which fits
their momentary function. On Anhang 14 the T-98 relay has no hold chamber on any unit, and is built
from small bellows (79, 83…) rather than membrane chambers. So the plates do draw the latching /
non-latching distinction between the two scales.

In time: a latch, i.e. a hold with no decay. But see §11.1: within the T-100 relay the three "on"
units are one drawn module repeated, and Anhang 12 contradicts the latch for sforzando four times
over.

### Stage E — flow into or out of the Nuancierbalg

Four paths, as in `pneumatics.md` §2, unchanged. The one thing to add is that the *driving pressure*
of all of them is the trunk vacuum of §1 (for the closing paths) or atmosphere against that same
trunk vacuum (for the opening paths).

### Stage F — the bellows moves, and may be stopped at mezzoforte

§7 below.

### The six functions in order

| Roll line (treble) | Opening | Conduit | Chamber / membrane / bore | Valve | Conduit to nuancing | Effect | Persistence |
|---|---|---|---|---|---|---|---|
| 95 Sforzando an | 12 | 18 | 19 / 21 / **20** | 22, "einfach" | **23** (widest) | fast close of 90 | disputed: prose and plate say latched, Anhang 12 says per pulse — §11.1 |
| 96 Sforzando ab | 11 | 27 | 28 / 30 / **29** | 31, double | 33 | closes valve 22; evacuates aux bellows 94 + 95 | momentary + tail at bore 29 |
| 97 Crescendo an | 10 | 34 | 35 / 36 / 37 | 38, double | **39** ("mittelbreit") | timed close of 90 | latched via 40/41 |
| 98 Crescendo ab | 9 | 43 | 44 / 45 / 46 | 47, double | 48 → lower half of 41 | releases the crescendo latch, 90 reopens via 39 + bore 100 | momentary |
| 99 Mezzoforte an | 8 | – | 50 / 51 / **52** | 53, double | 54 | evacuates and closes Mezzofortebalg 93 | latched via 55/56 |
| 100 Mezzoforte ab | 7 | – | 59 / 60 / **61** | – | 62 → lower half of 56 | releases the mezzoforte latch | momentary |

New relative to `pneumatics.md`: the bleed bores **52** (MF-on) and **61** (MF-off), the membrane
chamber **50 / 59** and membranes **51 / 60**, and the hold-chamber passages 26 / 42 / 57.
**DRAWING**, read from the relay's bottom label row.

---

## 3. Parts inventory, with upstream / downstream

"Upstream" means the part can affect the travel of the Nuancierbalg, so it is inside what a
bellows-position fit is fitting. "Downstream" means it lies between the cone valve and the hammer and
cannot. "Global" means it sets the supply and so affects both.

| No. | Name | Function | Side |
|---|---|---|---|
| 1 | Gebläse | blower, four scoop bellows on an eccentric, two motor speeds | **global** |
| 2 | Magazinbalg | spring-loaded reservoir bellows, sets and buffers the trunk vacuum | **global** |
| 3 | Sicherheitsventil | safety valve in the reservoir's moving board, opened by the spike; hard ceiling on vacuum | **global** |
| 4 | Balgfedern | the reservoir's two springs; their force sets the vacuum level | **global** |
| 5 | junction / connection | where trunk 85 and relay conduit 14 leave the reservoir | **global** |
| 6 | conduit | blower 1 → reservoir 2 | **global** |
| 7–12 | Gleitblock openings | MF ab / MF an / Cresc ab / Cresc an / Sf ab / Sf an (treble; mirrored in the bass) | **upstream** |
| 13 | Gleitblock opening | one note line, drawn as an example | downstream |
| 14 | conduit | chamber 15 ← trunk, at node 5 (§1.2) | **upstream** |
| 15 | Windkammer | common relay vacuum chamber | **upstream** |
| 16 | Bohrungen | admit atmosphere to chambers 17 | **upstream** |
| 17 | Windkammern | common relay atmosphere chambers | **upstream** |
| 18–26 | Sforzando-on relay unit | conduit 18, chamber 19, bore 20, membrane 21, valve 22, conduit 23, hold membrane 24, hold chamber 25, passage 26 | **upstream** |
| 27–33 | Sforzando-off relay unit | conduit 27, chamber 28, bore 29, membrane 30, valve 31, cancel conduit 32, conduit 33 to the aux bellows | **upstream** |
| 34–42 | Crescendo-on relay unit | conduit 34, chamber 35, membrane 36, bore 37, valve 38, conduit 39, hold membrane 40, hold chamber 41, passage 42 | **upstream** |
| 43–48 | Crescendo-off relay unit | conduit 43, chamber 44, membrane 45, bore 46, valve 47, cancel conduit 48 | **upstream** |
| 50–57 | Mezzoforte-on relay unit | chamber 50, membrane 51, bore 52, valve 53, conduit 54, hold membrane 55, hold chamber 56, passage 57 | **upstream** |
| 59–62 | Mezzoforte-off relay unit | chamber 59, membrane 60, bore 61, cancel conduit 62 | **upstream** |
| 85 | Kondukte | main trunk, reservoir → chamber 86 right half, and on to the Vorverstärker | **global** |
| 86 | Windkammer, zweigeteilt | right half = supply, left half = delivery; the cone valve sits in the partition | **the boundary** |
| 87 | Kegelventil | seats from the left into the partition; pulled off its seat = louder | **the boundary** |
| 88 | Kondukte | chamber 86 left half → wind chamber 103 of the Tonerzeugung | downstream |
| 89 | Feder | pulls the chain (and so the cone) toward the seat, i.e. toward piano | **upstream** |
| 90 | Nuancierbalg | wedge bellows, spring-opened, suction-closed; carries the chain roller | **upstream** |
| 91 | Regelbalg | senses the delivered vacuum through a bore into the left half of 86 | **upstream** (of the cone valve) |
| 92 | Mutter (Ledermutter) | adjustable chain end on the Regelbalg's moving board; sets the pianissimo end | **upstream** |
| 93 | Mezzofortebalg | closes when commanded, lowering the finger into the Nuancierbalg's path | **upstream** |
| 94 | Hilfsbalg | evacuated by 33, opens throttle 96 | **upstream** |
| 95 | Hilfsbalg | evacuated by 33, opens throttle 97 | **downstream** (97 dumps into the delivery side) |
| 96 | Drossel | air into the Nuancierbalg for the sforzando reopening | **upstream** |
| 97 | Drossel | air into the *left* half of 86 and into 88: the subito-piano vacuum dump | **downstream** |
| 98 | Drossel | crescendo closing rate ("Cresc.F." on the drawing) | **upstream** |
| 99 | Drossel | sforzando closing rate | **upstream** |
| 100 | Drossel / Bohrung | decrescendo opening rate ("Cresc.P." on the drawing) | **upstream** |
| 101 | Regelfeder | pulls the Regelbalg open; balances against the delivered vacuum | **upstream** |
| 102 | Windkammer | Vorpneumatik, fed from the Vorverstärker via 105 | downstream |
| 103 | Windkammer | receives the nuanced vacuum via 88 | downstream |
| 104 | Kondukte | 103 → Vorverstärker membrane 107 | downstream |
| 105 | Kondukte | Vorverstärker → wind chamber 102 | downstream |
| 106 | Tonventil / Ventilkammer | the note valve | downstream |
| 107 | Membran | Vorverstärker sensing membrane | downstream |
| 108 | Kegelventil | Vorverstärker valve, lifted by 107 | downstream |
| 109, 110 | Ventilkammern | Vorverstärker chambers, fed from trunk 85 | downstream |
| 111 | Feder, verstellbar | sets the Vorverstärker ratio; adjuster for piano response (Anhang 12, control 1) | downstream |
| 112 | Kondukte | note opening 13 → Vorpneumatik | downstream |
| 113 | Balg | Vorpneumatik bellows | downstream |
| 114 | Bohrung | Vorpneumatik bleed; repetition reliability (control 10) | downstream |
| 115–120 | Vorpneumatik / note valve train | chamber 117, membrane 118, Abstrakte 119, conduit 120 | downstream |
| 121 | Tonerzeugungsbalg | closes faster or slower with the vacuum; that *is* the loudness map | downstream |
| 122 | Arm | into the repetition action, bypassing the key | downstream |

**Confirmed: the Vorverstärker, Vorpneumatik and Tonerzeugung are all downstream.** Hagmann, p. 104:
chamber 103 receives the nuanced vacuum through 88, conduit 104 carries it to the Vorverstärker,
membrane 107 lifts cone valve 108, and the vacuum that 108 admits comes "vermittels der zum Gebläse
führenden Kondukte 85" — i.e. from the trunk, not from the nuanced side. **HAGMANN.**

One correction to the expectation in the task: **part 95 and throttle 97 are the exception.** They
belong to the sforzando-off relay chain but they act on the *delivery* side, dumping air into the
left half of chamber 86 and into conduits 88 (p. 100). They cannot move the Nuancierbalg and they
cannot be fitted from a bellows-position curve, but they do change the loudness during a subito
piano. `pneumatics.md` §8.2 already had this; it is worth keeping in the inventory because it is the
one place where a relay output bypasses the bellows entirely.

---

## 4. The blower and its reservoir, parts 1 to 6

### What the drawing shows

The assembly is drawn on its side. Reading it against **Anhang 4** (p. 172), which is the same
mechanism lettered rather than numbered (S₁–S₄ scoop bellows, R belt, K crank, **F** spring, **St**
spike, **V** safety valve), the correspondence is one to one and the drawing convention is identical:
the reservoir appears as two long hatched boards with the folded gusset drawn as a chevron at each
end and a straight waist line joining the two chevron apexes; the spring is drawn as a bowed arc
spanning the two boards; the spike as a short blunt stub on the fixed board; the safety valve as a
break in the opposite board directly facing the spike.

On Anhang 13 (and identically on Anhang 14):

- **1** — the blower, drawn as the usual box with a diagonal cross, captioned "Gebläse". A duct rises
  from it, runs right, and enters the reservoir near its lower end.
- **6** — that duct, blower to reservoir. This is the suction side: the blower evacuates the
  reservoir.
- **2** — the Magazinbalg itself, the label sitting on the upper chevron.
- **4** — two arcs, one near each end of the interior, spanning between the boards. By the Anhang 4
  correspondence these are the **bellows springs**, drawn as bowed leaf springs. Hagmann's text has a
  single "Feder (F)"; the T-100 plate draws two.
- **3** — a break in the right-hand (moving) board at mid height, with a small flap outside it,
  directly opposite a **short blunt stub protruding from the inner face of the left-hand (fixed)
  board** at exactly the same height. That is the **safety valve and its spike**. The stub itself
  carries no number on Anhang 13; "3" sits between the two and its leader touches the break, so I
  read 3 as the valve, with the caveat that it may be meant to cover the pair.
- **5** — the node at the reservoir's upper end where trunk 85 and relay conduit 14 leave, at
  x ≈ 1348, y ≈ 928–935.

**DRAWING**, with the identification of 3 / 4 / spike resting on the comparison with Anhang 4.

### What it does

From Hagmann, p. 73, verbatim in the three load-bearing clauses:

> "Dem Magazinbalg fällt dabei die Aufgabe zu, die Saugleistung des mit konstanter Kraft arbeitenden
> Gebläses den wechselnden Bedingungen im Verlauf des Abspielens einer Notenrolle anzupassen. Gibt
> das Gebläse **kurzfristig** zu wenig Leistung ab, weil – etwa bei vollgriffigem Spiel – viel Luft
> ins System eindringt, gelangt die in den Magazinbalg eingebaute Feder (F) zur Wirkung, öffnet den
> Magazinbalg und gleicht damit das Leistungsgefälle aus. Tritt hingegen der umgekehrte Fall ein …
> wird der Magazinbalg so weit ausgesaugt, bis ein entsprechend eingestellter Stachel (St) ein
> Sicherheitsventil (V) öffnet, sodass der Leistungsüberschuss neutralisiert wird."

So: blower at constant output; reservoir as a spring-set buffer; safety valve as a ceiling.

**How fast.** Hagmann gives nothing. Structurally the response has three limits, all **INFERENCE**:
the flow resistance of the trunk between the reservoir and the point of demand; the reservoir's own
inertia and the spring rate; and the finite stored volume, which is a hard capacity limit rather than
a time constant. There is no adjuster for reservoir speed anywhere in Anhang 12; the only reservoir
adjustment named in the book is the safety-valve setting, and it sets a level rather than a rate.

**What defeats it.**

1. **A demand step larger than the reservoir can supply.** Once the bellows has opened fully the
   buffer is exhausted, and the vacuum then follows the balance of blower output against leakage. The
   T-100's answer is the roll-commanded second blower speed (Widerstand, lines 9/10). Which means the
   *recovery* from a sag depends on whether the editor punched the Widerstand line, so it is in the
   roll data and not in the physics.
2. **A demand step faster than it can follow**, limited by the trunk's flow resistance and the
   bellows' inertia. No numbers.
3. **Droop.** Even inside its working range the reservoir does not hold a constant vacuum, because
   the spring force varies with position. Hagmann's "je mehr also der Magazinbalg zugesaugt wird,
   desto stärker wirkt sich die Kraft der Balgfeder aus" says so.
4. **The ceiling.** In thin textures the vacuum is clamped by the safety valve. So the top of the
   dynamic range is a saturation, and it is set by two hardware adjustments rather than by the roll.

---

## 5. Where the relay taps its vacuum — the trace

Covered in §1.2. For the record, the geometry:

| Feature | Native coordinates |
|---|---|
| Relay wind chamber 15, horizontal channel | y ≈ 560, right end at x ≈ 1313 |
| Conduit 14, vertical duct walls | x = 1348 and 1362, y from ≈ 560 down to ≈ 935 |
| "14" label and leader | x ≈ 1377, y ≈ 727, hooking left onto the duct |
| Node 5: trunk 85 upper wall arrives | y ≈ 928, from the left |
| Reservoir end block | x ≈ 1382–1420, y ≈ 868–935 |
| Cone valve 87 seat (partition in chamber 86) | x ≈ 728 |
| Chamber 86, right (supply) half | x ≈ 743–878 |
| Chamber 86, left (delivery) half | x ≈ 626–719 |

The trunk 85 enters the **right** half, conduits 88 leave the **left** half, and the cone sits in the
partition between them, its apex pointing right into the aperture. Hagmann confirms the two halves
independently by saying throttle 97 admits air "in den **linken** Teil der Windkammer 86 und die
Kondukte 88" (p. 100). Conduit 14 branches from the trunk far upstream of all of this.

**Confidence: high.** The duct is continuous, two-walled, unbranched, and its two ends are both
labelled.

---

## 6. The chain band, parts 87, 89, 90, 91, 92, 101

### What Hagmann says

p. 96: "Auf das Kegelventil 87 wirken in der einen Richtung die sich zusammenziehende Feder 89 und in
der anderen der Nuancierbalg 90, der mit dem Ventil durch ein über eine Rolle laufendes Kettenband
verbunden ist." And: "Je mehr das Kegelventil gegen seine Auflage gezogen wird, desto stärker
reduziert sich die an die Tonerzeugung vermittelte Saugspannung."

p. 97: "die Stellung des Kegelventils 87 wird aber noch von einem zweiten Balg kontrolliert, an
dessen beweglichem Teil das vom Kegelventil **über die Rolle des Nuancierbalgs** laufende Kettenband
befestigt ist – vom Regelbalg 91."

So: one band, three attachments, one roller, and the roller belongs to the Nuancierbalg.

### What the drawing shows

The horizontal element crossing wind chamber 86 is drawn as a **chain**: rigid segments with small
S-shaped links between them, which is why Hagmann calls it a Kettenband. Along its axis, left to
right:

| Feature | Native x | Note |
|---|---|---|
| roller on the Nuancierbalg's arm | 528 (centre), y ≈ 941 | disc on a bracket pinned to the moving board |
| chamber 86 left wall | ≈ 626 | the chain passes through it |
| circular aperture, left half | ≈ 655 | chain passes through its centre |
| chain eye / first link | ≈ 667–700 | |
| **cone valve 87**, drawn as ▷ with the apex right | 707–730 | seats into the partition at x ≈ 728 |
| chain link | ≈ 745 | |
| circular aperture, right half | ≈ 813 | |
| **spring 89**, zigzag | 845–875 | between the chain's right end and the chamber's right wall |
| chamber 86 right wall | 878–900 | |

The chain leaves the roller in two directions: **horizontally to the right** (y ≈ 933, to the cone
valve) and **downward, tilted about 11° to the right** (from ≈ (497, 952) to the wing nut **92** at
(533, 1135) on the Regelbalg's moving board). It wraps the roller's upper-left quadrant through about
90°. Tangent points on the drawing are consistent to within about 8 px, which is the freehand slop.

Spring **101** is drawn as a coil hanging from a hook on the Regelbalg's moving board at x ≈ 645–690,
y ≈ 1150–1235. Its lower anchor is not drawn. The Regelbalg's fixed leaf is the horizontal slab above
it (y ≈ 1010); its moving leaf is the sloping bar below, hinged at the **right** (≈ (923, 1020)) with
its free end at the left, so nut 92 sits at the maximum lever arm. The bore connecting chamber 86's
**left** (delivery) half to the Regelbalg is drawn as a dotted channel at x ≈ 626–645, running from
y ≈ 940 down into the Regelbalg. Conduits 88 continue down the same line below it.

### Is it a simple sum, and is the leverage equal?

**It is a sum, and it is not a 2:1 movable pulley.** A movable pulley gives a factor of two only when
the two runs are antiparallel. Here they are **perpendicular**: one goes right to the cone, one goes
down to the nut. Writing the band length as

```
L  =  |R→C|  +  |R→N|  +  (constant wrap)
```

with R the roller, C the cone end and N the nut, the cone's displacement is the sum of the two other
displacements resolved along their own runs, each with unit weight.

Taking the drawn coordinates at face value (hinge of the Nuancierbalg at (458, 1117), roller at
(528, 941), so a radius of 189 px; Regelbalg hinge at (923, 1020), nut at (533, 1135), radius 407 px):

- the roller's arc direction at the drawn position is (−0.93, −0.37), i.e. it moves left and slightly
  up as the bellows closes, and both components *lengthen* their respective runs, giving a gain of
  about **1.47** from Nuancierbalg board travel to cone travel;
- the nut's arc direction is (0.28, 0.96), almost exactly along its own run, giving a gain of about
  **1.0** from Regelbalg travel to cone travel.

So as drawn the Nuancierbalg has roughly one and a half times the authority of the Regelbalg per unit
of its own travel. **DRAWING for the structure, INFERENCE for the numbers, and I would not build on
the numbers.** Hagmann's note 29 on p. 62 applies: "Die Skizzen geben die pneumatischen Einrichtungen
nicht in ihrer tatsächlichen Anordnung wieder, sondern verstehen sich als schematische
Darstellungen." What survives that warning is the topology, which is worth stating plainly:

- **one inextensible band, no differential, no lever ratio other than the two hinge radii;**
- **the cone valve position is a monotone function of (Nuancierbalg travel) + (Regelbalg travel), with
  both signs positive** — both closing the Nuancierbalg and opening the Regelbalg pull the cone off
  its seat, i.e. make it louder;
- **the band is a chain, so it can pull but not push.** Spring 89 alone returns the cone to its seat.
  If the Nuancierbalg reopens faster than 89 can take up the slack, the chain goes slack and the cone
  is momentarily controlled by 89's own dynamics, not by the bellows. That is a one-way coupling with
  a possible lag on the fastest reopenings, i.e. exactly at a subito piano. **INFERENCE**, and it is
  the kind of thing that a schematic can suggest but not settle.

Signs check out against Hagmann in both directions. Nuancierbalg fully open ⇒ minimum vacuum, set by
nut 92 (p. 96); fully closed ⇒ cone valve wide open, maximum vacuum (p. 96); delivered vacuum falls
⇒ spring 101 "zieht sich zusammen und öffnet dabei das Kegelventil 87" (p. 97), which on the drawing
means the Regelbalg's board dropping, the vertical run lengthening, and the cone being pulled left off
its seat.

**One consequence for the model.** Because the two contributions are added on one band, "mezzoforte"
is a fixed position of the *Nuancierbalg*, not a fixed delivered vacuum. In a dense passage the
Regelbalg opens the cone further, and the same mezzoforte stop delivers a stronger blow. Anhang 12
control 2c even balances bass against treble at mezzoforte by moving the hook on 93, which shows that
Welte regarded the mf loudness as an adjustable quantity rather than a derived one.

---

## 7. The Mezzoforte hook, part 93 and its arm

`pneumatics.md` §8.3 could not read the engagement geometry and expected an open notch. **The better
image does not support a notch.** Both plates draw the same thing.

### What the drawing shows

**Anhang 13** (T-100). Part 93 is a thin wedge bellows hinged at the left, with the moving leaf on
top. Extrapolating the drawn taper, the hinge is at x ≈ 136 and the gap opens at about 0.129 px of
height per px of length. The moving leaf continues to the right as a plain single-stroke rod, which
turns **down** at x ≈ 442 and descends to y ≈ 872, ending **blunt**. At 11.5× magnification there is
no return, no foot, and no notch: it is an **L, i.e. a plain downward finger**, about 24 px long and
about 6 px thick (2.9 mm × 0.7 mm on the page).

**Anhang 14** (T-98) draws the identical arm and the identical plain downward finger. Since Hagmann
says the nuancing unit is common to both scales (p. 96), that is a second independent drawing of the
same part, and it agrees.

Facing it, the Nuancierbalg's moving board carries a **small upstanding pointed pin** at its top,
x ≈ 501–507, y ≈ 888–899 (about 6 px wide, 11 px tall). Anhang 14 draws the same pin, more clearly.
Hagmann's word for the mezzoforte stop is "**Dorn**" (p. 97) and Anhang 12 control 2c says
"**Haken**"; on the drawing the descending finger belongs to 93 and the pin belongs to 90, and they
meet side to side.

### Does it engage, and where

| Quantity | Native px | As a fraction |
|---|---|---|
| Nuancierbalg hinge | (458, 1117) | |
| Pin at rest (bellows drawn open) | (504, 890) | radius 229 px |
| Wedge included angle of 90, as drawn | ≈ 26° | full stroke of the pin ≈ 104 px |
| (assumes the plate draws 90 in its rest, i.e. fully open, state) | | |
| Finger, x | ≈ 442 | 55 px left of the pin ⇒ **≈ 53 % of full travel** |
| Finger, y, with 93 open | 848 → 872 | 16 px **clear above** the pin's tip |
| Drop of the finger when 93 closes | ≈ 39 px | |
| Finger, y, with 93 closed | 887 → 911 | fully overlapping the pin's height (888–899) |

Three readable results, all **DRAWING**, all subject to the schematic caveat:

1. **With 93 open the finger clears the pin's sweep; with 93 closed it does not.** The drawing shows
   a real clearance of about 16 px above the pin's tip in the rest state and a drop of about 39 px on
   closing. That is a coherent, deliberate-looking geometry, and it is the thing `pneumatics.md` could
   not read.
2. **The finger sits at about 53 % of the bellows' full travel from the open (piano) end.** Hagmann's
   "auf halbem Wege" (p. 97) is consistent with what is drawn, which is a modest but real
   corroboration given that he was describing an instrument and someone else drew the plate.
3. **It is a finger, not a notch.** A finger arrests the pin from whichever side the pin happens to
   be on when the finger comes down. It cannot capture the pin, and it cannot pull the bellows
   anywhere.

### The two arrest levels

The task asks whether the hook has a physical extent giving an upper and a lower arrest face. It does
have two arrest levels, but they come from the **two sides of the finger**, not from the top and
bottom of a notch:

- pin to the **right** of the finger and the bellows closing ⇒ arrested at x ≈ 449;
- pin to the **left** of the finger and the bellows opening ⇒ arrested at x ≈ 437.

The dead band between them is one finger diameter plus one pin diameter, about **12 px, i.e. roughly
11 % of the full stroke** at the drawn line weights. Which of the two applies is decided by where the
bellows was when mezzoforte was commanded, not by the direction of the last movement. Two riders,
both important:

- **Drawn line weight is not a dimension.** A 6 px pen stroke is 0.7 mm on a 211 dpi scan of a
  freehand schematic. The *structure* — two arrest levels separated by the finger's own thickness —
  is what the drawing supports; the 11 % is an order of magnitude at best, and the real value could
  as easily be 3 % or 20 %.
- If the model currently uses an upper and a lower face at different *heights*, that is the wrong
  axis. The two levels differ in the **bellows coordinate**, both reached at the same finger height.

### Fouling

If the pin is exactly under the finger when mezzoforte is commanded, the finger lands on the pin's
tip and 93 cannot close. The width of that window is about the finger's own diameter, roughly 6 px,
about **6 % of the full stroke**. That is narrower than `pneumatics.md` §8.3 feared, and the pin's
**pointed** tip is the sort of detail that would let a blunt finger cam past it rather than jam —
though whether that was the intent is **INFERENCE** and the drawing does not say. Treating the case
as "snap to mezzoforte", as `pneumatics.md` suggests, remains a defensible numerical choice.

### Timing of 93 itself

Unchanged from `pneumatics.md` §8.3, and now confirmed on the better image: conduit 54 carries no
throttle symbol, where 39 and 23 each feed a numbered adjuster (98, 99). Anhang 12 has no control that
times the mezzoforte bellows, only control 7, which checks that it *opens* on release. **No adjuster,
no norm, no number**; treating the finger's descent as fast relative to the Nuancierbalg is
reasonable. **INFERENCE.**

---

## 8. Bore ratios: still not measurable, and now for a stronger reason

A firm negative, as requested.

**Conduits.** Conduits 23, 33, 39, 54 and their neighbours are drawn as **single pen strokes**, not
as walled channels. Measured as ink runs across clean straight sections:

| Where | Measured stroke widths (native px) |
|---|---|
| the six nested horizontal conduits at the top left, sampled at x = 340, 360, 380, 450, 500, 550, 600 | 3, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 4, 4, 5 |
| the eight vertical conduits down the left margin, sampled at y = 700 and 800 | 4, 4, 4, 4, 4, 5, 4, 4 / 5, 6, 6, 5, 5, 5, 4, 5 |

Every conduit on the sheet is between **3 and 6 px** wide (0.36–0.72 mm), and the variation is the
pen and the scan, not the drawing. Where two lines run close together they are two independent
conduits turning their corners at different heights, not the two walls of one channel; that is
visible directly at 6× on the left margin.

The decisive point is not the resolution. **Hagmann states in words that conduit 23 is wider than
conduit 39** ("die im Vergleich zur Kondukte 39 breiter dimensionierte Kondukte 23", p. 99) and that
39 is "mittelbreit" (p. 98). The drawing shows no such difference at all. So the plate demonstrably
does not encode bore in stroke width, and any ratio taken from it would be invented.

**Throttles.** 96, 97, 98, 99 and 100 are drawn as small slots in a wall with an adjusting element,
their drawn heights between **13 and 17 px**. They are symbols for "adjustable orifice" and show no
seat diameter. 98 and 100 additionally carry the pen annotations "Cresc.F." and "Cresc.P." on the
T-100 plate.

The only relative-size information in the whole source remains verbal, and it is the same three
statements `pneumatics.md` already has: 23 > 39, 39 is medium, and bore 100 is a supplement too small
to substitute for 39. Nothing at all about 54.

---

## 9. What an emulator is missing

Ordered by how much I think it matters for the shape of a fitted curve. The model as described
already has: gradual tracker-port opening, latching relay valves, parallel conductances summing, a
travel-dependent flow law, a mechanical stop at mezzoforte, mass in the bellows and linkage, and a
fitted lead.

**1. Every rate in the chain scales with the trunk vacuum, and the trunk vacuum is not constant.**
Conduit 14 taps upstream of the cone valve (§1.2), so the pressure that closes the Nuancierbalg is
the supply vacuum, which sags under dense playing once the reservoir's buffer is spent, steps when
the roll commands the other blower stage (Widerstand, lines 9/10), and is clamped at the top by the
safety valve. *Observable consequence:* crescendo and sforzando ramps are slower in loud, thick
passages than in thin ones, at identical punched commands; the slope of a ramp is therefore
correlated with the note density around it, and a model with constant conductances will systematically
over-predict the rate in tutti passages and under-predict it in thin ones. This is also the one place
in the whole path where the note data feed back into the expression curve.

**2. The forte end is a soft limit, not a stop.** The bellows closes against its own spring (p. 96),
so full closure requires the vacuum to exceed what the spring demands. *Observable consequence:* the
top of the range compresses when the vacuum sags, and a long forte passage may sit slightly below the
modelled ceiling rather than pinned to it.

**3. The relay fires on a puff and has a duration threshold.** Hagmann's "Luftstoss" (p. 98); Anhang
12 control 4b requires six short perforations to give six steps and six shorter ones to give none.
*Observable consequence:* very short perforations produce nothing, medium ones produce partial steps,
and the step size grows with perforation length up to saturation. A model in which "valve open while
hole open" will fire on every punch and will over-respond to the shortest ones. The threshold is
itself a regulated quantity (bore 20 on the T-100), so it is a legitimate free parameter.

**4. Valves release gradually, with a bleed-set tail.** "so senkt sich das Doppelventil 47 in jenem
Masse, als die Membrankammer 44 über die Bohrung 46 evakuiert wird" (p. 99). *Observable consequence:*
the effect of a command outlasts its perforation by a fitted time constant, and the conductance during
that tail is partial rather than full, so the trailing edge of every ramp is rounded rather than
square. Anhang 12 control 4e norms the sforzando-off tail at bore 29, so this is a real, adjusted
quantity and not an idealisation.

**5. The Regelbalg is on the same chain and moves on the note-attack timescale.** It senses the
delivered vacuum through a bore into the left half of chamber 86 and pulls the cone valve open when
that vacuum falls. *Observable consequence:* it puts fast, note-correlated wiggles into the cone
valve and hence into the loudness, while leaving the Nuancierbalg untouched. This is a discriminator
for what a drawn line records: a bellows-position trace cannot contain those wiggles; a
loudness-or-vacuum trace must. It also means "mezzoforte" is not a fixed loudness.

**6. The mezzoforte stop has two arrest levels and a fouling window.** §7. *Observable consequence:*
the mezzoforte plateau sits at a slightly different level depending on which side the bellows was on
when the command arrived, by something of the order of a tenth of the range, and a narrow band of
initial positions where the mezzoforte bellows cannot close at all. Also, the mf position is a
regulated quantity (Anhang 12 control 2c adjusts the hook to balance bass against treble), so it
should be a free parameter per side, not 0.5.

**7. The chain pulls but does not push.** Spring 89 alone reseats the cone. *Observable consequence:*
on the fastest reopenings, the cone valve lags the bellows, so a bellows-position model and a
loudness model diverge most at exactly the subito-piano transitions that are otherwise the sharpest
features in the curve.

**8. The paper does not move at a constant rate, beyond spool acceleration.** The Windmotor's
regulating valve compensates for the varying glide-block vacuum but "die Stockungen im Transport des
Notenbandes vermag sie nicht vollständig zu vermeiden" (p. 78). *Observable consequence:* a
position-dependent error on the *time* axis, correlated with loudness, which a single fitted lead
cannot absorb because it is not constant. If a fit shows the lead drifting with dynamic level, this
is a candidate cause.

**9. Throttle 97's separate dump on the delivery side.** Already in `pneumatics.md` §8.2.
*Observable consequence:* at every sforzando-off, a sharp downward spike in delivered vacuum that
partly recovers when the perforation ends, on a shorter time constant than the bellows' reopening,
and invisible in a bellows-position trace.

**10. Bass and treble load one another through the shared trunk.** Two complete, independent nuancing
units on one blower (p. 96). *Observable consequence:* a loud left hand slows the right hand's
crescendo. Small, but it is a cross-coupling that a two-independent-channels model has no way to
produce.

**11. Downstream, affecting the loudness map rather than the bellows curve.** The Vorverstärker is a
servo whose output vacuum is a nonlinear, spring-adjustable function of the nuanced vacuum (pp.
104–105); the striking bellows 121 converts vacuum to hammer velocity through its own closing rate
("mehr oder minder rasch", p. 105); and the Hammerleiste (lines 7/8) shifts the hammer rail
independently of everything above. None of these can be fitted from a bellows-travel curve, but all
of them stand between the fitted curve and anything audible.

---

## 10. Magnitudes, such as they are

There is still no figure in seconds or millibars for any nuancing movement on the piano. What exists:

| Quantity | Value | Where |
|---|---|---|
| Recommended playback tempo | "Tempo 70" | p. 85, quoting Welte 17 |
| Tempo calibration | the span between the two extra control tones of Kontrolle 1 must be covered "im Verlauf einer halben Minute" at normal tempo | p. 84 |
| Kontrolle 1, T-100 | scale 1C–g⁴ = 80 notes in p, control tones c³ at 1C and e³ at c¹ ⇒ Tempo 70 | Anhang 12, p. 180 |
| Crescendo p→mf and back | marked by control tone c³ at mezzoforte and C at the end of the movement | control 3 |
| Sforzando p→mf and back, four times | opening and closing "in gleicher Geschwindigkeit" | control 4a |
| Sforzando-on step size | six short perforations = p to mf; six shorter = nothing | control 4b |
| Sforzando-off | long perforation = full return to p; short = partial; three short = three steps to p | controls 4c, 4d, 4e |
| mf→p and f→p | must reach piano "im vorgeschriebenen Zeitraum" between named control tones | controls 2b, 5 |
| Nine Sforzando an-ab pairs | should hold the bellows at mezzoforte | control 6c |
| Repetition rate | up to 8/s in p, up to 12/s in mf | p. 105 |
| Perforation ∅ | 2.2 mm (rot-alt, to c. 1910), 1.8 mm (rot-neu); step 0.9 mm, pitch 3.2 mm | p. 76 |
| Blower | two motor speeds, roll-selected on the T-100 | pp. 73–75 |
| The one vacuum figure in the book | 28 mbar, and it is the **organ's** magazine bellows | p. 72 — do not carry it over |

Every nuancing duration in Anhang 12 is defined by the distance between marker tones on the
Skalarolle. If a T-100 Skalarolle (Welte 17) can be obtained and scanned, controls 2b, 3, 4a and 5
would yield the four principal rate constants directly, in roll steps, which at a known tempo become
seconds. That remains the single most valuable missing measurement.

---

## 11. Where this document disagrees with `pneumatics.md`, and what stays open

### 11.1 Does Sforzando-on latch? The sources split by type, and the drawing is weaker than it looks

`pneumatics.md` §1 calls this "the largest single uncertainty in the model" and comes down, with
reservations, on Hagmann's prose (p. 99: "Und auch hier wird die Funktion aufrecht erhalten, selbst
wenn die entsprechende Perforation verschwindet"), noting that Anhang 12 control 4b is compatible
with either reading. On the better image and the full German of Anhang 12, I do not think it is.

#### (a) Anhang 12: four separate statements, all against a latch

Verbatim, and every one of these is a **T-100** control (4b's correction names the T-100 adjuster
explicitly, and 6a–6c are Monteur-Rolle controls with no T-98 variant noted).

> **4b** "Kontrolle der Bewegung **Sforzando an**… Im Bass und Diskant gleichzeitig Eingabe von sechs
> kurzen Perforationen Sforzando an: Die Nuancierbälge 90 müssen sich **in sechs Schritten** von der
> Piano- zur Mezzoforte-Stellung bewegen. **Nach Rückfall in die Piano-Stellung** Eingabe von sechs
> noch kürzeren Perforationen Sforzando an: Die Nuancierbälge 90 dürfen sich nicht bewegen. — Wird
> die Mezzoforte-Stellung **zu früh oder zu spät** erreicht, Korrektur an 20 (T 100) oder 82 (T 98)."

Four things in that one control:

1. **Six steps, not one movement.** A latch set by the first perforation would drive the bellows
   continuously to forte at sforzando speed. Six discrete steps is per-pulse integration.
2. **They stop at mezzoforte.** Six short pulses sum to half the range. Under a latch the endpoint
   could not depend on how many pulses there were.
3. **"Nach Rückfall in die Piano-Stellung."** The bellows returns to piano between the two halves of
   the test, and no cancelling command is named. Hagmann does name cancels elsewhere in the same
   group ("Eingabe von Crescendo und Sforzando ab", 4c/4d/4e; "Sforzando an-ab", 6a/6c), so the
   omission here is meaningful, though not proof.
4. **The correction clause presupposes per-pulse behaviour.** "Zu früh oder zu spät" erreicht — bore
   20 is being used to trim *how much travel each pulse buys*. Under a latch, bore 20 could only set
   whether the valve fires at all; there would be no early or late mezzoforte to correct.

> **6b** "…Anschliessend Eingabe von 5 kurzen Perforationen Sforzando an: **Trotz des automatischen
> Eintritts der Decrescendo-Bewegung** müssen die Bälge immer wieder die Forte-Stellung erreichen."

An automatic decrescendo after a Sforzando-an perforation ends is what a momentary valve gives, with
the bellows reopening through conduit 39 and bore 100.

> **6c** "Im Bass und Diskant 9x Eingabe von Sforzando an-ab: die Nuancierbälge 90 sollen sich stets
> auf Mezzoforte-Stellung halten."

Nine on-off pairs holding the level at mezzoforte is a balance of nine equal closing and nine equal
opening increments. Under set-and-cancel, eight of the nine pairs would be doing nothing.

> **6a** "Eingabe von Crescendo: Die Nuancierbälge 90 bewegen sich langsam vom p zum f. Gleichzeitig
> 5x Eingabe von Sforzando an-ab: Trotz der Eingabe von Sforzando-Bewegungen sollen sich die
> Nuancierbälge vollständig schliessen."

And, for completeness, the other side of the group, which is about **Sforzando ab** and is where the
"steps" the earlier summary attributed to the off-line actually belong: 4c long perforation → full
return to piano; 4d short → incomplete return, corrected at 96; **4e** three short single
perforations → "fallen in drei Schritten vollständig in die Piano-Stellung zurück", corrected at 29
(T-100) / 70 (T-98).

So the earlier reading was right on the assignment: **4b is on the on-line with adjuster 20, 4e is on
the off-line with adjuster 29.** In both cases the test perforations are described as short pulses
("kurze Perforationen", "kurze Einzelperforationen"), explicitly contrasted with the "lange
Perforation" of 4c. Both lines behave per pulse and both accumulate.

#### (b) The drawing: valve 22 does have a hold chamber, but the drawing cannot testify about it

I looked for the escape route — that "das (einfache) Ventil 22" means a plain valve with no hold —
and **the drawing does not offer it.**

The Sforzando-on unit is drawn with the full latching arrangement: an outer box at x 368–470,
y 388–470 divided by a **membrane** (the usual two-humped wavy line, y ≈ 424–432) into an upper
compartment **25** and a lower compartment **24**; a **wire** running down from the membrane at
x ≈ 419 through the floor to the valve; a narrow vertical **passage 26** up the box's right side; and
a two-wall **conduit leaving the box's right side at the height of the lower compartment**
(y ≈ 439–449), running right and turning down at x ≈ 520 into the Sforzando-off unit. That last is
conduit **32**, and it does exactly what Hagmann says the crescendo's 48 does.

I also compared the valve glyphs pixel by pixel. Valve 22 (y 526–541) and valve 38 (y 530–545) have
the same three-band, two-gap section, the same 16 px height, the same width. **The plate does not
distinguish a "single" valve 22 from the "double" valve 38 in any way I can resolve** — which is
itself a text/drawing disagreement, at precisely the point in question.

**But the drawing's testimony collapses under a simple test.** Taking the Sforzando-on unit as a
110 × 155 px block and sliding it across the sheet:

| Comparison | Best intersection-over-union | Offset |
|---|---|---|
| Sf-on vs **Cresc-on** | **0.66** | dx = 331, dy = 4 |
| Sf-on vs **MF-on** | **0.65** | dx = 663, dy = 8 |
| Sf-on vs an arbitrary nearby offset (dx = 200 / 250 / 400 / 450) | 0.14 – 0.21 | – |
| Sf-off vs Cresc-off | 0.45 | dx = 331, dy = 4 |

The three "on" units are **one hand-drawn module repeated at a pitch of 331 px** (0.66 rather than
1.0 because it is redrawn by hand, not copied, but far above the background). The Sforzando-on hold
chamber is therefore not an independent observation about the sforzando: it is what you get by
drawing the module a third time. Add the provenance from §0 — the T-100 plate is "Nach Welte 2", a
**T-98** manual — and the plate cannot settle a question about the T-100 relay's finest detail.

#### (c) What cancels the hold, if it is there

Everything reaching the unit, traced on the drawing: conduit 18 up from the Gleitblock into membrane
chamber 19; bleed bore 20; the ports to wind chambers 15 and 17; conduit 23 out to the Nuancierbalg;
passage 26 up to compartment 25; conduit 32 in, from valve 31, at the height of compartment 24.
**I can find nothing else** — no second bore on either compartment, no connection to the crescendo
unit, nothing that would leak the hold away on its own. If the latch is drawn as it appears, only
opening 11 releases it.

That said, a leak would not need to be drawn to exist. The hold is a pressure difference maintained
through a narrow passage; any real leakage in that circuit gives a decay, and a schematic redrawn
from another instrument's manual would not show it.

#### (d) My reading

**The sources split by type, not by weight of assertion.**

- Hagmann's chapter prose says latch, but says it entirely by analogy: "In gleicher Weise arbeitet
  das (einfache) Ventil 22 … Und auch hier wird die Funktion aufrecht erhalten." He describes the
  latch mechanism once, for the crescendo, and extends it.
- His plate says latch, but the plate is after a T-98 manual and draws the sforzando unit by
  repeating the crescendo module.
- **Anhang 12 says per pulse, four times, and Anhang 12 is Hagmann transcribing Welte 17, the
  Skalarolle booklet for the T-100** (his footnote 53, p. 108). It is Welte's account of what the
  instrument does, not a reconstruction of how it works.

On that reading I would take the T-100 Sforzando-on as **acting per pulse**, and treat Hagmann's
"die Funktion wird aufrecht erhalten" as an over-generalisation from the crescendo carried by a
repeated drawing. The fit on 3309 and the punching statistics point the same way, and Anhang 12
control 6b describes the editor's practice directly: repeated short Sforzando-an perforations worked
against a decrescendo that sets in by itself.

**I have not reconciled the drawing with Anhang 12, and I do not think they can be.** What I can say
is that they are not two independent witnesses of equal standing.

One intermediate possibility worth naming, because the fit can test it: **a latch that decays.** If
the hold circuit leaks, the valve stays up for a while after the perforation and then falls, which is
per-pulse behaviour with a longer effective pulse. If the best-fitting momentary model wants an
effective pulse noticeably longer than the punched perforation, that is the signature. It would also
explain why the editor re-punches while a set-and-cancel latch would already be engaged.

### 11.2 The hook is a finger, not a notch

`pneumatics.md` §8.3 read Anhang 13 as showing "a hook that curls downward and back up, forming an
open notch", while noting that the engagement geometry could not be read at that reproduction's
resolution. At 11.5× on the native bitmap there is no return and no notch: a plain L-shaped finger
with a blunt end, and Anhang 14 draws the same. The consequences differ, as set out in §7: a notch
would capture the board and hold it in both directions with free play equal to the notch depth; a
finger gives two arrest levels separated by its own thickness, and cannot capture anything.

### 11.3 Bore ratios: same conclusion, firmer ground

`pneumatics.md` §8.4 reached the same negative. This reading adds the decisive argument: Hagmann's own
text asserts a width difference between conduits 23 and 39 that the drawing does not show. The
drawing therefore provably does not encode bore.

### Still open

- Whether T-100 Sforzando-on latches (§11.1). My reading is that it does not, on the strength of
  Anhang 12 against a plate that repeats one drawn module and a text that argues by analogy. The
  remaining question is whether it is cleanly momentary or a latch that decays, which the fit can
  test through the effective pulse length.
- Any absolute time or vacuum figure for the piano. There are none, and none can be measured off the
  plates.
- The reservoir's time constant and stored volume, and therefore how deep and how fast the trunk
  vacuum actually sags. Hagmann gives the mechanism and no numbers. This is the quantity that item 1
  of §9 needs, and it would have to come from a surviving instrument or from the Welte manuals.
- What a drawn nuancing line records. `pneumatics.md` §5 and §8.2 give two discriminating tests; §6
  above adds a third, the Regelbalg's note-rate wiggles, which cannot be present in a bellows-position
  trace and must be present in a vacuum or loudness trace.
