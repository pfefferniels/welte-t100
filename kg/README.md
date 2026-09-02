# A knowledge graph of Welte-Mignon T-100 dynamics

What is known about the T-100 expression mechanism, and who knows it on what grounds.

The graph is modelled in **CRMinf 1.2.1**, the CIDOC CRM argumentation extension, with
**CRMsci 3.2** for observation and measurement. Nothing here is asserted as a fact. Every
proposition is attached to a holder, a belief value and a located passage, because the
questions this project actually needs answering are of the form *who says so, on what
evidence, and who disagrees* — and those cannot be asked of a graph of bare assertions.

The graph does not replace `emulator/docs/`. Those documents are where the arguments are
made at length; the graph indexes their load-bearing propositions, carries the quotation and
the locator, and points back. Links run graph → prose and never the other way, so the
Markdown never has to be kept in step with anything.

## Running it

```
pip install -r kg/requirements.txt          # rdflib, PyYAML, pyshacl
python -m kg.build compile                  # -> kg/out/graph.trig and graph.ttl
python -m kg.build check                    # SHACL, vocabulary closure, competency questions
python -m kg.build report                   # -> kg/out/reports/
python -m kg.build view                     # -> kg/out/graph.html, a browsable page
python -m unittest discover -s kg/tests -t . # the compiler's own tests
node --test kg/view/app.test.mjs             # renders every route of the built page
```

## The viewer

`python -m kg.build view` writes two self-contained pages into `kg/out/`, both about 750 KB
with no external dependency: `graph.html` to open from disk, and `graph.artifact.html`
without the document skeleton, for publishing.

It has two modes. **Graph** opens on the contested questions and has three ways in — **Questions**, one subject and
one property type, marked ◆ where two witnesses answer differently; **Sources**, each with
its statements, quotations and locators; **Entities**, a component or property type with
everything said about it. `/` focuses the search box, Escape clears it, and every premise,
withdrawal and contradiction is a link, so an argument can be walked back to the passage it
rests on. The template is `kg/view/app.html`; the data is inlined at build time.

**Mechanism** draws the nuancing gear as a schematic and runs it. Every box and every arrow
comes from the topology statements in `hagmann-1984` and the project's own reading of his
plate in `pfeffer-anhang13`, so a link that is not in the graph is not in the drawing, and a
link Brougher states of the Licensee and the Original together is in the graph and kept off
the page; every constant the simulation uses comes from `emulator-fit`, and clicking a part
gives its statements, its constants and the page each was read from.

The animation is built on the principle Hagmann states at p. 66: the mechanism is a closed
system the blower draws the air out of, and it is ordinary air let in through a perforation
that moves anything. So a part is drawn amber while it holds air at atmospheric pressure and
teal while it has been drawn down; the moving dashes are air rather than signal; and on a
suction line they travel *towards* the blower, against the direction the causation is
described in. Conduit 39 is the case worth watching, and the one line in the drawing that
carries both: valve 38 puts its far end on vacuum or on atmosphere, so the same conduit
empties the bellows during a crescendo and refills it when the crescendo is cancelled. That
is the structural reading the whole model rests on, and it is now visible rather than
asserted.

Each box is a cut-away rather than a labelled rectangle, and the air goes on running inside
it. A perforation passes over the tracker bar and air falls through the hole into the
opening; it bows a membrane up, and the membrane's wire lifts the valve above it. A double
valve is drawn as what it is, a shuttle between two seats: raised it seals the mouth to wind
chamber 17 while 15 draws the chamber down, dropped it lets 17 fill the chamber again, and
the arrow on its conduit turns round at the moment it changes over. Valve 22 has one seat
and not two, because that is what Hagmann gives the sforzando, and chamber 41 is drawn as the
two halves the latch actually consists of. Air in the wind chambers is stippled, thickly in
17 and thinly in 15, and chambers 86 and 88 thin out as the Nuancierbalg closes — the
loudness map with nothing added to it.

