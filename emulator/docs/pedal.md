# The T-100 pedal action after Hagmann 1984

Companion to `docs/pneumatics.md`, which covers the nuancing mechanism and states the source
conventions this document follows. Same citation convention: `p.NN` is the printed page, which
in this PDF coincides with the PDF page number; **HAGMANN** marks his claim and **INFERENCE**
marks mine. The chapter is "Tonerzeugung und Pedalbewegung", pp. 103–107, and the plate is
Anhang 16, p. 189.

Everything below is the **T-100**, the red roll. The T-98 differs in the Vorpneumatik and only
there, and where that matters it is said.

---

## 0. Source criticism first

Anhang 16 is captioned "Skizze zur Pedalbewegung beim Welte-Mignon-Klavier T 100 … Nach Welte
2", and **Welte 2 is the *Betriebsanleitung* for the T 98** (bibliography, s.v.). So the plate
for the T-100 pedal is redrawn from a T-98 manual. This is the same provenance as Anhang 13
and `docs/pneumatics.md` already flags it there.

Hagmann tells the reader how far that is safe, and it is worth quoting because it licenses
exactly one half of the drawing and not the other (p. 106):

> "Dabei manifestieren sich die Unterschiede zwischen der älteren und der jüngeren
> Skalenteilung – damit der Nuancierung entsprechend – nur im Bereich der Vorpneumatik; die
> Anordnung der Ventile und Bälge, die zur Ausführung der Bewegungen dienen, ist dagegen in
> beiden Systemen dieselbe."

So the **Hauptpneumatik** — parts 9–20, everything from the latch outward to the two pedals —
is common to T-100 and T-98 and can be read off a T-98 source without apology. The
**Vorpneumatik** is the part Hagmann had to adapt, and it is the part where his drawing turns
out to be wrong about the T-100. Section 3 settles that from the roll.

One further trap, already noted in `docs/pneumatics.md`: Anhang 16's Hauptpneumatik numbers
7–20 are **its own**. Its "20" is the Pianopedal throttle and has nothing to do with Anhang
13's bleed bore 20; its "7" is the conduit from the blower and has nothing to do with roll
line 7. Its Vorpneumatik, by contrast, is drawn with Anhang 13's numbers 34–63 unchanged,
which is the visual signal that Hagmann simply reused the nuancing relay drawing there.

---

## 1. Which lines

Anhang 10, p. 178, the Blockskala T 100:

| Roll line | Function | Edge | SUPRA MIDI key |
|---|---|---|---|
| 7 | Hammerleiste **ab** | bass | 20 |
| 8 | Hammerleiste **an** | bass | 21 |
| 93 | Pedal **an** | treble | 106 |
| 94 | Pedal **ab** | treble | 107 |

And in prose (p. 106): "Bei den roten Rollen (T 100) dienen dazu die Linien 7 und 8 (für die
Verschiebung der Hammerleiste) sowie 93 und 94 (für die Anhebung der Dämpfer), während bei den
grünen Rollen (T 98) die Linie 3 für das rechte und die Linie 96 für das linke Pedal
vorgesehen sind." **HAGMANN.**

Two consequences.

- Both pedals are **an/ab pairs on the T-100**, so both are latches, exactly like Mezzoforte
  and Crescendo, and both follow the negation-outboard rule set out in `docs/pneumatics.md`:
  on the bass edge the odd line is the cancel and the even line the set, on the treble edge the
  higher number is the cancel. The T-98 collapses each pair onto one line — "weil die
  Informationseingabe und deren Negation über ein und dieselbe Position des Gleitblocks
  erfolgen" (p. 106) — and there the perforation is held for the duration. **Reading a T-98
  rule onto a T-100 roll would turn every 60 ms trigger punch into a 60 ms pedal.**
