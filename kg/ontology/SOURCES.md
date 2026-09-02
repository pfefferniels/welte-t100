# The ontologies this graph is built on

Three files in `external/`, fetched 2026-09-02 and committed unchanged so that a build is
reproducible without the network.

| File | Model | Namespace | Fetched from |
|---|---|---|---|
| `crminf_v1.2.1.rdf` | CRMinf 1.2.1 (stable, April 2026) | `http://www.cidoc-crm.org/extensions/crminf/` | `https://cidoc-crm.org/extensions/crminf/rdfs/1.2.1/CRMinf_v1.2.1.rdf` |
| `crmsci_v3.2.rdf` | CRMsci 3.2 (May 2026) | `http://www.cidoc-crm.org/extensions/crmsci/` | `https://cidoc-crm.org/extensions/crmsci/rdfs/3.2/CRMsci_v3.2.rdf` |
| `cidoc_crm_v7.1.3.rdf` | CIDOC CRM 7.1.3 (February 2024) | `http://www.cidoc-crm.org/cidoc-crm/` | `https://cidoc-crm.org/rdfs/7.1.3/CIDOC_CRM_v7.1.3.rdf` |

CRMinf 1.2.1 declares `owl:imports` on CIDOC CRM 7.1.3 and CRMsci 3.2, so the three are a
matched set. `kg/build/check.py` reads all three and refuses any class or property this project
uses that is not declared in one of them.

## The CRMinf encoding is published but not listed

<https://cidoc-crm.org/crminf/fm_releases> links RDFS files only for version 0.7, and states that
encodings are given only for versions "stable and recommended for implementation". That is
misleading: the 1.2.1 encoding exists at the URL above, following the same path pattern CRMsci
uses, and CRMsci 3.2 references CRMinf 1.2.1 terms by URI throughout. It is simply absent from
the release table. Anyone reading only the release page would conclude, as this project first
did, that they had to derive their own RDFS from the PDF. They do not.

## Where the encoding and the specification part company

Recorded because the graph follows the **encoding**, and a reader holding the PDF will otherwise
find the difference confusing.

**1. `I6 Belief Value` is not in the RDFS.** The specification declares it as a class
(`I6 ⊑ E59 Primitive Value`, p. 34) and gives `J5 holds to be` the range `I6 Belief Value`
(p. 12). The RDFS declares no `I6_Belief_Value` at all and gives `J5_holds_to_be` the range
`rdfs:Literal`. This graph writes belief values as plain literals — `TRUE`, `FALSE`, `UNKNOWN`,
`PROBABLE` — as the encoding requires. The specification's own advice (p. 7) to "use a richer
vocabulary of belief values, at least including UNKNOWN" is easier to follow this way, not
harder.

**2. `J25 is encoded by` takes a literal.** The specification gives the range as `E62 String`
(p. 12); the RDFS gives `rdfs:Literal`. Same decision, same reason.

**3. The specification's own tables disagree with its declarations, twice.** Table 1 (p. 10)
puts `I2 Belief` directly under `E1 CRM Entity` and `I4 Proposition Set` under
`E73 Information Object`; the class declarations (pp. 30, 32) say `I2 ⊑ E2 Temporal Entity` and
`I4 ⊑ E89 Propositional Object`. The RDFS follows the declarations, and so does this graph. The
`I2 ⊑ E2` reading is the one the project needs: it is what makes `P173`–`P185` available for
ordering a belief against the belief it replaced.

**4. `J2_concluded_that` is declared a subproperty of both `P175` and its own inverse `P175i`.**
That is very likely a slip in the encoding — `P175i starts after or with the start of` says the
opposite of `P175`, and together they force the argumentation and the belief to start at the same
instant. The third superproperty, `P185 ends before the end of`, is unproblematic and carries the
useful reading: the argumentation finishes before the belief it concluded does. Nothing in this
graph relies on either `P175` direction, so the slip is inherited without consequence; it is
recorded here so that a later reasoner behaving oddly is not mistaken for our error.

**5. `S28` is named twice in the specification.** Table 2 (p. 11) lists "S28 Observable
Situation", the p. 11 class tree "S28 Observable Proposition". CRMsci 3.2 settles it: `S28` is
Observable Situation and `S29` is Observable Proposition, the latter a subclass of both
`S28` and `I17 One-Proposition Set`.

## What CRMsci contributes that the specification's prose does not make obvious

`O8 observed`, `O9 observed property type` and `O16 observed value` have domain
**`S4 Single Observation`**, not `S27 Observation`. `S21 Measurement` is a subclass of `S27`, not
of `S4`, and carries its own `O39 observed dimension → E54 Dimension`. So a measurement and a
single observation attach their result by different properties, and this graph uses:

- `S21 Measurement` + `O24 measured` + `O39 observed dimension` for a reading off an instrument;
- `S4 Single Observation` + `O8 observed` + `O9 observed property type` + `O16 observed value`
  for an observation of a roll, which also inherits `E13 Attribute Assignment` and with it
  `J33 assigned propositions`.

`S29 Observable Proposition` being simultaneously an `I17 One-Proposition Set` means an observed
proposition needs no parallel structure: the same node answers both `O38 is domain of` and
`J30 has domain`.
