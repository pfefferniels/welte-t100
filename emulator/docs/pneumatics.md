# The Welte-Mignon T-100 Nuancierungseinrichtung after Hagmann 1984

Source: Peter Hagmann, *Das Welte-Mignon-Klavier, die Welte-Philharmonie-Orgel und die Anfänge
der Reproduktion von Musik*, Diss. Freiburg i.Ue. 1984. PDF at
`/Users/nielspfeffer/Zotero/storage/MKFDAXRE/Hagmann - 1984 - Das Welte-Mignon-Klavier, die Welte-Philharmonie-O.pdf`.

Citation convention below: `p.NN` is the printed page, which in this PDF coincides with the PDF
page number throughout. The chapter "Die Nuancierungseinrichtung" runs pp. 95–103; the endnotes
for it (nos. 25–35) are printed as footnotes on the same pages, not collected at the back.

Two caveats about sources before anything else.

- The Zotero `.zotero-ft-cache` next to the PDF is **truncated at p. 100** (it ends mid-sentence in
  the T-98 paragraph). Everything below p. 100 in this document comes from a fresh `pdftotext
  -layout` extraction of the whole PDF, not from that cache. Anyone working from the cache alone
  will miss Anhang 12, which is the single most informative passage for our purposes.
- Hagmann worked from two instruments in the Seewen collection (a 1914 Steinway-Welte grand,
  T-100, and a Gaveau-Welte upright, T-98), from Welte's own manuals and scale-roll booklets, and
  from Welte patents (p. 95, note 23). He is describing those two instruments; he says himself that
  construction details varied over the production run (p. 94).

Throughout, **HAGMANN** marks his claim and **INFERENCE** marks mine.

---

## 0. Part numbers and where they come from

All part numbers 1–122 refer to the schematic **Anhang 13** (T-100, p. 186) and its twin
**Anhang 14** (T-98, p. 187), both captioned "Nach Welte 2", i.e. redrawn from Welte's own
T-98 *Betriebsanleitung*. Numbers 7–13 in the chapter text are **labels on that drawing**, not roll
line numbers. The roll line numbers are given separately in Anhang 10 (p. 178):

| Function | Drawing label (treble) | Roll line, treble | Roll line, bass |
|---|---|---|---|
| Mezzoforte ab | 7 | 100 | 1 |
| Mezzoforte an | 8 | 99 | 2 |
| Crescendo ab (= Decrescendo) | 9 | 98 | 3 |
| Crescendo an | 10 | 97 | 4 |
| Sforzando ab (= subito piano) | 11 | 96 | 5 |
| Sforzando an | 12 | 95 | 6 |
| Hammerleiste ab / an | – | – | 7 / 8 |
| Pedal an / ab | – | 93 / 94 | – |
| Widerstand ab / an | – | – | 9 / 10 |
| Rücklauf | – | 91 | – |

Notes 1C–g⁴ occupy lines 11–90; line 92 is unused (Anhang 10).

Two consequences worth carrying into code.

- The *negation* always sits outboard of the *input*: "wobei der Informationseingabe jeweils deren
  Negation zugeordnet ist, die auf dem Gleitblock aus Gründen der technischen Zuverlässigkeit der
  Informationseingabe vorausgeht" (p. 97/98), with note 27 explaining that a slight lateral drift of
  the paper then cancels mezzoforte rather than triggering something. So line 100 / line 1 is the
  outermost and is Mezzoforte-off.
- **The T-100 bass side also carries "Widerstand an/ab" (lines 9/10), which switches the blower
  motor between its two speeds** (pp. 73–75). That is a second, independent global loudness input
  on the T-100 that has nothing to do with the Nuancierbalg. On the T-98 it was replaced by an
  automatic pressure-equalising valve, and Hagmann expects this to flatten accents on the green
  rolls relative to the red ones (p. 75). An emulator that models only the Nuancierbalg is modelling
  the T-100 incompletely. **HAGMANN** for the mechanism, **INFERENCE** for the emulator
  consequence.

---

## 1. Signal path

Relay unit anatomy is uniform (read off Anhang 13 and confirmed against the prose): glide-block
opening → conduit → membrane chamber → membrane → adjustable bleed bore back to the vacuum wind
chamber 15 → valve. Wind chamber 15 is fed vacuum through conduits 14 "in der jeweils vom Gebläse
erzeugten Stärke" (p. 98 — i.e. relay vacuum tracks the blower stage); wind chambers 17 are held at
atmosphere through bores 16.

| Roll line (treble) | Drawing opening | Conduit | Membr. chamber | Membrane | Bleed bore | Valve | Conduit to nuancing | Acts on | Latches? |
|---|---|---|---|---|---|---|---|---|---|
| 95 | 12 Sforzando an | 18 | 19 | 21 | **20** | 22 (single) | **23** (wide) | Nuancierbalg 90 — fast close | HAGMANN: yes |
| 96 | 11 Sforzando ab | 27 | 28 | 30 | **29** | 31 (double) | 33 | closes valve 22; evacuates aux bellows 94 + 95 | no — while perforation open |
| 97 | 10 Crescendo an | 34 | 35 | 36 | 37 | 38 (double) | **39** (medium) | Nuancierbalg 90 — timed close | yes, via hold chamber 41 / membrane 40 |
| 98 | 9 Crescendo ab | 43 | 44 | 45 | 46 | 47 (double) | 48 → lower half of 41 | releases the crescendo latch | no — while perforation open |
| 99 | 8 Mezzoforte an | – | 50 | 51 | – | 53 (double) | 54 | Mezzofortebalg 93 — evacuate and close | yes, via hold chamber 55/56 |
| 100 | 7 Mezzoforte ab | – | – | – | – | – | 62 → lower half of 55 | releases the mezzoforte latch | no |

Bores 20 and 29 are not named in Hagmann's prose; I read them off Anhang 13 in the position the
uniform pattern predicts, and Anhang 12 confirms them by name: control 4b corrects a wrong
Sforzando-on response "an 20 (T 100) oder 82 (T 98)" (p. 182), control 4e corrects Sforzando-off
"an 29 (T 100) oder 70 (T 98)" (p. 183). **INFERENCE** for the placement, **HAGMANN** for the
adjuster numbers.

### The latching mechanism

Hagmann describes it only once, for crescendo, and then says the other two work "in gleicher
Weise". Crescendo-on lifts membranes 36 *and* 40 (rigidly coupled by a wire) and shifts double
valve 38 up. That does two things (p. 98):

> "Dadurch wird zum einen über die mittelbreite Kondukte 39 der Nuancierbalg 90 in einer genau
> festgelegten Zeit evakuiert und geschlossen[30], erhält zum anderen auch der obere Teil der
> Membrankammer 41 Saugluft, sodass die Membran 40 nicht nur durch den an ihr befestigten Draht,
> sondern auch durch den von unten wirkenden Luftdruck angehoben wird."