The cut-aways are a reading of Anhang 13 in the same sense the layout is. Each part is drawn
upright in its own working orientation while the arrangement left to right is the graph's,
since the plate stacks a membrane, its valve and the latch one above another; and every state
a cut-away shows is one the running model is already in, so nothing moves in there that the
drawing does not otherwise assert.

There is no roll on the machine, and the reader plays it. Openings 7 to 12 are keys 1 to 6
and the boxes on the drawing can be pressed directly, so a perforation lasts exactly as long
as it is held: hold Crescendo on and watch the bellows walk up and stay there when you let
go, drop the Mezzoforte hook into its path and let the crescendo off to see the fall arrested
half way, tap Sforzando on and see a short perforation buy less travel than a long one. The
trace under the drawing is the last twelve seconds of your own playing, with the pin marked.

The simulation is a **reduced** re-implementation of `emulator/src/model/pneumatic.ts`: the
flow law, the latches, the valve charge and the Mezzoforte stop, and not the aperture
geometry, the scale warp, the drag threshold or the rebound. With no roll here there is
nothing on the page to measure it against either. It shows how the gear behaves and is not a
reading of any performance; the fit against a drawn line is scored in `emulator/`, not here.

Building it turned up a discrepancy inside `emulator/src/model/stop.ts`: its file header says
a descending board rests on the pin's **upper** face, while `limitAtStop` returns
`Math.max(moved, lower)` when the bellows is confined above — the lower face — which is also
the only reading on which `settings.ts`'s arithmetic works. Both are now statements in the
graph, marked as contradicting each other. The schematic follows the code.

Everything under `kg/out/` is generated and gitignored. Everything else is hand-authored and
meant to be read in a diff.

## Adding a source

Write one YAML file in `sources/`. Anything it refers to — an actor, a component, a property
type, a unit, an inference logic — has to be declared in `entities/` first, and the loader
will tell you exactly what is missing before it writes anything.

```yaml
source:
  id: hagemann-2001
  kind: article
  title: "Einstellanleitung für Welte-Mignon"
  authors: [hagemann-reinhard]
  container: "Das Mechanische Musikinstrument 80"
  year: 2001
  pages: "25–27"
  copy: "~/Projects/stgall/einstellanleitung.pdf"

statements:
  - id: piano-vacuum
    kind: measurement
    locator: "p. 25, §2"
    quote:
      de: "-4\" WS = -101.6 mm WS"
    subject: ibach-8171-21310
    property: vacuum-in-piano
    value: -101.6
    unit: mm-water-column
    holds: TRUE
    adopt: true
```

### The fields

| field | meaning |
|---|---|
| `id` | slug, unique within the source. Lower case, no slashes. |
| `kind` | `measurement` · `observation` · `report` · `inference` · `assessment` · `convention` |
| `locator` | page, figure, §, commit and line. **Required.** Nothing enters the graph without one. |
| `quote` | verbatim, keyed by language code. `translation:` is optional and English. |
| `subject` / `property` | the proposition's domain and its property type, both declared entities |
| `object` | the range, when it is another entity |
| `value` / `lower` / `upper` / `sd` / `n` / `unit` | the range, when it is a magnitude. A unit is required. |
| `gloss` | the proposition kept in words. Only an `assessment` still uses it; every other statement in the graph is a subject–property–object or subject–property–magnitude proposition, and a sentence that says three things is three statements |
| `holder` | who holds the belief; defaults to the source's first author |
| `holds` | `TRUE` · `FALSE` · `UNKNOWN` · `PROBABLE` |
| `adopt` | `true` if the project itself takes the claim over from the source |
| `comprehension` | how the passage was read, where the reading is not obvious or is contestable |
| `transmitted_by` | who printed someone else's words, when the holder is not the source's author |
| `mentions` | further entities the sentence is about. A one-proposition set is binary, so the third participant — the conduit a link runs through, the state a vacuum was read in — goes here and reaches the graph as `J28 contains entity reference` |
| `date` | `{begin, end, label}`, when the range is a time-span rather than a value or an entity |
| `scope` | the type or machine the author limits the claim to |
| `premises` / `logic` | for an inference: what it rests on, and by what reasoning |
| `supersedes` / `contradicts` | ids, for revision and for the contested register |
| `about` | for an assessment: the thing whose provenance is being assessed |
| `note` | prose that belongs with the statement rather than in a document |