- **What the Hammerleiste physically does is not settled, and should not be over-stated.**
  Hagmann's word is always a shift — "die Verschiebung der Hammerleiste" (p. 105), "der Balg
  19, der die Hammerleiste verschiebt" (p. 106), never *heben*. But **the words *una corda*,
  *Saitenverschiebung*, *Moderator* and *Pianozug* do not occur anywhere in the dissertation**,
  and he nowhere distinguishes Flügel from Klavier on this point; the one place he has both in
  view is a general remark about regulation, that the throttles serve to fit the pneumatics
  "dem Gang der Mechanik des jeweiligen Klaviers oder Flügels" (p. 107). Against the grand
  reading: the Welte-Piano from 1908 was built into *Pianinos* (pp. 91–92), the Vorsetzer drives
  the host instrument's own pedals through "zweier Stangen für die beiden Pedale" (p. 91) so
  line 7/8 means whatever that piano's left pedal does, and the Welte-Flügel arrives only in
  spring 1920 (p. 92 note 12) against the T-98 in 1924 — so most of the T-100's service life is
  uprights and Vorsetzer. Control 8b cuts the same way: its test turns on "mit Dämpfung" and
  "ohne Dämpfung", which is hammer-rail muting vocabulary rather than action-shift vocabulary.
  **CC 67 is the right destination because it is the soft-pedal controller, not because the
  device is an una corda.** **INFERENCE**, and a weak one either way.

---

## 2. The mechanism

### 2.1 Fortepedal, the dampers

Vorpneumatik latch on lines 93/94, then a relay of its own, then the bellows. Hagmann,
pp. 106–107, in full because every adjuster in the model comes out of this paragraph:

> "Etwas komplizierter gestaltet sich der Ablauf der Bewegungen beim Fortepedal, das über ein
> zusätzliches Relais angesteuert wird. Dringt Saugluft über die Kondukte 10 in einer von der
> Drossel 11 beeinflussten Menge in die Membrankammer 12, so werden die Membran 13 und das an
> ihr befestigte Doppelventil 14 nach oben gezogen; die Ventilkammer 14 wird damit gegen die
> Aussenluft heranführende Bohrung 15 verschlossen, um gleichzeitig nach der Kondukte 16 hin
> geöffnet zu werden, die von der Kondukte 7 her jenen Saugwind vermittelt, der in den Balg 18
> eindringt und dessen Schliessung bewirkt – die Dämpfer werden angehoben. Solange dem Relais
> über die Kondukte 10 Saugwind mitgeteilt wird, bleibt die Funktion aufrecht erhalten; wird
> die Zufuhr von Saugwind jedoch unterbunden, so stellt sich das Relais wieder in seine
> Ausgangsposition ein, sodass über die Kondukte 15 Aussenluft einströmt, welche die von der
> eingebauten Balgfeder erzeugte Oeffnung des Balgs 18 ermöglicht. Dabei kann mit Hilfe der
> Drossel 17 die Menge der einströmenden Luft dergestalt reguliert werden, dass sich die
> Oeffnung des Balgs 18 in derselben zeitlichen Ausdehnung abspielt wie seine Schliessung."

| Part | What it is | Where it acts |
|---|---|---|
| 10 | conduit from the Vorpneumatik latch | carries suction when the latch is set |
| **11** | **throttle** | meters the filling of chamber 12 — the delay on both edges |
| 12 | membrane chamber | |
| 13 | membrane | lifts when 12 has been drawn down far enough |
| 14 | double valve | seals atmospheric bore 15, opens conduit 16 |
| **15** | bore to atmosphere | the return path into bellows 18 |
| 16 | conduit from blower conduit 7 | the vacuum that closes bellows 18 |
| **17** | **throttle** on 15 | meters the return — the fall of the dampers |
| 18 | bellows | closes → the dampers rise |

Note what is **not** in that list: there is no adjuster on conduit 16. So on the way up the
only metered element is throttle 11, and on the way down it is throttle 11 and then throttle
17. Welte's own regulation instructions send the technician to exactly those two, and to no
third (Anhang 12, p. 185):

> **9b** "Kontrolle der Geschwindigkeit der Pedal-Bewegung. Tonfolge a1 – g1 – f1 – e1 im mf,
> wobei die Dämpfer vor dem Erklingen des einzelnen Tons angehoben, danach aber abgesenkt
> werden: Die vier langen Töne sollen dadurch sauber voneinander getrennt sein. **Senken sich
> die Dämpfer nicht schnell genug auf die Saiten, Verstellung von 17.**"
>
> **9c** "Kontrolle der Geschwindigkeit der Pedal-Bewegung. Tonfolge a1 – b1 – h1 – c2 im mf,
> wobei die Dämpfer mit dem Erklingen des einzelnen Tons angehoben, danach aber wieder
> abgesenkt werden: Die vier kurzen Töne sollen dadurch sauber miteinander verbunden werden.
> **Heben sich die Dämpfer nicht schnell genug von den Saiten, Verstellung von 11.**"