When the perforation closes, bore 37 slowly restores the vacuum in 35, so membrane 36 balances —
but (p. 99):

> "als Folge der Kräfteverhältnisse auf der Membran 40 bleibt die Nuancierungsvorrichtung jedoch in
> der eingestellten Position (Nuancierbalg 90 geschlossen), bis die Funktion über die Oeffnung 9 des
> Gleitblocks ausgelöst wird."

So the latch is a second membrane held up by a pressure difference across chamber 41; the cancel
valve (47) admits vacuum to the lower half of 41 through conduit 48, the difference vanishes, and
valve 38 drops back. Anhang 13 shows the identical arrangement on the Sforzando-on unit (chamber
24/25, cancel conduit 32 from valve 31) and on the Mezzoforte-on unit (chamber 55/56, cancel
conduit 62). **HAGMANN** for crescendo; **INFERENCE**, from the drawing, that the sforzando and
mezzoforte hold chambers are structurally the same.

### The Sforzando latching contradiction — what Hagmann actually says

Verbatim, p. 99 (the whole T-100 sforzando sentence):

> "– Sforzando: In gleicher Weise arbeitet das (einfache) Ventil 22, dessen über die Linie 12
> (Sforzando an) des Gleitblocks erzeugte Oeffnung die rasche Evakuation des Nuancierbalgs
> bewirkt[32], der mit der Ventilkammer 22 über die im Vergleich zur Kondukte 39 breiter
> dimensionierte Kondukte 23 verbunden ist. **Und auch hier wird die Funktion aufrecht erhalten,
> selbst wenn die entsprechende Perforation verschwindet;** dennoch wird mit der Position
> ‚Sforzando' stets auch die Position ‚Crescendo' eingegeben, sodass hier der Nuancierbalg auch über
> die Crescendo-Kondukte 39 in geschlossener Stellung gehalten wird[33]."

(Emphasis mine.) Note 33: "Gründe für diese Parallelschaltung sind nicht bekannt."

And p. 100 for the cancel side:

> "Die Auslösung der Sforzando-Funktion erfolgt damit parallel über die Oeffnungen 11 und 9 des
> Gleitblocks, wobei letzterer lediglich die Aufgabe zufällt, das gleichzeitig mit dem Sforzando
> geschaltete Crescendo aufzuheben."

**Confidence: Hagmann is unambiguous that T-100 Sforzando-on latches.** The sentence is explicit,
it is not a passing remark, and Anhang 13 corroborates it by drawing a hold chamber (24/25) with a
cancel conduit (32) on the Sforzando-on unit. The T-98 passage (p. 101) makes the contrast
deliberate: there "Die Funktion bleibt genau so lange ausgeführt, als die entsprechende Perforation
im Notenband über die Gleitblock-Oeffnung läuft." Hagmann knew the difference and wrote it up as a
difference. I would put high confidence on the latching claim as Hagmann's considered position, and
moderate confidence on it being physically right, since he was reading a drawing of a T-98 manual
plus two instruments he could observe.

Two things nevertheless leave the matter open, and I do not think they can be settled from Hagmann:

1. Anhang 12, control 4b (p. 182), tests Sforzando-on with **six short perforations** and expects
   the bellows to move "in sechs Schritten von der Piano- zur Mezzoforte-Stellung", then to fall
   back to piano, then to *not move at all* under six still shorter perforations. A staircase from
   six short pulses is what you get from a non-latching valve. It is also what you get from a
   latching valve if the Skalarolle interleaves short Sforzando-off perforations, which Hagmann's
   compressed description may simply not mention — he does write "Eingabe von Sforzando an-ab"
   explicitly elsewhere (controls 6a, 6c), so the omission here is at least suggestive but not
   decisive.
2. Whether the accompanying crescendo comes from the roll or from the relay. **Resolved in favour of
   the roll — see §8.1**, on the strength of Hagmann's usage of "Position" and "eingeben" elsewhere
   in the book.

**Against midi2exp.** midi2exp treating T-100 Sforzando as momentary contradicts Hagmann's prose.
How much it matters in practice depends on the answer to (2): if rolls always punch Sforzando-off
shortly after Sforzando-on, latching and momentary behaviour diverge only over the gap between
them, which may be short. Worth quantifying on 3309 rather than assuming.

---

## 2. The four flow paths into and out of the Nuancierbalg 90

The Nuancierbalg is closed by suction and opened by inflowing air plus its own internal spring
(p. 96): "der durch einströmende Luft und eine ihm eingebaute Feder geöffnet, durch die im Relais
erzeugten Saugspannungen aber geschlossen wird."

| # | Path | Conduit / bore | Reservoir at far end | Relative width | Adjuster | Normed by |
|---|---|---|---|---|---|---|
| 1 | Crescendo close | 39 ("mittelbreite") | vacuum, via valve chamber 38 ← wind chamber 15 | medium | **Drossel 98** | Skalarolle Kontrolle 3 |
| 2 | Crescendo open (decrescendo) | 39 + bore 100 | atmosphere, via valve chamber 38 ← wind chamber 17 | 39 alone insufficient; 100 makes up the deficit | **Drossel 100** | Kontrolle 3 |
| 3 | Sforzando close | 23 | vacuum, via valve chamber 22 ← wind chamber 15 | "im Vergleich zur Kondukte 39 breiter dimensioniert" | **Drossel 99** | Kontrolle 4 |
| 4 | Sforzando open | throttle 96, opened by aux bellows 94 | atmosphere | set by 96 | **Drossel 96** | Kontrollen 4 and 6 |

Throttles 98, 99, 100 all appear on Anhang 13 and Anhang 14 as adjusting screws on the manifold
under the Nuancierbalg; 98 and 100 are annotated "Cresc.P." on the drawing. Hagmann names 98 only
in note 30 ("Normierung (Drossel 98) gemäss Skalarolle: Kontrolle 3", p. 98) and 99 only in the
T-98 note 40 ("Normierung (Drossel 99) gemäss Skalarolle: Kontrolle 4", p. 102), but the nuancing
unit "ist, von geringfügigen Unterschieden abgesehen, für beide Blockskalen gleich konstruiert"
(p. 96) and the T-100 drawing shows 99 too, so 99 governs the T-100 sforzando closing speed as
well. Anhang 12 confirms both: control 3 → "Verstellung von 98 (Crescendo) oder 100 (Decrescendo)"
(p. 182); control 4a → "Verstellung von 99 (Sforzando) oder 96 (Sforzando ab)" (p. 182).

### Time symmetry — both pairs are designed symmetric

**Crescendo pair (1 ↔ 2), p. 99:**