### The entity kinds

`person` · `group` · `place` · `concept` · `property-type` · `unit` · `component` ·
`instrument` · `roll` · `object` · `feature` · `collection` · `work` · `document` · `text` ·
`software` · `procedure` · `logic`, and three event kinds: `activity`, `production`,
`performance`.

Each kind is one CIDOC CRM class, and the class decides how the kind nests. A `feature` is an
E25 Human-Made Feature and sits on its carrier by `P56 bears feature`, which is what a line
drawn on a roll is; a `collection` is an E78 Curated Holding; a `procedure` is an E29 Design
or Procedure, which is what each of Welte's Skalarollen-Kontrollen is; texts nest by `P148 has
component`, types by `P127 has broader term`, and any other physical thing by `P46 is composed
of`.

An event record declares only that the event exists and what kind it is. When it happened,
where, and who carried it out are **statements** with locators, so the CIDOC CRM in the
adopted layer is derived from beliefs rather than asserted beside them. That is why
`entities/world.yaml` looks so bare and `sources/stanford-sdr.yaml` is where the roll's
history actually lives. There is no shortcut from a thing to its maker in CIDOC CRM, so an
instrument's makers are participants in a `production` event, and where a text's author is
known the entity says so with `created_by`, which becomes an E65 Creation.

Four entity fields wire the network:

- **`crm_property`** on a property type names the CIDOC CRM, CRMsci or CRMinf property it
  stands for — `carried-out-by` → `P14_carried_out_by`, `date-of` → `P4_has_time-span`,
  `derives-from` → `P130_shows_features_of`, `louder-than` →
  `O28_is_conceptually_greater_than`. The initial says which model the term belongs to. The
  reified proposition keeps the S9 Property Type for provenance; the plain triple in the
  adopted layer uses the named property. `check` refuses any name not declared in the
  vendored files, so a typo fails the build rather than living on as a dead URI.
- **`concerns`** on a property type points at what it is a property of, as `P67 refers to`.
  `vacuum-in-crescendo` concerns `state-crescendo`, so the crescendo can be asked what has
  been measured in it even though the state is folded into the property type's name to keep
  the proposition binary.
- **`inference_class`** on a logic names the CRMsci class an inference applying it also
  belongs to: `S6 Data Evaluation` for a fit, a rate-law comparison or arithmetic on stated
  values, `S7 Simulation or Prediction` for the ablation, `S8 Categorical Hypothesis
  Building` for composing a source's statements into a claim about the type. The inference
  keeps its `I5` type beside it, because CRMsci 3.2 still declares the three under its own
  `S5` rather than under `I5`, and an `S6` with a magnitude also `O10 assigned` its dimension.
- **`same_as`** on a document that the graph also cites as a source points at the source's
  node, so the book claims are made about and the witness claims are read out of are linked
  without being collapsed.
- **`enumerable`** on a property type says that one subject may truly have several objects
  under it — the parts a wind chamber evacuates, the states a state is louder than, the
  controls a throttle is normed by. The contested register then lists such a question only
  when the same object is held with different confidence or two answers are marked as
  contradicting, not merely because two witnesses each named a different part.

**What is deliberately not CRM.** The pneumatic topology — `evacuates`, `admits-air-to`,
`opens-throttle`, `holds-state-latched` — carries no `crm_property`, and neither do
`mechanically-couples`, `models`, `identified-with` or the other properties that say what a
part does or which part another witness's part is. CIDOC CRM has no vocabulary for what a
conduit does to a bellows, and mapping these onto some part-whole or influence property would
misrepresent both the model and the mechanism. They stay project properties, and the adopted
layer says so by keeping them in the project namespace. Every property that CIDOC CRM or
CRMsci *does* have a term for uses it.

### What each kind compiles to

**`measurement`** — a reading taken off an instrument.
`S21 Measurement`, with `O24 measured` naming the thing and `O39 observed dimension` an
`E54 Dimension` carrying `P90 has value`, `P91 has unit`, and `P90a`/`P90b` for an interval.
Being an `I1 Argumentation` it `J2 concluded that` an `I2 Belief`.

**`observation`** — something seen on a roll or a plate.
`S4 Single Observation`, with `O8 observed`, `O9 observed property type` and
`O16 observed value`, expressing its result as an `S29 Observable Proposition` — which is
simultaneously an `I17 One-Proposition Set`, so no parallel structure is needed.

**`report`** — what an author states.
A plain `I1 Argumentation` by the holder, concluding their belief. The passage
`P70 documents` it. Where `transmitted_by` is given, the person who printed the words gets
their own `I7 Belief Adoption`, so that Welte's sentence quoted by Hagemann is three
witnesses deep and the graph says which layer is which.

**`inference`** — a conclusion the project draws.
`I5 Inference Making`, `J1 used as premise` each premise's belief, `J3 applied` the named
`I3 Inference Logic`. A premise that is a *convention* is linked with
`P16 used specific object` instead, because a stipulation is not believed and `J1` wants a
belief.

**`assessment`** — a finding about where a claim came from.
`I15 Provenance Assessment` → `J21 concluded provenance` → `I14 Provenance Belief` →
`J19 that` → `I10 Provenance Statement`. Held `UNKNOWN` where the audit found nothing. This
is how "no Welte test roll is named anywhere in either repository" becomes a node.

**`convention`** — a value stipulated rather than believed.
`E13 Attribute Assignment` with `J33 assigned propositions`, and **no belief at all**.
`mfThickness = 0.06` is here because `settings.ts` says of itself that the value "is not a
measurement and no value here would be".

**`adopt: true`** adds three nodes on top of any of the above: an `I7 Belief Adoption` by the
project, an `I13 Intended Meaning Belief` for what we take the source to have meant, and an
`I12 Adopted Belief` for what we then hold ourselves. With `comprehension:` it also gets an
`I16 Meaning Comprehension` recording how the passage was read. Keeping the three apart is
what lets the graph say that Hagmann's "Oeffnung **oder** Schliessung" is our reading of a
German sentence and not a fact about brass.

## Three rules the graph enforces

**Scope lives in the proposition.** A statement whose subject is the Ibach Welte-Flügel says
something different from one whose subject is the T-100 type, and the graph will not promote
the first into the second. Hagemann says himself that he does not know whether his values
transfer; `out/reports/single-instrument.md` keeps that visible.

**Same unit does not mean same quantity.** Milliseconds appear as a measured traversal time,
as the denominator of a linear rate over some span, and as the time constant of an
exponential. Each is its own property type. So is a fraction of bellows travel against a
fraction of a MIDI velocity span, which is why midi2exp's mezzoforte at 0.4545 and Hagmann's
"auf halbem Wege" sit in the contested register without being converted into each other.

**A bound is not an estimate.** The hook's offset above the printed M.F. gridline can only be
limited from above by this roll, because every engagement is entered from the fortissimo
side. It has its own property type for that reason.

## What comes out

`out/graph.trig` carries one named graph per source, so a source can be revised or withdrawn
whole. `out/graph.ttl` is the union. A second named graph, `graph/adopted`, holds the plain
triple for every proposition the project itself holds true — the convenient layer, derived at
build time from the reified one, never authored directly. Because property types name their
CRM property, that layer is ordinary CIDOC CRM and CRMsci: `P14_carried_out_by`,
`P4_has_time-span`, `P7_took_place_at`, `P108_has_produced`, `P16_used_specific_object`,
`P55_has_current_location`, `P51`/`P52` for owners, `P130_shows_features_of` for descent,
`P129_is_about` for what a text is about, `O28_is_conceptually_greater_than` for the dynamic
ladder, `P90`/`P91` on dimensions, `P82a`/`P82b` on time-spans. A magnitude of a physical
thing — a rail on the drawn line, a vacuum on the Ibach — is attached by CRMsci's
`O12_has_dimension`, with the E54 Dimension carrying the S9 Property Type, so nothing
narrower is lost.

Five reports in `out/reports/`:

- **`contested.md`** — every question two or more witnesses answer differently, with what
  each answer rests on. The sforzando latch has seven positions in it.
- **`by-source.md`** — a dossier per source, with quotation and locator, checkable against
  the book with nothing else to hand.
- **`single-instrument.md`** — claims resting on one machine.
- **`code-constants.md`** — the emulator's pinned constants against what the graph says they
  are, so the two cannot drift apart silently.
- **`unsupported.md`** — should stay empty.

And `out/competency-questions.md`, the seven queries in `tests/queries/` run against the
graph. A question that stops returning rows is a regression in the graph, not in the query.
Two of them exercise the network rather than the register: `06-signal-path` walks every link
from a glide-block perforation through the relay to the Nuancierbalg, with the page each link
is read from, and `07-roll-history` gives the roll's own history — performance, punching,
scanning, ownership — with the witness and the locator behind every date. `03-what-was-
withdrawn` now also returns midi2exp's own revisions, because its header keeps a version
history and each shipped rate supersedes the values before it.

## Honest limits

The graph records the load-bearing propositions of the documents, not every sentence in them.
Every one of them is now a proposition with a subject, a property type and a range; the only
statements kept in words are the six provenance assessments, because an I15 concludes an
I10 Provenance Statement and that is what an I10 is. Where a sentence said several things it
is several statements, and a concept two witnesses can both point at — `longer-than-punched`,
`treble-set-to-travel-further`, `not-attested` — is declared so that they land in the same row
of the register. Where an argument does not fit the six kinds above, the conclusion is
recorded with a pointer and the argument stays in the Markdown; the graph should not pretend
to formalise more than it has.

Some propositions are deliberately weaker than the vocabulary would allow. Phillips's four
lettered adjusters are `identified-with` Hagmann's numbered ones at PROBABLE, and the fourth
is a guess held at the same value only because there is nothing between PROBABLE and
UNKNOWN. Brougher's screws, nut and regulator are entities of his own and are identified with
nothing, on his own statement that the screws cannot be numbered from any drawing.

Quotations in `hagemann-2001`, `hagmann-1984`, `welte-anhang-12`,
`brougher-welte-regulation` and `phillips-2016` were verified against the local PDFs. Those
in `gottschewski-1996` are taken from `emulator/docs/gottschewski.md` and have not been
re-checked against the book.

`phillips-2016` is the only source here that built a model of the same mechanism before this
project did, and the only one that says what drew the lines on a late Welte-Mignon roll. It
is also the source whose figures are furthest from their object: Tables 4.1 to 4.3 time an
analogue circuit that was adjusted until it satisfied a Welte test roll, so what they measure
is the test roll's criteria plus the circuit's own dynamics, and
`phillips-2016/fast-times-came-from-the-model` says so. Only its Welte expression material is
in the graph. The catalogue chapters, the roll reader, the Ampico and Duo-Art systems and the
Green Welte timings are all left out as outside the T-100 dynamics.

`brougher-welte-regulation` is the one source written for two instruments at once, the
Licensee and the Original, mostly without saying which a figure is meant for. Its statements
are scoped to `welte-licensee-and-original`, which is a scope and not a type, and nothing in
it is adopted unless the graph already holds the same claim from another witness. He also
writes in inches of water where the graph works in mm; the conversion is exact and it is the
project's, with his figure verbatim in every quotation.

The `https://w3id.org/welte-t100/` identifiers do not dereference yet. That needs a pull
request to `perma-id/w3id.org`, which has not been filed.