That is a clean division of labour, and it is what `src/model/pedal.ts` implements: **11 sets
the rise, 17 sets the fall.** **HAGMANN** for the parts and the two instructions, **INFERENCE**
for reading them as the rate-limiting elements of the two directions.

### 2.2 Pianopedal, the hammer rail

> "Die Hauptpneumatik des Pianopedals ist auffallend einfach gebaut: Der Balg 19, der die
> Hammerleiste verschiebt, wird direkt über die Kondukte 9 angesteuert, wobei sich hier die
> Zufuhr von Luft beziehungsweise Saugspannung mit Hilfe der Drossel 20 regulieren lässt."
> (p. 106)

One bellows on one conduit with one throttle governing air and suction alike, so one time
constant in both directions and no second relay. Control 8b adjusts it: "Kontrolle der
Geschwindigkeit der Hammerleisten-Bewegung … Ist die Dämpfung beim Erklingen des zweiten
Akkords nicht aufgehoben, Verstellung von 20."

Footnote 49 cites this as "**Kontrolle B**". The letter is genuinely in the printed text and is
not an OCR artefact, but it is a slip for 8: there are no lettered controls on the piano scale
rolls at all — the lettered scheme belongs to the organ rolls of Anhang 26 — and p. 109 says
outright, "Die Kontrollen 8 und 9 schliesslich dienen der Ueberprüfung des linken und des
rechten Pedals." 8b is also the only control anywhere that names throttle 20. **INFERENCE**,
but a safe one.

---

## 3. Where the drawing is wrong, and how the roll settles it

Anhang 16 shows four Vorpneumatik relays. In each pair the left unit carries the hold chamber
that makes it a latch and the right unit releases it, and the glide-block openings are
lettered left to right in **ascending numeric order**: 93, 94 for the dampers and 7, 8 for the
hammer rail. For the dampers that is right, because 93 is the "an". For the hammer rail it
puts the latch on line 7, which Anhang 10 calls "Hammerleiste **ab**".

The roll decides it, and decisively. On roll 3309 (SUPRA `jq774vx6544`):

| Line | Function per Anhang 10 | Punches | Median length |
|---|---|---:|---:|
| 93 | Pedal an | 267 | 60 ticks ≈ 100 ms |
| 94 | Pedal ab | 266 | 56 ticks ≈ 94 ms |
| 8 | Hammerleiste an | 2 | 68, 73 ticks |
| 7 | Hammerleiste ab | 1 | 74 ticks |

- The 533 damper punches alternate 93, 94, 93, 94 … with **one** same-line adjacency in 532
  transitions; the first is a 93 and the last a 94. Nothing but a set/cancel pair does that.
- Every punch is short. Nothing on either pedal line is held, so neither pedal can be read as
  a held perforation on the T-100.
- The hammer rail occurs three times, in the order 8, 8, 7 — an "an", a retrigger, and an
  "ab". Under the drawing's labelling it would read "ab, ab, an", which would begin by
  cancelling something that had never been set and would leave the rail shifted at the end of
  the roll.

So **Anhang 10 is right and the bass pair of Anhang 16 is drawn un-mirrored.** Hagmann states
the mirroring himself, at p. 98 note 28: "Für den auf der linken Seite des Gleitblocks
befindlichen Bass-Bereich gilt dasselbe in spiegelbildlicher Reihenfolge." The sketch simply
does not carry it out, and lays the bass pair left to right in ascending line number as it does
the treble pair. The mechanism in the plate is unaffected; only which opening feeds which unit
of the bass pair is. `src/roll/expression.ts` already followed Anhang 10, and this is the
confirmation.

---

## 4. What Hagmann says about nuance, and what follows

The one passage that speaks directly to a continuous pedal is his answer to Canby's charge
that the Welte cannot reproduce nuanced right-pedalling (p. 112):

> "Tatsächlich enthält die pneumatische Einrichtung zur Bewegung des rechten Pedals keinerlei
> sichtbare Möglichkeit der Nuancierung; die Dämpfer werden stets in derselben Geschwindigkeit
> und immer vollständig von den Saiten abgehoben. Immerhin ist zu vermuten, dass sich etwa
> Halbpedaleffekte wie bei der Steuerung des Nuancierbalgs durch Ueberlagerung der
> verschiedenen vom Notenband ausgehenden Befehle erzielen lassen."

Read carefully this is a constraint and an opening at once, and the model has to honour both.