> "Da über die Kondukte 39 jedoch zu wenig Luft einzuströmen vermag, um die Oeffnung des
> Nuancierbalgs in derselben zeitlichen Ausdehnung zu ermöglichen, wie für dessen vollständige
> Schliessung im Rahmen der Crescendo-Bewegung benötigt wird, ist die zusätzliche, mit einer Drossel
> versehene Bohrung 100 dafür vorgesehen, jenes Manko an Lufzufuhr auszugleichen."

The design target is stated in the subordinate clause: opening should take *the same elapsed time*
as full closing; bore 100 exists because conduit 39 alone cannot deliver it. So crescendo and
decrescendo are meant to be mirror images in duration. **HAGMANN.**

**Sforzando pair (3 ↔ 4), p. 100:**

> "Der Balg 94 öffnet die Drossel 96, durch die, ist sie korrekt eingestellt[34], jene Menge Luft
> einströmt, die zur Oeffnung des Nuancierbalgs 90 in derselben Zeit notwendig ist, wie für seine
> durch die Betätigung des Sforzando-Ventils erfolgte Schliessung benötigt wird"

Anhang 12, control 4a (p. 182) states the same as a test criterion: "4x Bewegung der Nuancierbälge
90 von der Piano- zur Mezzoforte-Stellung und zurück, wobei Oeffnung und Schliessung in gleicher
Geschwindigkeit zu erfolgen haben." **HAGMANN.**

So: symmetric within each pair, and the sforzando pair is faster than the crescendo pair. Hagmann
gives no ratio between them.

### The fifth path — and it is not into the Nuancierbalg

Sforzando-off also evacuates a *second* auxiliary bellows, 95, which opens **throttle 97**, and 97
admits air directly into the **left (downstream) part of wind chamber 86 and into conduits 88** —
that is, straight into the note pneumatics, bypassing the cone valve entirely (p. 100):

> "der Balg 95 dagegen öffnet die Drossel 97, die bei korrekter Einstellung jene Menge Luft in den
> linken Teil der Windkammer 86 und die Kondukte 88 einfliessen lässt, die für den sofortigen Abbau
> des Unterdrucks auf das für den Piano-Anschlag notwendige Minimum zusätzlich benötigt wird."

**This matters for the model.** During a subito piano the delivered vacuum is *not* a function of
the Nuancierbalg position alone: there is a parallel air leak into the delivery side that collapses
the vacuum immediately, while the bellows is still travelling open at the rate set by 96. The two
have different time constants and Hagmann says so ("sofortig" vs "in derselben Zeit"). Anhang 12
separates them in regulation too: control 2b (mezzoforte→piano) is corrected at "96, eventuell 97"
(p. 181), control 5 (forte→piano) at "97" alone (p. 183). **HAGMANN** for the mechanism;
**INFERENCE** that this breaks a one-to-one bellows→vacuum mapping.

### Sforzando-off is duration-proportional, and cumulative

Anhang 12 tests this three ways and the results are unambiguous (pp. 182–183):

- control 4c/4b: crescendo + sforzando on → bellows to forte; then crescendo + sforzando off with a
  **long** perforation → "Die Nuancierbälge fallen vollständig in die Piano-Stellung zurück."
- control 4d/4c: same, but a **short** perforation → "Die Nuancierbälge fallen **nicht** vollständig
  in die Piano-Stellung zurück." Correction at 96.
- control 4e/4d: same, but **three short single perforations** → "Die Nuancierbälge fallen in drei
  Schritten vollständig in die Piano-Stellung zurück." Correction at 29 (T-100) / 70 (T-98).

So sforzando-off acts only while its perforation is open, travel is proportional to perforation
length, and successive perforations accumulate. Bore 29 sets how long the relay valve stays lifted
after the perforation ends, i.e. the tail. **HAGMANN**, and this is regulation practice rather than
theory, so it is good evidence.

---

## 3. The Mezzoforte stop

Verbatim, pp. 96–97:

> "Die Mittelstellung des Mezzoforte wird erreicht, wenn der Dorn des betätigten und deshalb
> geschlossenen Mezzofortebalgs 93 **Oeffnung oder Schliessung** des Nuancierbalgs **auf halbem
> Wege** unterbricht. Zwischen diesen drei festen Positionen ist der Nuancierbalg frei beweglich:
> Die Vorrichtung ermöglicht also eine stufenlose Regulierung der Dynamik zwischen Piano,
> Mezzoforte und Forte, wobei sich freilich der Nuancierbalg ausserhalb der drei festen Positionen
> in steter Bewegung befindet, sich in den Bereichen zwischen Forte und Mezzoforte beziehungsweise
> Mezzoforte und Piano also nicht exakt kontrollieren lässt."

**Both directions.** "Oeffnung *oder* Schliessung" is explicit: the pin arrests travel arriving at
the midpoint from either side. **HAGMANN.**

**Is it the geometric midpoint?** Hagmann says "auf halbem Wege" and calls it "Mittelstellung", so
nominally yes. But it is a **regulated** position, not a fixed one: Anhang 12, control 2c (p. 181)
checks bass/treble balance in mezzoforte and prescribes, on a mismatch, "Verstellung des Hakens an
93" — adjustment of the *hook* on 93. So in a regulated instrument the mf stop sits wherever the
technician put it to make bass and treble equally loud at mezzoforte, close to but not necessarily
exactly at half travel. **HAGMANN** for the adjustability; **INFERENCE** that this means the mf
position is a free parameter of the model rather than a constant 0.5.

Terminology: the chapter says "Dorn" (pin), Anhang 12 says "Haken" (hook). Anhang 13 draws a hook
at the free end of the Mezzofortebalg's moving leaf, curling downward into the path of the
Nuancierbalg's moving board.

**What if MF is engaged while the Nuancierbalg is already past the midpoint?** **Hagmann does not
say.** He describes only the case where the pin is already down when the bellows arrives. From the
drawing my reading is that the pin drops into free space and simply waits: it is a stop, not an
actuator, so it cannot pull the bellows back to the midpoint. The bellows would stay wherever it
is, on the forte side, and would be caught at mf the next time it travels open. That is
**INFERENCE** and I would not build load-bearing behaviour on it without a second source.

Anhang 12, control 7 (p. 184) is consistent with this and worth reading as the one behavioural test
of the stop:

> "Im Bass und Diskant gleichzeitig Eingabe von Mezzoforte, Crescendo und Sforzando an: Die
> Nuancierbälge 90 schliessen sich rasch bis zur Mezzoforte-Stellung. Anschliessend Auslösung des
> Mezzoforte: Die Nuancierbälge bewegen sich rasch in die Forte-Stellung."

MF is set *first*, closing is arrested at mf, and releasing MF lets the still-latched crescendo and
sforzando drive on to forte. Note in passing that this control also presupposes that crescendo and
sforzando are still in force after their perforations have gone — further support for the latching
reading in §1.

An edge case the model has to decide and Hagmann does not cover: if the Nuancierbalg is between
piano and mf when MF is commanded, the pin has to descend into a gap that the bellows leaf is
occupying. Either it fouls and the Mezzofortebalg cannot fully close, or the geometry clears.
**Hagmann does not say.**

---

## 4. Numbers

I searched the whole book for units and quantities. **There is not a single figure in seconds or
milliseconds for any nuancing movement, and no vacuum figure for the piano at all.** Every timing
in the book is defined *relative to the roll*, by marker tones punched at fixed distances. Saying
so plainly seems more useful than reconstructing one.

What there is:

| Quantity | Value | Where |
|---|---|---|
| Recommended playback tempo | "Tempo 70", "um eine richtige Einstellung der Betonungsfunktionen zu erhalten" (quoting Welte 13/17) | p. 85 |
| Tempo calibration | the span between the two extra control tones in Kontrolle 1 must be traversed "im Verlauf einer halben Minute" at normal tempo | p. 84 |
| T-100 Kontrolle 1 | scale 1C–g⁴ = 80 notes in p; control tones c³ at 1C and e³ at c¹ ⇒ Tempo 70 | p. 180/181 |
| T-98 Kontrolle 1 | control tone c³ at 1G = Tempo 20, F = 40, dis = 60, a = 70 normal, cis¹ = 80, h¹ = 100, a² = 120 | p. 181 |
| Repetition rate, note pneumatic | up to 8/s in piano, up to 12/s in mezzoforte ("Experimentelle Untersuchungen und Beobachtungen am Instrument selbst") | p. 105 |
| Kontrolle 10 | 16 repetitions per note, "was zirka 8 Töne pro Sekunde ergibt" | p. 185 |
| Red T-100 roll width | 328 mm (green T-98: 286 mm; organ: 386 mm) | p. 75 |
| Perforation ∅, "Mignon rot-alt" (to c. 1910) | 2.2 mm; step 0.9 mm; pitch (Teilung) 3.2 mm | p. 76 |
| Perforation ∅, "Mignon rot-neu" (from c. 1910) | 1.8 mm; step 0.9 mm; pitch 3.2 mm | p. 76 |
| Bass/treble split | bass 1C–fis¹, treble g¹–g⁴ | p. 96 |
| Bass/treble balance | the treble may sound "um weniges lauter" than the bass (quoting Welte 13/17) | p. 109 |

The one vacuum figure in the book — **28 mbar / 280 mm water column** (p. 72) — is the *magazine
bellows of the Meidinger blower of the Seewen Welte-Philharmonie organ*, together with 8 mbar
(80 mm WS) for Manual I and pedal wind and 9 mbar (90 mm WS) for Manual II. **It is not a piano
figure and must not be carried over.** For the piano Hagmann says only that the extremes are set by
the blower motor's output plus the magazine bellows spring at the top and by the cone valve setting
plus the pre-pneumatic regulation at the bottom (p. 110), and that the safety valve is factory-set
"dass der Forte-Anschlag genügend stark ist" (quoting Welte 2, p. 108).

**Regulation tolerances** are likewise all roll-relative. From Anhang 12 (pp. 180–185), the
adjustable parts of the nuancing system and what norms them:

| Adjuster | What it sets | Control |
|---|---|---|
| Ledermutter 92 (on Regelbalg 91) | the pianissimo end stop of the cone valve; also bass/treble balance in p | 2a, and p. 109 |
| Haken an 93 | the mezzoforte position; bass/treble balance in mf | 2c |
| Drossel 98 | crescendo closing time p→mf | 3 |
| Drossel 100 | decrescendo opening time | 3 |
| Drossel 99 | sforzando closing speed | 4a |
| Drossel 96 | sforzando opening speed; also mf→p | 4a, 4c, 4d, 2b |
| Drossel 97 | the immediate vacuum dump for forte→piano | 5, 2b |
| Bohrung 20 (T-100) / 82 (T-98) | Sforzando-on valve threshold: six short perforations must give six steps, six shorter ones must give none | 4b |
| Bohrung 29 (T-100) / 70 (T-98) | Sforzando-off hold/tail; three short perforations must give three steps to piano | 4e |
| Bohrung 111 | note response in p | 1 |
| Bohrung 114 | repetition reliability | 10 |

**Patents.** Hagmann lists them as sources (p. 95 note 23) but does not quote or reproduce any.
The ones that look relevant, with their DRP numbers from the bibliography (pp. 260–263):

- **DRP 162 708**, M. Welte & Söhne, "Vorrichtung an mechanischen Tasteninstrumenten zur Abstufung
  des Tastenanschlages", filed 21 May 1904 (Welte 1904.3). This is the natural candidate for the
  T-100 expression mechanism itself.
- **DRP 354 925**, "Spannungsregler für Musikwerke", filed 21 May 1921 (Welte 1921). A tension/
  vacuum regulator — plausibly the Regelbalg 91 / Regelfeder 101 arrangement.
- **DRP 410 386**, "Spannungsminderer, insbesondere für pneumatische Musikgeräte", filed 8 March
  1924 (Welte 1924). A vacuum reducer — plausibly the cone valve 87.
- **DRP 412 965**, "Betonungseinrichtung für Klavierspielvorrichtungen mit zwei den starken
  Ausschlägen zweier Betonungslinien entsprechend bedienbaren Tonungshebeln", filed 30 Aug 1921
  (Welte 1921.1) — the Mignola hand-nuancing levers. See §5.

The patent identifications after the first are **INFERENCE** from the titles; Hagmann does not
assign them to parts. If real numbers exist anywhere, these four patent specifications and the two
Welte scale-roll booklets (Welte 13 for T-98, Welte 17 for T-100, plus Welte 2 and the New York
*Instructions for Testing and Regulating*, Welte 1924.1) are where I would look next. Hagmann had
all of them; he simply did not print figures from them.

---

## 5. The Regelbalg, and what a drawn line could be recording

### What the Regelbalg does

p. 97:

> "Die Stellung des Kegelventils 87 wird aber noch von einem zweiten Balg kontrolliert, an dessen
> beweglichem Teil das vom Kegelventil über die Rolle des Nuancierbalgs laufende Kettenband
> befestigt ist – vom Regelbalg 91, dessen Aufgabe darin besteht, die Saugspannung auch dann
> konstant zu halten, wenn die Zahl der angeschlagenen Töne über ein gewisses Mass hinaus steigt.
> Schlagen nämlich viele Töne gleichzeitig an, so dringt mehr Luft als bei einem einzelnen Anschlag
> in die Tonpneumatik und, über die Kondukte 88, in die Windkammer 86, die mit dem Regelbalg 91
> durch eine Bohrung verbunden ist; reduziert sich demzufolge die Saugspannung in Tonpneumatik und
> Regelbalg, so gewinnt die Regelfeder 101, die sich mit der Saugkraft des Regelbalgs 91 im
> Gleichgewicht befindet, an Ueberkraft, zieht sich zusammen und öffnet dabei das Kegelventil 87 so
> weit, bis die Gleichgewichtsstellung wieder erreicht ist."