- **There is no depth control.** No line, valve or throttle sets *how far* the dampers rise.
  Every command drives the bellows to one of its two ends, at the one regulated speed. So a
  pedal model with a variable target would be inventing a device the instrument does not have.
- **But the travel takes time.** A bellows filling through a conduit is the same object as the
  Nuancierbalg, and the roll asks for pedal changes at intervals that are of the same order as
  that time. Every position between the two ends the mechanism ever occupies is a position it
  is passing through, and Hagmann's own guess is that the overlaying of commands is where
  half-pedal effects would have to come from.

### 4.1 Out of scope: what the pianist did

**This model takes the punched code as its input and the pneumatics as its subject.** What the
recording pianist's foot was doing, and how faithfully the punching represents it, is a
different question and nothing here bears on it either way. The note is here only so that the
continuous output is not mistaken for a claim about the performance.

For the record, Hagmann leaves that question closed: the recording method "bleibt ein Rätsel,
dem nicht auf die Spur zu kommen ist" (p. 55); what he *does* commit to (p. 54) lists pitch and
duration and pointedly not the pedal; the one contact-capture description of pedals
(Gebrauchsmuster 247 842) is not a Welte document but an analogy he offers (p. 55); no Welte
piano master rolls survive (p. 70 note 48), so editing cannot be checked; and continuous pedal
capture is documented in the book only for the Ampico (p. 63f.). König's suspicion that Welte
punched the hammer rail where the pianist had not used the left pedal (p. 113) belongs to the
same closed question.

None of that constrains the mechanism, which is what is modelled.

---

## 5. The model

`src/model/pedal.ts`. Same flow law as the Nuancierbalg, since it is the same kind of device:

```
dx/dt = g · sign(T − x) · |T − x|^α
```

with `x` the closure of the bellows, `T` ∈ {0, 1} the end the current command drives towards,
and `g` the conductance of whichever path is open. `α` is carried over from the nuancing fit
(1.02 bass, 0.77 treble; the default here is their mean, 0.9). The damper adds one element
that the Nuancierbalg does not have: membrane chamber 12 filling through throttle 11, with
valve 14 flipping when it has crossed half its span, which is a delay on both edges and the
same delay on each, since one throttle meters both directions.

| Parameter | Part | Default | Where the default comes from |
|---|---|---:|---|
| `alpha` | — | 0.9 | mean of the two fitted Nuancierbalg exponents |
| `relayLagMs` | throttle 11, chamber 12 | 60 ms | a third of the budget below, per §2.1 |
| `liftMs` | conduit 16, bellows 18 | 120 ms | the rest of it |
| `fallMs` | bore 15, throttle 17 | 120 ms | equal to the rise, per p. 107 |
| `shiftMs` | throttle 20, bellows 19 | 180 ms | no constraint at all; see below |

**None of these is fitted, and none can be.** The drawn *Handnuancierung* lines on roll 3309
record the Nuancierbälge; there is no drawn line for either pedal, so there is nothing to score
a pedal model against. What the defaults have instead is a bound from two directions:

- **From the roll.** The shortest release-and-retake of the damper pedal on 3309 is 212 ms from
  the "ab" punch to the next "an"; the fifth percentile of the 267 lifts is 248 ms and the
  median 331 ms. The shortest press is 150 ms and the median 693 ms. An editor does not punch a
  lift the instrument cannot make, so a full fall much beyond 200 ms is hard to defend.
  **INFERENCE**, and the weakest link in the chain — it assumes the punching is competent.
- **From Welte.** Controls 9b and 9c require four notes of a moderate figure to be cleanly
  separated by the pedal and four short ones to be joined by it, at the scale roll's tempo 70
  (control 1). That is the right order of magnitude and no more, because neither control names
  the note values of its own figure.

`shiftMs` has neither bound — control 8b gives a criterion but the scale roll's two test chords
carry no timing — so it is a placeholder, set slower than the damper because bellows 19 pushes
the whole hammer rail through one throttle.

**Not modelled:** the moving mass of the damper action, which would round the corners of every
traversal. The nuancing model needs an `inertiaMs` of 41–57 ms for the far lighter cone valve,
so the damper rail certainly has one, but with no line to fit it against a guessed second-order
term would be decoration. The map from damper lift to how much a given string is still damped
is a property of the piano, not of the Welte, and is left to whatever renders the MIDI.