Anhang 13 shows the kinematics: the chain band runs from the cone valve 87 horizontally left, over
a roller carried on the Nuancierbalg's swinging arm, then down to the leather nut 92 on the moving
board of the Regelbalg 91. Both bellows therefore act on the same inextensible band, and the cone
valve position is a **sum of two contributions**. The team lead's inference is right. Hagmann does
not state the linkage ratio or whether the two segments are geometrically equivalent, so the exact
combining law is **not** in the source.

The Regelbalg is a genuine closed loop: it senses the *delivered* vacuum in chamber 86 / conduits
88 (the same vacuum the note pneumatics see) and pushes the cone valve open until spring 101 is
back in balance. Its purpose is precisely to *cancel* the loudness drop caused by dense playing:
"Der Regelbalg verhindert damit, dass die Kraft des Anschlags als Folge vollgriffigen Spiels
abnimmt."

### What this means for a curve traced from a drawn line

Hagmann does not discuss drawn nuancing lines on Welte piano rolls at all. His single use of
"Handnuancierung" (p. 43) is about the *Mignola*'s hand levers, an entirely different thing — the
1924 pedal-operated instrument on which the listener could override the automatic nuancing. He is
explicit that Welte's piano recording procedure is undocumented and that no piano recording rolls
are known to survive (p. 70, note 48): "Wie die Einzelheiten des Aufnahmeverfahrens verschwiegen
wurden, sind auch Aeusserungen dazu bis heute nicht bekannt geworden."

So the question "does the drawn line record the Nuancierbalg position, the cone valve position, or
the resulting vacuum?" **cannot be answered from Hagmann.** What the mechanism does let us say is
what would follow in each case, and the three differ in exactly the way that matters for note
density:

- **If the line is Nuancierbalg position.** Note density is *not* in the line. The Regelbalg then
  has to be modelled separately, and a note-dense passage should come out *louder per note* than the
  line alone would predict, because the regulator opens the cone valve further.
- **If the line is cone valve position.** Note density is partly baked in, because the cone valve
  already carries the Regelbalg's contribution. Modelling the Regelbalg again on top would
  double-count.
- **If the line is delivered vacuum.** Note density is fully baked in and the whole nuancing chain
  is bypassed; the emulator would only need the vacuum-to-velocity map.

There is a fourth possibility that I think deserves at least as much weight as those three, since
Hagmann has no recording apparatus for Welte piano dynamics to offer: that the line is an
**editor's intention curve**, drawn by hand at the punching stage and then translated into
crescendo / sforzando / mezzoforte perforations, in which case it records neither a physical
position nor a vacuum but a target that the discretised commands approximate. Hagmann's remarks on
the Philharmonie recording rolls point that way — they carry the apparatus's traces, then pencil
notes from a *Herausgeber*, then punching, then patches (p. 70) — and DRP 412 965 (1921) is
literally a patent about driving nuancing levers from "den starken Ausschlägen zweier
Betonungslinien", i.e. from the strong deflections of two accent lines, which presupposes that
accent *lines* were an established Welte representation. All of that is **INFERENCE**, and I flag
the whole question as open rather than settling it.

One practical test, since roll 3309 has both a drawn line and punched expression: compare the line
against a forward simulation of the punched commands. If the line tracks the simulated Nuancierbalg
position including its ballistic overshoots between the three fixed positions, it is a record of
the mechanism; if it is smoother than the mechanism can be, it is an intention curve. **INFERENCE**,
offered as a way to decide.

### A second reason the delivered vacuum is not a function of bellows position

Even setting the Regelbalg aside, §2 established that subito piano dumps air directly into the
delivery side through throttle 97. And §0 established that on the T-100 the blower itself runs at
two roll-selected speeds. So the chain from Nuancierbalg position to hammer velocity has at least
three parallel inputs, of which the drawn line can be recording at most one.

---

## 6. T-100 vs T-98, only where it clarifies the T-100

The nuancing unit proper (parts 86–101) is the same: "In der Nuancierung, die, von geringfügigen
Unterschieden abgesehen, für beide Blockskalen gleich konstruiert ist" (p. 96). All the differences
are upstream, in the glide block and the relay.

| | T-100 | T-98 |
|---|---|---|
| Expression openings per side | 6 | 4 |
| On and off | separate openings, negation outboard | same opening for both |
| Duration semantics | function **latches** until countermanded | "Die Funktion bleibt genau so lange ausgeführt, als die entsprechende Perforation im Notenband über die Gleitblock-Oeffnung läuft" (p. 101) |
| Relay first stage | membrane chamber + membrane (35/36) | small bellows (79, 83) with rigid wire to the valve |
| Latch chambers | 24/25, 41, 55 present | absent |
| Sforzando | on = opening 12, off = opening 11 (subito piano) | on = opening 67, momentary; when it ends, the decrescendo of opening 66 takes over automatically; subito piano has its own opening 64 ("Sforzando Piano" in Welte's terminology) |
| Crescendo close duration | "in einer genau festgelegten Zeit" | same, but bounded: "Der Vorgang dauert längstens, bis der Nuancierbalg vollständig geschlossen ist, mindestens aber, solange die Perforation über die Oeffnung 66 des Gleitblocks fährt" (p. 101) |
| Blower stage selection | roll lines 9/10 "Widerstand ab/an" | automatic pressure-equalising valve with a mercury bellows (pp. 74–75) |
| Sforzando valve | single valve 22, no return spring mentioned | valve 84 with a spring above it "die für zuverlässigen Verschluss zu sorgen hat" (p. 102) |

Two clarifications this buys us for the T-100.

- The T-98 wording "längstens ... mindestens" tells us the crescendo close is a *travel to a limit*,
  not a fixed-duration ramp: it stops early when the bellows bottoms out. The T-100 phrase "in einer
  genau festgelegten Zeit" should be read the same way — the *rate* is normed (throttle 98,
  Kontrolle 3), not the duration. **INFERENCE**, but a fairly safe one.
- Hagmann drew the latching/non-latching distinction deliberately and consistently across both
  chapters. That is the strongest reason to take the T-100 latching claim seriously rather than as a
  slip. Hagmann also notes that the T-98 reduction from six lines to four does *not* in his view
  flatten the dynamics, because it is offset by further automation (p. 89/90) — though he does
  expect flattening from the automatic blower-stage valve (p. 75).

---

## 7. Figure inventory

Plates for the nuancing mechanism, by PDF page (= printed page):