---

## 6. Output, and how much of it survives the assumption

`node src/cli/pedal.ts --sweep` writes a MIDI file with continuous CC 64 for the dampers and
CC 67 for the hammer rail, and prints what follows. On roll 3309 at the defaults the controller
stream uses all 128 values of CC 64 and runs to 35,352 messages, one per change of the
quantised travel, which is a run-length encoding and so loses nothing a controller can carry.

Two things have to be kept apart, because they are supported very differently.

**The ramp is certain.** Every one of the 533 pedal commands becomes a traversal of roughly a
fifth of a second instead of a step. That follows from the mechanism alone — bellows 18 has to
fill — and it does not depend on the exact travel time. Against midi2exp and pianolatron, which
emit 0 and 127, this is the whole of the difference for the great majority of the roll.

**Whether the dampers ever *rest* part way is not certain**, because it depends on the number
the sources do not give. `--sweep` runs the count across the range:

| travel (ms) | relay / bellows | presses cut short | lifts cut short | dampers left up to |
|---:|---|---:|---:|---:|
| 100 | 33 / 67 | 0 | 0 | 0.000 |
| 140 | 47 / 93 | 1 | 0 | 0.000 |
| **180** | **60 / 120** | **14** | **0** | **0.000** |
| 220 | 73 / 147 | 32 | 12 | 0.044 |
| 260 | 87 / 173 | 45 | 76 | 0.097 |
| 300 | 100 / 200 | 49 | 141 | 0.170 |
| 360 | 120 / 240 | 57 | 201 | 0.299 |

Out of 266 presses and 267 lifts. At the default the roll never asks for a lift the mechanism
cannot finish, and fourteen presses are cut off before the dampers are fully up. Push the
travel to a quarter of a second and a quarter of the lifts become incomplete; at 360 ms three
quarters do, with the dampers still 30 % clear of the strings when the next command arrives.
So Hagmann's guess about half-pedalling by superimposition is **possible on this roll but not
demonstrated by it**, and which side of that line the instrument falls on turns on a
regulation time that would have to be measured on a surviving T-100.

### MIDI caveat

CC 64 is a switch at 64 in General MIDI, and many samplers still read it that way, in which
case the whole continuous stream collapses back to on and off. Renderers that model a real
damper — Pianoteq, and the better sampled libraries — read the range. `--mode switch` emits
the prior art's two values for comparison, and is the honest thing to send to a renderer that
cannot do better.

---

## 7. A second roll

Nothing above needs the traced line, so the model runs on any red Welte scan the Stanford image
parser has been over. `src/roll/ports.ts` builds the port grid from the raw MIDI alone and
`--raw FILE.mid` points the CLI at it.

```sh
node src/cli/pedal.ts --raw FILE.mid --sweep --out out/pedal.mid
node src/cli/pedal-page.ts --raw FILE.mid --piece "Träumerei" --roll WR0225_02 \
     --out docs/pedal-page.html
```

`src/cli/pedal-page.ts` writes the figure page. Every roll-specific thing in it — the windows
the detail panels show, and every number in the captions — is computed from the model output, so
it rebuilds for any roll rather than only for the one it was first written for.

Run over **WR0225_02**, Schumann's *Träumerei* (welte-red, 100 tracker holes, 2:46):

| | roll 3309 | WR0225_02 |
|---|---:|---:|
| damper presses / lifts | 266 / 267 | 45 / 46 |
| median press | 693 ms | 1046 ms |
| median lift | 331 ms | 1396 ms |
| shortest lift | 212 ms | 60 ms |
| travels the mechanism cannot finish | 14 | 1 |
| dampers in transit, share of the roll | 21.6 % | 7.1 % |
| hammer-rail commands | 3 | 11 |

The two rolls pedal quite differently, and the difference is the sort a continuous model can
state and a switch cannot. Roll 3309 changes the pedal every third of a second on average and
fourteen of its presses are cut off before the dampers are up; *Träumerei* changes it about once
a second and a half and completes every travel but one.

The share of each roll the dampers spend in transit follows from that: 21.6 % of roll 3309
against 7.1 % of *Träumerei*, 71 seconds against 12. That is the quantity a switch cannot carry
at all — a converter that transmits the latch puts every one of those seconds at a single
instant — and it is also the quantity most sensitive to the travel times of §5, so read it as a
ratio between the two rolls rather than as a measurement of either.