| Plate | PDF page | Content |
|---|---|---|
| **Anhang 13** | **186** | **Skizze zur Tonerzeugung beim Welte-Mignon-Klavier T-100.** The one you want. Single sheet, labelled top to bottom: Gleitblock with openings 7–13; Relais with all six valve units (18–22 Sf-on, 27–33 Sf-off, 34–42 Cresc-on, 43–49 Cresc-off, 50–57 MF-on, and the MF-off unit with cancel conduit 62), plus the common wind chambers 14–17; Nuancierung with 85–101; then Vorverstärker, Vorpneumatik and Tonerzeugung sharing the range 102–122; Gebläse 1–6. Caption "Nach Welte 2." |
| **Anhang 14** | **187** | Same for T-98: Gleitblock openings 64–67, relay units 68–84, then the identical nuancing unit 85–101. Useful as a second reading of the same nuancing drawing. |
| Anhang 15 | 188 | The hammer / repetition action, part 122. No expression content. |
| Anhang 10 | 178 | Blockskala T 100 — the roll line assignments in §0. |
| Anhang 11 | 179 | Blockskala T 98. |
| **Anhang 12** | **180–185** | Not a plate but the Skalarolle descriptions, controls 0–11 for the Monteur-Rolle and Besitzer-Rolle of both scales. This is where every regulation norm and every adjuster number is. Text, six pages. |
| Anhang 16 | 189 | Pedal movement T-100 (separate numbering 7–20 — do not confuse its "20" with Anhang 13's bore 20). |
| Anhang 17 | 190 | Pedal movement T-98. |
| Anhang 4 | 172 | The blower: four scoop bellows S, belt R, crank K, magazine bellows with spring F, spike St, safety valve V. |
| Anhang 5 | 173 | The automatic pressure-equalising valve (T-98 only) with the mercury bellows Q. |
| Anhang 34 | 215 | The organ's swell-shutter unit — a useful analogue for two-speed open/close from paired lines, if you want one. |

Reading Anhang 13 on screen: the sheet is a scan of a hand-lettered drawing reproduced small, so it
needs magnification. At 500–900 dpi the nuancing unit sits in the PDF-point rectangle roughly
x ∈ [130, 300], y ∈ [225, 340] on page 186, and the relay in x ∈ [175, 430], y ∈ [125, 232].
Renders of those crops are in this session's scratchpad and can be regenerated with PyMuPDF
(`page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72), clip=fitz.Rect(...))`).

---

## 8. Three questions answered separately

### 8.1 The Sforzando–Crescendo coupling: the roll, not the relay

**The German supports the roll reading, and I now think fairly firmly.** The argument is not in the
sforzando passage itself, which is genuinely ambiguous in isolation, but in how Hagmann uses
"Position" and "eingeben" everywhere else in the book.

The sentence (p. 99/100), with the two before it for context:

> "In gleicher Weise arbeitet das (einfache) Ventil 22, dessen über die Linie 12 (Sforzando an) des
> Gleitblocks erzeugte Oeffnung die rasche Evakuation des Nuancierbalgs bewirkt[32], der mit der
> Ventilkammer 22 über die im Vergleich zur Kondukte 39 breiter dimensionierte Kondukte 23 verbunden
> ist. Und auch hier wird die Funktion aufrecht erhalten, selbst wenn die entsprechende Perforation
> verschwindet; dennoch wird **mit der Position „Sforzando" stets auch die Position „Crescendo"
> eingegeben**, sodass hier der Nuancierbalg auch über die Crescendo-Kondukte 39 in geschlossener
> Stellung gehalten wird[33]. Die Auslösung der Sforzando-Funktion erfolgt damit parallel über die
> Oeffnungen 11 und 9 des Gleitblocks, wobei letzterer lediglich die Aufgabe zufällt, das
> gleichzeitig mit dem Sforzando geschaltete Crescendo aufzuheben."

Note 33 in full: "Gründe für diese Parallelschaltung sind nicht bekannt."

**"Position" in Hagmann means a glide-block opening, i.e. a roll line.** Two clear parallels:

- p. 106, on the T-98 pedal lines: "weil die Informationseingabe und deren Negation über **ein und
  dieselbe Position des Gleitblocks** erfolgen."
- p. 140, on the organ: "In solcher Weise bestimmen **die Positionen „Pedal" und „Pedal solo"** die
  Stellung der zu einem Tonventil 4d gehörigen Unterventile 4h und 4j" — the identical construction,
  function name in quotation marks, denoting the roll lines.

**"eingeben" means the roll delivering a command through such a position.** The closest structural
parallel is the organ registration trick on p. 127:

> "Werden beispielsweise gleichzeitig die Linien 73 (Crescendo forte) und 74 (Crescendo piano)
> **perforiert**, so werden gleichzeitig die beiden sich aufhebenden Befehle „Jalousien langsam auf"
> und „Jalousien langsam zu" **eingegeben**"

Here "eingegeben" is unambiguously the roll's perforations, on two named lines punched together, and
Hagmann calls that combination a "Schaltung" in the next sentence ("durch die gleichzeitige
**Schaltung** von langsamer Oeffnung und langsamer Schliessung"). Anhang 26 uses the same word for
roll-driven combinations: "hervorgerufen durch die **gleichzeitige Schaltung** der beiden Funktionen
Crescendo forte und Forzando forte" (p. 201).

That disposes of the one piece of evidence that pointed the other way. "geschaltet" and
"Schaltung", and therefore "Parallelschaltung" in note 33, are not circuit words in Hagmann's
idiom — they are his ordinary term for functions being switched by the roll, including two lines
punched simultaneously. And the decisive grammatical point: **the relay has no access to the glide
block, so it cannot "input a glide-block position".** Only the paper can.

The following sentence corroborates from the cancel side: "Die Auslösung der Sforzando-Funktion
erfolgt damit **parallel über die Oeffnungen 11 und 9 des Gleitblocks**" — cancelling a sforzando
requires perforations at *both* openings, i.e. two punched lines.

**Confidence: high** that Hagmann means the roll is punched with crescendo alongside every
sforzando, and that note 33's puzzlement is about why Welte's editors coded it redundantly when the
sforzando latch alone would have held. **Residual doubt:** Hagmann is describing coding practice he
observed, not reporting a rule from a Welte document, and "stets" is his generalisation.

### What to expect on roll 3309

If the reading is right, in the punched code:

- Every **Sforzando an** perforation (treble line 95, bass line 6) is accompanied by a **Crescendo
  an** perforation (treble 97, bass 4). The implication runs one way only — crescendo will very
  often appear alone, for ordinary crescendos.
- Every **Sforzando ab** perforation (treble 96, bass 5) is accompanied by a **Crescendo ab**
  perforation (treble 98, bass 3). Anhang 12 treats this pairing as a unit throughout: controls
  4c–4e all read "Eingabe von Crescendo und Sforzando ab" (pp. 182–183).
- **Do not expect sample-exact alignment.** Hagmann says "gleichzeitig", but he also documents that
  Welte deliberately displaced perforations by small amounts — the "künstliches Arpeggio", where a
  note to be brought out is pulled slightly forward and given its own nuancing command (p. 111,
  after RiedigF 1924). Test for co-occurrence within a tolerance of a few roll steps (step = 0.9 mm,
  hole ∅ 1.8–2.2 mm on red rolls, p. 76), not for identical onsets.
- **A Sforzando-an found alone would be a real finding against Hagmann**, and would either mean the
  pairing is internal after all or that "stets" overstates it. Worth reporting either way.
- Bass and treble are independent; check the two sides separately.

Either way the emulator can simply read the roll: on the roll reading the crescendo is already in
the data, and on the discarded relay reading it would be too, since the relay would only be
duplicating what the paper already carries in every observed case.

### 8.2 The sforzando-off auxiliaries 94 / 95 / 96 / 97

**Your reading is right on both counts. Momentary, and the two paths are separate.**

**Momentary.** Hagmann, p. 100: "Wie beim Crescendo stellt sich auch dieser Teil der Vorrichtung
wieder in die Ausgangsposition ein, wenn die Funktion erfüllt ist und die Perforation auf dem
Notenband verschwindet." "Wie beim Crescendo" points back to the crescendo-*off* unit on p. 99,
where the return is spelled out: "so senkt sich das Doppelventil 47 in jenem Masse, als die
Membrankammer 44 über die Bohrung 46 evakuiert wird – womit sich die Einrichtung wieder im
Ausgangszustand befindet." The T-98 chapter says it even more bluntly for these same auxiliary
bellows, p. 103: "Wenn die Perforation verschwindet, fällt der Balg 71 zusammen und senkt sich das
Doppelventil 72, sodass sich die Ventilkammer, die Kondukte 33 und die beiden Hilfsbälge über die
ins Freie führende Bohrung **sogleich** wieder mit Luft füllen." Since the nuancing unit is common
to both scales (p. 96), that describes 94/95 generally.

So: valve 31 lifts while the perforation at opening 11 is over the glide block, plus a short tail
while chamber 28 is evacuated through **bore 29**; conduit 33 evacuates bellows 94 and 95; they open
throttles 96 and 97; when the perforation ends, valve 31 drops, 33 refills, and both bellows
collapse at once, closing 96 and 97.

**The asymmetry that matters.** Valve 31 does two different things and they do *not* have the same
persistence: closing valve 22 **cancels the sforzando latch permanently**, while opening 96/97 is
**momentary**. So the reopening assist through 96 acts only for the length of the cancelling
perforation (plus bore 29's tail), and the Nuancierbalg reopens only as far as that lets it. This is
exactly what the regulation controls demand (pp. 182–183): long Sforzando-ab perforation → full
return to piano (4c); short → "Die Nuancierbälge fallen **nicht** vollständig in die Piano-Stellung
zurück" (4d); three short ones → return "in drei Schritten" (4e). Bore 29 is the adjuster named for
that last test. Duration-proportional and cumulative, and the model should integrate over the
perforation rather than treating sforzando-off as an event.

After 96 closes, whatever reopening remains has to come through conduit 39 + bore 100, and only if
crescendo has also been cancelled — which is why every one of those controls specifies "Crescendo
**und** Sforzando ab".

**Throttle 97 acts on the output, not on the bellows — Hagmann's text supports the separation
explicitly.** p. 100:

> "der Balg 95 dagegen öffnet die Drossel 97, die bei korrekter Einstellung jene Menge Luft **in den
> linken Teil der Windkammer 86 und die Kondukte 88** einfliessen lässt, die für den **sofortigen**
> Abbau des Unterdrucks auf das für den Piano-Anschlag notwendige Minimum **zusätzlich** benötigt
> wird."

Three words carry it. "in den linken Teil der Windkammer 86 und die Kondukte 88" is the delivery
side, downstream of the cone valve — Anhang 13 shows chamber 86 divided, with 85 from the blower on
the right of the cone valve and 88 to the note pneumatics on the left, and 95 sitting on top of the
left half. "sofortig" is set against the *timed* reopening of the bellows through 96 in the previous
clause. And "zusätzlich" says this is an addition to what the bellows reopening achieves, not a
description of it. The two are also regulated apart: control 2b (mezzoforte→piano) is corrected at
"96, eventuell 97", control 5 (forte→piano) at "97" alone (pp. 181, 183).

So yes: **a sforzando release collapses the delivered vacuum immediately, while the Nuancierbalg is
still travelling open at the rate set by 96.** A trace of the bellows position would not show that
collapse; a trace of loudness or of delivered vacuum would. Two consequences:

- In the model, delivered vacuum during a sforzando-off is not a function of bellows position. Treat
  97 as a parallel leak on the output node, gated by the perforation.
- **This gives you a second discriminating test for the drawn line.** At a Sforzando-ab in the
  punched code, a loudness/vacuum trace should show a sharp downward spike that recovers partially
  when the perforation ends (because the bellows has only partly reopened); a bellows-position trace
  should show a plain ramp with no spike. If 3309's drawn line shows the spikes, it is not recording
  the Nuancierbalg. **INFERENCE**, and it assumes 97's effect is large enough to be visible.

### 8.3 The mezzoforte pin

**(iii) is excluded.** The pin is a stop on the moving leaf of a small bellows; Hagmann's verb is
"unterbricht" (interrupts), never a driving verb, and Anhang 13 shows no linkage between 93 and 90
other than the hook itself. A stop cannot pull the Nuancierbalg anywhere. **HAGMANN** for the verb,
**INFERENCE** for the drawing.

**Between (i) and (ii): Hagmann does not say.** He describes only the case where the pin is already
down and the Nuancierbalg then arrives — "wenn der Dorn des betätigten und deshalb geschlossenen
Mezzofortebalgs 93 Oeffnung oder Schliessung des Nuancierbalgs auf halbem Wege unterbricht" (pp.
96/97). The reverse order is not discussed anywhere in the chapter or in Anhang 12.

That said, **(ii) is what his wording implies, and (ii) is therefore what I would implement.** A
stop placed at the midpoint that interrupts travel "auf halbem Wege" in either direction confines
the bellows to whichever half it is in — that just is what a midpoint stop does. midi2exp's
assumption and Hagmann's text agree here, which is worth saying since they diverged on sforzando.
(i) is a real mechanical worry but a narrow one: it can only bite while the Nuancierbalg's board
occupies the pin's landing zone, i.e. in a small band around the midpoint, and outside that band the
hook descends into free space and (ii) obtains. My suggestion is to implement (ii) and treat (i) as
a numerical edge case — if the bellows is within a small epsilon of the mf position when MF is
commanded, snapping it to mf is both harmless and probably closer to the physics than either
alternative.

I looked at the plate directly for this. Anhang 13 (p. 186) draws 93 as a small wedge bellows above
and left of the Nuancierbalg, hinged at the left, its *upper* leaf moving; that leaf extends right
as a long rigid arm ending in a hook that curls downward and back up, forming an open notch. In the
drawn rest position (93 open) the hook hangs clear above and to the right of 90's moving board. A
notch, unlike a plain pin, would block in both directions once the board sits inside it — consistent
with Hagmann's "Oeffnung oder Schliessung". **But the engagement geometry cannot actually be read at
this reproduction's resolution** (see §8.4), and the hook's depth relative to the board's travel arc
is not determinable. I would not build anything load-bearing on the drawing here.

**Does the MF bellows close with an appreciable delay?** Hagmann gives no time, and — more usefully —
**there is no adjuster for one.** Conduit 54 carries no throttle: the crescendo and sforzando paths
each have a numbered, roll-normed throttle (39 → 98, 23 → 99), and 54 has none, on the drawing or in
the text. The part numbers 85–101 are fully accounted for without one. Anhang 12 has no control that
times the mezzoforte bellows either: control 7 only checks that it opens on release ("Oeffnet sich
der Mezzoforte-Balg 93 bei der Auslösung nicht, Kontrolle des Balgventils", p. 184) and control 2c
only checks the resulting mf loudness. Welte normed every timing they cared about; they did not norm
this one. **INFERENCE**, but the argument from the absence of an adjuster seems reasonably strong:
the MF bellows was meant to move as fast as it could, and the model can treat the pin as effectively
instantaneous.

One loose upper bound is derivable from control 7 (p. 184): "Eingabe von Mezzoforte, Crescendo und
Sforzando an: Die Nuancierbälge 90 schliessen sich rasch bis zur Mezzoforte-Stellung." For the pin to
catch a bellows travelling at *sforzando* speed, it must be down before that bellows covers half its
range. So the MF closing time is shorter than half the sforzando p→f travel time — unless the
Skalarolle punches the mezzoforte perforation ahead of the others, which Hagmann does not say either
way. **INFERENCE.**

**Retraction.** Cancelling at opening 7 works like every other cancel: valve 53's chamber is cut from
wind chamber 15 and reopened to atmosphere via wind chamber 17, air returns through 54, and the
bellows' own spring opens it. Hagmann: "Auch im Bezug auf Aufrechterhaltung und Auslösung der
Funktion ergeben sich keinerlei Differenzen" (p. 100). Control 7 then expects the Nuancierbalg to go
"rasch in die Forte-Stellung" immediately, so retraction is not treated as a limiting delay. **No
number, no throttle, no timed control — same conclusion as for closing.**

### 8.4 Bore ratios from the plates: not measurable, and here is why

I went to the native bitmap rather than the rendered page. Anhang 13 is embedded as a **1-bit
bilevel scan, 1744 × 2480 px for the whole A4 sheet** (≈ 210 dpi), so the nuancing unit occupies
roughly 500 × 340 native pixels and no amount of rendering resolution adds detail.

More decisive than the resolution: **the drawing does not represent bores as scaled channels.**
Conduits 23, 33, 39 and 54 run from the relay to the nuancing unit as **single pen strokes**, not as
double-walled passages. Measuring ink runs across them gives widths of 1–13 px varying along a
single line, which is pen weight and scan noise, not encoded diameter. The throttles 96, 97, 98, 99
and 100 are drawn as adjusting *screws* in a wall — symbols for "adjustable orifice", with no seat
diameter shown. The channels that do have two walls are freehand cut-away sections inside the
manifold blocks and are not dimensioned either.

Hagmann says as much himself, in the first note he attaches to any of the sketches (p. 62, note 29):

> "Die Skizzen geben die pneumatischen Einrichtungen nicht in ihrer tatsächlichen Anordnung wieder,
> sondern verstehen sich als schematische Darstellungen."

Strictly that is about layout ("Anordnung"), but combined with the single-stroke convention it
settles the question. **Any ratio I reported from these plates would be invented.** The only
relative-size information in the whole source is the two verbal statements already in §2: conduit 39
is "mittelbreit", conduit 23 is "im Vergleich zur Kondukte 39 breiter dimensioniert", and bore 100
is a supplement too small to substitute for 39. Nothing about 54, and nothing numeric.

The rate constants will have to be fitted rather than read off. What the source does give you for
fitting is the *constraint structure* — symmetry within each pair, sforzando faster than crescendo,
and the roll-defined durations of Skalarolle controls 3, 4a and 5, which are measurable on a scale
roll if one can be obtained. Welte's own booklets (Welte 17 for T-100, Welte 13 for T-98) and the
New York *Instructions for Testing and Regulating* (Welte 1924.1) are the places where real
dimensions might survive.

---

## Summary of what is load-bearing and what is not

Solid, and directly usable:

- Conduit widths ordered 23 > 39, with 100 as a supplementary throttled bore; adjusters 96, 97, 98,
  99, 100 identified and each tied to a named Skalarolle control.
- Both flow pairs designed time-symmetric, with the sforzando pair faster than the crescendo pair.
- Sforzando-off is duration-proportional and cumulative, with the subito-piano vacuum dump (97)
  running in parallel to the bellows reopening (96) on a shorter time constant.
- The mezzoforte stop blocks travel in both directions, at a position that is adjustable rather than
  fixed.
- The cone valve position is the sum of Nuancierbalg and Regelbalg contributions on one chain band.
- Roll line numbering (Anhang 10) and its relation to the drawing labels 7–12.

- The Sforzando–Crescendo pairing is a **roll punching convention**, not relay wiring (§8.1), which
  makes it checkable on 3309.
- The sforzando-off auxiliaries are **momentary**, so the reopening assist through 96 is
  duration-proportional, while throttle 97 collapses the delivered vacuum immediately on a separate
  path (§8.2).
- The mezzoforte pin is a stop, never a driver; it confines the Nuancierbalg to the half it is in,
  and its own travel time is unnormed and can be treated as instantaneous (§8.3).

Open, and I would not paper over any of them:

- Whether T-100 Sforzando-on truly latches. Hagmann says yes, and the drawing agrees; the Skalarolle
  controls are compatible with either reading; midi2exp says no. This is now the largest single
  uncertainty in the model.
- What happens to the mezzoforte pin when the Nuancierbalg is already past the midpoint. Hagmann
  does not treat the case; (ii) follows from his wording but is not stated by him.
- What a drawn nuancing line on a red roll actually records. Hagmann offers nothing here; §5 and
  §8.2 give two tests that could decide it from the data.
- Any absolute timing or vacuum figure for the piano, and any bore dimension. There are none in the
  book, and none can be measured off the plates (§8.4).