The one unfinished travel is at 2:33.9, where the roll cancels the pedal and takes it again 60 ms
later. Its two perforations are 19 and 21 px long where this roll's pedal punches otherwise run
45 to 61, and they sit on adjacent tracker holes, so a detector artefact is as good an
explanation as a fast retake. It is worth reporting and not worth leaning on.

Two things this roll exposed that roll 3309 did not.

- **`AVG_HOLE_WIDTH` belongs to the scan, not to the emulator.** This roll punches at 23.7 px
  against 3309's 20.86, a 14 % difference in how fast the tracker port opens. `PortGeometry` in
  `aperture.ts` had its punch diameter pinned to a literal type, so the `geometry` parameter
  threaded through `aperture.ts` and `load.ts` could never actually be given a different value.
  Widening the type is the only change this work makes to a file it did not add.
- **Some hole detectors split one perforation into pieces.** This scan reports the rewind slot as
  seven punches and many expression slots as two, separated by up to ten pixels of apparent
  paper. `bridged` in `ports.ts` rejoins pieces closer together than the tracker bore. It changes
  nothing on a latch, which only responds to an opening, but without it the punch census is
  meaningless: 430 raw punches become 285.

---

## 8. Open

- The travel times. Everything in §6 that is uncertain is uncertain because of them. They are
  measurable on an instrument in playing order, and — see below — possibly on a scan of the
  scale roll.
- Whether the hammer-rail commands on roll 3309 correspond to anything the pianist did.
  Unanswerable from the instrument, and three punches is not a sample.
- What **Welte 17** says. It is the T-100 scale-roll booklet, "Beschreibung der verschiedenen
  Funktionen der Welte-Mignon-Skala-Rolle 100", and it is the document that would answer the
  control-9 timing question directly. Hagmann had it (p. 108 note 53, p. 109 note 56) but
  quotes only its remark that the treble may sound a shade louder than the bass.

### A way to settle the travel times short of an instrument

Control 10 (p. 185) is the one place the scale roll ties itself to real seconds: "Skala aus
Kontrolle 1 mit jeweils 16 Repetitionen pro Ton, was zirka 8 Töne pro Sekunde ergibt." Control 1
fixes the tempo, and p. 84 gives its span as a half-minute at normal tempo. So a **scan of a
physical Monteur-Rolle** would carry controls 9b and 9c and control 10 on the same paper: the
note values of the 9b and 9c figures could be read off directly, control 10 would calibrate the
tempo on that same roll, and the two together would turn "the dampers must separate four long
notes cleanly" into an interval in milliseconds. That is a bound on the travel times obtainable
from paper alone, and it is the cheapest route to replacing the guesses of §5.

---

## 9. Settled since first writing

Footnote 48 (p. 107), "Cf. 114-116 (*T 100*), 118-120 (*T 98*)", attaches to the claim that the
pedal Vorpneumatik works like the nuancing relays. Neither reading fits this edition: as pages
those fall in the Philharmonie-Orgel chapter, and as part numbers of Anhang 13 they are the
note-valve chain, which p. 103 says is common to both scales and so cannot be split "(T 100)" /
"(T 98)" at all. They are **page numbers of the 1984 Lang print**, which this re-set edition does
not match. The offset is measurable on references whose targets are unambiguous — note 29/37's
"Cf. 84-86" for the two-stage Gebläse lands at 72–74 here, note 54's "Cf. 84/85" at 72/73,
note 55's "Cf. 97/98" at 84/85, note 23's "Cf. 99-101" at 85–87 — giving print = digital + 12…14
and drifting upward. At roughly +16 the targets are **pp. 97–100, the T-100 relay** and
**pp. 100–103, the T-98 relay**, exactly as the footnote labels them, and note 45's "Cf. 118-120"
lands on the T-98 relay, which is its sentence's referent. Bare "Cf. NN" is Hagmann's page form
throughout; where he means a part he names it.

So the sentence means what §2 assumes: on the T-100 the pedal Vorpneumatik is the **latching**
relay of pp. 98–99. One caution — the single footnote covers two opposite behaviours, since the
T-98 relay valves are explicitly non-latching ("Die Funktion bleibt genau so lange ausgeführt,
als die entsprechende Perforation im Notenband über die Gleitblock-Oeffnung läuft", p. 101). The
analogy is to each system's *own* relay, which is one more reason not to carry a T-98 rule onto
a T-100 roll.
