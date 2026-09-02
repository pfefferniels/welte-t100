"""Turn a `Corpus` into RDF: one named graph per source, plus entities and the adopted layer.

The shape each authoring kind takes is decided here and nowhere else. `kg/README.md`
describes the same six shapes in words; if the two ever disagree, this file is what runs.
"""

from __future__ import annotations

from collections.abc import Iterable

from rdflib import RDF, RDFS, XSD, Dataset, Graph, Literal, URIRef

from . import names
from .load import resolve
from .names import (
    ADOPTED_GRAPH,
    ANNOTATION_GRAPH,
    ANNOTATIONS,
    CRM,
    ENTITY_GRAPH,
    INF,
    SCI,
    adopted_property,
    entity,
    model_term,
    node,
    source_graph,
)
from .schema import (
    INFORMATION_KINDS,
    PHYSICAL_KINDS,
    BeliefValue,
    Corpus,
    Entity,
    EntityKind,
    LangString,
    Prose,
    Quantity,
    Relation,
    Source,
    Statement,
    StatementKind,
    Temporal,
)

PROJECT_ACTOR = "pfeffer-niels"

ARGUMENTATION_CLASS = {
    StatementKind.MEASUREMENT: SCI.S21_Measurement,
    StatementKind.OBSERVATION: SCI.S4_Single_Observation,
    StatementKind.REPORT: INF.I1_Argumentation,
    StatementKind.INFERENCE: INF.I5_Inference_Making,
    StatementKind.ASSESSMENT: INF.I15_Provenance_Assessment,
    StatementKind.CONVENTION: CRM.E13_Attribute_Assignment,
}

CONCLUDES = {
    StatementKind.ASSESSMENT: INF.J21_concluded_provenance,
}

BELIEF_CLASS = {StatementKind.ASSESSMENT: INF.I14_Provenance_Belief}
BELIEF_SUBJECT = {StatementKind.ASSESSMENT: INF.J19_that}


def _label(text: str, limit: int = 120) -> Literal:
    flat = " ".join(text.split())
    return Literal(flat if len(flat) <= limit else flat[: limit - 1] + "…")


class Emitter:
    def __init__(self, corpus: Corpus) -> None:
        self.corpus = corpus
        self.entities = corpus.by_id()
        self.statements = corpus.statements_by_key()
        self.dataset = Dataset()
        for prefix, namespace in names.BINDINGS.items():
            self.dataset.bind(prefix, namespace)

    def build(self) -> Dataset:
        self._emit_annotations()
        self._emit_entities()
        for source in self.corpus.sources:
            graph = self.dataset.graph(source_graph(source.ident))
            self._emit_source(source, graph)
            for statement in source.statements:
                self._emit_statement(statement, source, graph)
        return self.dataset

    # -- fixed furniture -------------------------------------------------------

    def _emit_annotations(self) -> None:
        graph = self.dataset.graph(ANNOTATION_GRAPH)
        for predicate, comment in ANNOTATIONS.items():
            graph.add((predicate, RDF.type, RDF.Property))
            graph.add((predicate, RDFS.label, _label(str(predicate).rsplit("/", 1)[-1])))
            graph.add((predicate, RDFS.comment, Literal(comment, lang="en")))

    def _emit_entities(self) -> None:
        graph = self.dataset.graph(ENTITY_GRAPH)
        for item in self.corpus.entities:
            self._emit_entity(item, graph)

    def _emit_entity(self, item: Entity, graph: Graph) -> None:
        shape = item.shape
        uri = entity(shape.space, item.ident)
        graph.add((uri, RDF.type, shape.crm_class))
        if shape.auto_type:
            graph.add((uri, CRM.P2_has_type, entity("concept", shape.auto_type)))
        self._add_labels(graph, uri, item.labels)
        if item.note:
            graph.add((uri, CRM.P3_has_note, Literal(item.note, lang="en")))
        if item.part_of:
            graph.add((uri, self._within(item), self.uri_of(item.part_of)))
        if item.instance_of:
            graph.add((uri, CRM.P2_has_type, self.uri_of(item.instance_of)))
        if item.created_by:
            # An E65 Creation for a text, parallel to the one every source gets, so that a
            # booklet the project has never seen still has an author in CRM terms.
            creation = node("creation", "entity", item.ident)
            graph.add((creation, RDF.type, CRM.E65_Creation))
            graph.add((creation, CRM.P94_has_created, uri))
            graph.add((creation, RDFS.label, _label(f"creation of {item.ident}")))
            for actor in item.created_by:
                graph.add((creation, CRM.P14_carried_out_by, self.uri_of(actor)))
        for concern in item.concerns:
            # A property type refers to the state or function it is a property of, so the
            # network can be walked from the thing to everything said about it.
            graph.add((uri, CRM.P67_refers_to, self.uri_of(concern)))
        for other in item.same_as:
            graph.add((uri, RDFS.seeAlso, URIRef(other)))
        if item.code:
            symbol = entity("symbol", item.ident)
            graph.add((symbol, RDF.type, CRM.E42_Identifier))
            graph.add((symbol, CRM.P190_has_symbolic_content, Literal(item.code)))
            graph.add((symbol, CRM.P2_has_type, entity("concept", "code-symbol")))
            graph.add((uri, CRM.P1_is_identified_by, symbol))
        graph.add((uri, names.DEFINED_IN, Literal(item.defined_in)))

    @staticmethod
    def _add_labels(graph: Graph, uri: URIRef, labels: Iterable[LangString]) -> None:
        for lang, text in labels:
            graph.add((uri, RDFS.label, Literal(text, lang=lang)))

    @staticmethod
    def _within(item: Entity) -> URIRef:
        """The part-whole property a kind of entity nests by.

        Types nest by broader term, information objects by component, a feature sits on
        the thing that bears it, and any other physical thing is a part of a whole.
        """
        if item.kind is EntityKind.FEATURE:
            return CRM.P56i_is_found_on
        if item.kind in INFORMATION_KINDS:
            return CRM.P148i_is_component_of
        if item.shape.crm_class == CRM.E55_Type:
            return CRM.P127_has_broader_term
        return CRM.P46i_forms_part_of

    def uri_of(self, ident: str) -> URIRef:
        item = self.entities[ident]
        return entity(item.shape.space, item.ident)

    # -- sources ---------------------------------------------------------------

    def _emit_source(self, source: Source, graph: Graph) -> None:
        uri = entity("source", source.ident)
        graph.add((uri, RDF.type, CRM.E31_Document))
        graph.add((uri, RDFS.label, _label(source.title or source.ident)))
        graph.add((uri, CRM.P3_has_note, Literal(source.citation(), lang="en")))
        graph.add((uri, CRM.P2_has_type, entity("concept", f"source-kind-{source.kind}")))
        if source.note:
            graph.add((uri, CRM.P3_has_note, Literal(source.note, lang="en")))
        for kind, value in (("citation-key", source.identifier), ("url", source.url),
                            ("local-copy", source.copy)):
            if value:
                appellation = node("identifier", source.ident, kind)
                graph.add((appellation, RDF.type, CRM.E42_Identifier))
                graph.add((appellation, CRM.P190_has_symbolic_content, Literal(value)))
                graph.add((appellation, CRM.P2_has_type, entity("concept", kind)))
                graph.add((uri, CRM.P1_is_identified_by, appellation))
        if source.authors:
            creation = node("creation", source.ident, "authorship")
            graph.add((creation, RDF.type, CRM.E65_Creation))
            graph.add((creation, CRM.P94_has_created, uri))
            for author in source.authors:
                graph.add((creation, CRM.P14_carried_out_by, self.uri_of(author)))
            if source.year:
                span = node("timespan", source.ident, "authorship")
                graph.add((span, RDF.type, CRM["E52_Time-Span"]))
                graph.add((span, RDFS.label, Literal(str(source.year))))
                graph.add((creation, CRM["P4_has_time-span"], span))
        graph.add((uri, names.DEFINED_IN, Literal(source.defined_in)))

    # -- statements ------------------------------------------------------------

    def _emit_statement(self, statement: Statement, source: Source, graph: Graph) -> None:
        passage = self._emit_passage(statement, source, graph)
        proposition = self._emit_proposition(statement, graph)
        argumentation = self._emit_argumentation(statement, proposition, passage, graph)
        belief = self._emit_belief(statement, argumentation, proposition, graph)
        if belief is not None:
            self._emit_transmission(statement, belief, proposition, passage, graph)
            self._emit_adoption(statement, proposition, passage, graph)
            self._emit_revision(statement, belief, graph)
            self._emit_contradictions(statement, belief, graph)
        self._emit_adopted_layer(statement, proposition)

    def _emit_passage(self, statement: Statement, source: Source, graph: Graph) -> URIRef:
        passage = node("passage", statement.source, statement.ident)
        graph.add((passage, RDF.type, CRM.E31_Document))
        graph.add((passage, RDFS.label, _label(f"{source.ident}, {statement.locator}")))
        graph.add((passage, names.LOCATOR, Literal(statement.locator)))
        graph.add((entity("source", source.ident), CRM.P148_has_component, passage))
        for lang, text in statement.quotes:
            graph.add((passage, CRM.P190_has_symbolic_content, Literal(text, lang=lang)))
        if statement.translation:
            graph.add((passage, CRM.P3_has_note, Literal(statement.translation, lang="en")))
        return passage

    def _emit_proposition(self, statement: Statement, graph: Graph) -> URIRef:
        proposition = node("proposition", statement.source, statement.ident)
        claim = statement.claim

        if isinstance(claim, Prose):
            is_provenance = statement.kind is StatementKind.ASSESSMENT
            graph.add((proposition, RDF.type,
                       INF.I10_Provenance_Statement if is_provenance else INF.I4_Proposition_Set))
            graph.add((proposition, CRM.P3_has_note, Literal(claim.gloss, lang="en")))
            graph.add((proposition, RDFS.label, _label(claim.gloss)))
            if claim.encoded:
                graph.add((proposition, INF.J25_is_encoded_by, Literal(claim.encoded)))
            if claim.subject:
                graph.add((proposition, INF.J28_contains_entity_reference, self.uri_of(claim.subject)))
            if claim.property:
                graph.add((proposition, INF.J29_contains_property_type, self.uri_of(claim.property)))
            if is_provenance and statement.about:
                graph.add((proposition, INF.J20_is_about_the_provenance_of, self.uri_of(statement.about)))
            return proposition

        observed = statement.kind is StatementKind.OBSERVATION
        graph.add((proposition, RDF.type,
                   SCI.S29_Observable_Proposition if observed else INF["I17_One-Proposition_Set"]))
        graph.add((proposition, INF.J30_has_domain, self.uri_of(claim.subject)))
        graph.add((proposition, INF.J32_has_property_type, self.uri_of(claim.property)))
        graph.add((proposition, INF.J31_has_range, self._range_of(statement, claim, graph)))
        graph.add((proposition, RDFS.label, _label(self.describe(statement))))
        for mentioned in statement.mentions:
            # Whatever the sentence is about but the binary proposition cannot hold: the
            # expression state a vacuum was read in, the parts a chain runs between.
            graph.add((proposition, INF.J28_contains_entity_reference, self.uri_of(mentioned)))
        if statement.scope:
            graph.add((proposition, names.SCOPED_TO, self.uri_of(statement.scope)))
            graph.add((proposition, INF.J28_contains_entity_reference,
                       self.uri_of(statement.scope)))
        return proposition

    def _range_of(self, statement: Statement, claim: object, graph: Graph) -> URIRef:
        if isinstance(claim, Relation):
            return self.uri_of(claim.object)
        if isinstance(claim, Temporal):
            return self._emit_timespan(statement, claim, graph)
        return self._emit_dimension(statement, claim, graph)

    def _emit_timespan(self, statement: Statement, claim: Temporal, graph: Graph) -> URIRef:
        span = node("timespan", statement.source, statement.ident)
        graph.add((span, RDF.type, CRM["E52_Time-Span"]))
        if claim.begin:
            graph.add((span, CRM.P82a_begin_of_the_begin, Literal(claim.begin, datatype=XSD.date)))
        if claim.end:
            graph.add((span, CRM.P82b_end_of_the_end, Literal(claim.end, datatype=XSD.date)))
        graph.add((span, RDFS.label, _label(claim.label or claim.begin or claim.end or "")))
        return span

    def _emit_dimension(self, statement: Statement, claim: Quantity, graph: Graph) -> URIRef:
        dimension = node("dimension", statement.source, statement.ident)
        graph.add((dimension, RDF.type, CRM.E54_Dimension))
        graph.add((dimension, CRM.P2_has_type, self.uri_of(claim.property)))
        graph.add((dimension, CRM.P91_has_unit, self.uri_of(claim.unit)))
        for predicate, value in (
            (CRM.P90_has_value, claim.value),
            (CRM.P90a_has_lower_value_limit, claim.lower),
            (CRM.P90b_has_upper_value_limit, claim.upper),
            (names.STANDARD_DEVIATION, claim.sd),
        ):
            if value is not None:
                graph.add((dimension, predicate, Literal(value)))
        if claim.n is not None:
            graph.add((dimension, names.SAMPLE_SIZE, Literal(claim.n)))
        graph.add((dimension, RDFS.label, _label(self.magnitude(claim))))
        return dimension

    def _emit_argumentation(
        self, statement: Statement, proposition: URIRef, passage: URIRef, graph: Graph
    ) -> URIRef:
        argumentation = node("statement", statement.source, statement.ident)
        graph.add((argumentation, RDF.type, ARGUMENTATION_CLASS[statement.kind]))
        for extra in self.sci_classes(statement):
            graph.add((argumentation, RDF.type, extra))
        graph.add((argumentation, CRM.P14_carried_out_by, self.uri_of(statement.holder)))
        graph.add((argumentation, RDFS.label, _label(self.describe(statement))))
        graph.add((argumentation, names.STATEMENT_KIND, Literal(statement.kind.value)))
        graph.add((argumentation, names.DEFINED_IN, Literal(statement.defined_in)))
        graph.add((passage, CRM.P70_documents, argumentation))
        if statement.note:
            graph.add((argumentation, CRM.P3_has_note, Literal(statement.note, lang="en")))
        if statement.when:
            span = node("timespan", statement.source, statement.ident)
            graph.add((span, RDF.type, CRM["E52_Time-Span"]))
            graph.add((span, CRM.P82a_begin_of_the_begin, Literal(statement.when)))
            graph.add((span, RDFS.label, Literal(statement.when)))
            graph.add((argumentation, CRM["P4_has_time-span"], span))

        claim = statement.claim
        if statement.kind is StatementKind.MEASUREMENT and isinstance(claim, Quantity):
            graph.add((argumentation, SCI.O24_measured, self.uri_of(claim.subject)))
            graph.add((argumentation, SCI.O39_observed_dimension,
                       node("dimension", statement.source, statement.ident)))
        elif statement.kind is StatementKind.OBSERVATION and not isinstance(claim, Prose):
            graph.add((argumentation, SCI.O8_observed, self.uri_of(claim.subject)))
            graph.add((argumentation, SCI.O9_observed_property_type, self.uri_of(claim.property)))
            value = self._range_of(statement, claim, graph)
            graph.add((argumentation, SCI.O16_observed_value, value))
            graph.add((argumentation,
                       SCI.O37_expressed_the_observed_as_observable_proposition, proposition))
            graph.add((argumentation, INF.J33_assigned_propositions, proposition))
        elif statement.kind is StatementKind.CONVENTION:
            graph.add((argumentation, INF.J33_assigned_propositions, proposition))
        elif statement.kind is StatementKind.INFERENCE:
            if statement.logic:
                graph.add((argumentation, INF.J3_applied, self.uri_of(statement.logic)))
            if SCI.S6_Data_Evaluation in self.sci_classes(statement) and isinstance(claim, Quantity):
                # A dimension concluded from data by calculation is what O10 is for; the
                # same node is the proposition's range, so nothing is duplicated.
                graph.add((argumentation, SCI.O10_assigned_dimension,
                           node("dimension", statement.source, statement.ident)))
            for premise in statement.premises:
                other = self.statements[resolve(premise, statement.source)]
                if other.holds is None:
                    # A convention is stipulated, not believed, so it cannot be a premise:
                    # J1 wants an I2 Belief and there is none. The inference used the
                    # stipulated value, which is what P16 says.
                    graph.add((argumentation, CRM.P16_used_specific_object,
                               node("proposition", other.source, other.ident)))
                else:
                    graph.add((argumentation, INF.J1_used_as_premise,
                               node("belief", other.source, other.ident)))
        return argumentation

    def _emit_belief(
        self, statement: Statement, argumentation: URIRef, proposition: URIRef, graph: Graph
    ) -> URIRef | None:
        if statement.holds is None:
            return None
        belief = node("belief", statement.source, statement.ident)
        graph.add((belief, RDF.type, BELIEF_CLASS.get(statement.kind, INF.I2_Belief)))
        graph.add((belief, BELIEF_SUBJECT.get(statement.kind, INF.J4_that), proposition))
        graph.add((belief, INF.J5_holds_to_be, Literal(statement.holds.value)))
        graph.add((belief, RDFS.label, _label(f"{statement.holder}: {self.describe(statement)}")))
        graph.add((argumentation, CONCLUDES.get(statement.kind, INF.J2_concluded_that), belief))
        return belief

    def _emit_transmission(
        self, statement: Statement, belief: URIRef, proposition: URIRef,
        passage: URIRef, graph: Graph
    ) -> None:
        """Someone printed what someone else said, and is taken to stand behind it."""
        for actor in statement.transmitted_by:
            adoption = node("transmission", statement.source, f"{statement.ident}.{actor}")
            adopted = node("transmitted-belief", statement.source, f"{statement.ident}.{actor}")
            graph.add((adoption, RDF.type, INF.I7_Belief_Adoption))
            graph.add((adoption, CRM.P14_carried_out_by, self.uri_of(actor)))
            graph.add((adoption, INF.J7_is_based_on_evidence_from, passage))
            graph.add((adoption, INF.J13_adopted_interpretation, adopted))
            graph.add((adoption, CRM.P17_was_motivated_by, belief))
            graph.add((adoption, RDFS.label,
                       _label(f"{actor} transmits: {self.describe(statement)}")))
            graph.add((adopted, RDF.type, INF.I12_Adopted_Belief))
            graph.add((adopted, INF.J4_that, proposition))
            graph.add((adopted, INF.J5_holds_to_be, Literal(statement.holds.value)))
            graph.add((adopted, INF.J14_adopted_interpretation_of, passage))

    def _emit_adoption(
        self, statement: Statement, proposition: URIRef, passage: URIRef, graph: Graph
    ) -> None:
        """What the project takes the source to mean, and what it then holds itself.

        Three nodes rather than one, because they can come apart: a reading of a text
        (I13) is not the same as holding what it says to be true (I12), and both are
        distinct from the author's own belief.
        """
        if not statement.adopt or statement.holder == PROJECT_ACTOR:
            return
        adoption = node("adoption", statement.source, statement.ident)
        meaning = node("meaning", statement.source, statement.ident)
        adopted = node("adopted", statement.source, statement.ident)
        project = self.uri_of(PROJECT_ACTOR)

        graph.add((adoption, RDF.type, INF.I7_Belief_Adoption))
        graph.add((adoption, CRM.P14_carried_out_by, project))
        graph.add((adoption, INF.J7_is_based_on_evidence_from, passage))
        graph.add((adoption, INF.J15_assumed_meaning, meaning))
        graph.add((adoption, INF.J13_adopted_interpretation, adopted))
        graph.add((adoption, RDFS.label, _label(f"adoption of {statement.key}")))

        graph.add((meaning, RDF.type, INF.I13_Intended_Meaning_Belief))
        graph.add((meaning, INF.J17_about, passage))
        graph.add((meaning, INF.J16_assumed_meaning, proposition))
        graph.add((meaning, INF.J5_holds_to_be, Literal(statement.holds.value)))
        graph.add((meaning, RDFS.label, _label(f"read from {statement.key}")))

        graph.add((adopted, RDF.type, INF.I12_Adopted_Belief))
        graph.add((adopted, INF.J4_that, proposition))
        graph.add((adopted, INF.J5_holds_to_be, Literal(statement.holds.value)))
        graph.add((adopted, INF.J14_adopted_interpretation_of, passage))
        graph.add((adopted, RDFS.label, _label(f"held from {statement.key}")))

        if statement.comprehension:
            comprehension = node("comprehension", statement.source, statement.ident)
            graph.add((comprehension, RDF.type, INF.I16_Meaning_Comprehension))
            graph.add((comprehension, CRM.P14_carried_out_by, project))
            graph.add((comprehension, INF.J22_interpreted_meaning_of, passage))
            graph.add((comprehension, INF.J23_interpreted_meaning_as, meaning))
            graph.add((comprehension, CRM.P3_has_note,
                       Literal(statement.comprehension, lang="en")))
            graph.add((comprehension, RDFS.label, _label(f"reading of {statement.key}")))

    def _emit_revision(self, statement: Statement, belief: URIRef, graph: Graph) -> None:
        """A claim withdrawn is an inference about the earlier belief, not a deletion."""
        passage = node("passage", statement.source, statement.ident)
        for superseded in statement.supersedes:
            other = self.statements[resolve(superseded, statement.source)]
            old_belief = node("belief", other.source, other.ident)
            revision = node("revision", statement.source, f"{statement.ident}.{other.ident}")
            withdrawn = node("withdrawal", statement.source, f"{statement.ident}.{other.ident}")
            graph.add((revision, RDF.type, INF.I5_Inference_Making))
            graph.add((revision, CRM.P14_carried_out_by, self.uri_of(statement.holder)))
            graph.add((revision, INF.J1_used_as_premise, belief))
            graph.add((revision, INF.J3_applied, entity("logic", "knowledge-revision")))
            graph.add((revision, INF.J2_concluded_that, withdrawn))
            graph.add((revision, RDFS.label, _label(f"{statement.key} withdraws {other.key}")))
            graph.add((passage, CRM.P70_documents, revision))
            graph.add((withdrawn, RDF.type, INF.I2_Belief))
            graph.add((withdrawn, INF.J4_that, node("proposition", other.source, other.ident)))
            graph.add((withdrawn, INF.J5_holds_to_be, Literal(BeliefValue.FALSE.value)))
            graph.add((withdrawn, RDFS.label, _label(f"withdrawn: {self.describe(other)}")))
            graph.add((old_belief, CRM.P184_ends_before_or_with_the_end_of, belief))

    def _emit_contradictions(self, statement: Statement, belief: URIRef, graph: Graph) -> None:
        for other_ref in statement.contradicts:
            other = self.statements[resolve(other_ref, statement.source)]
            graph.add((belief, names.CONTRADICTS, node("belief", other.source, other.ident)))

    def _emit_adopted_layer(self, statement: Statement, proposition: URIRef) -> None:
        """The plain triple, for queries that do not care who believes it.

        Only what the project itself holds true reaches this graph: its own observations,
        measurements and inferences, and the claims it has explicitly adopted from a source.
        """
        claim = statement.claim
        if isinstance(claim, Prose) or statement.holds is not BeliefValue.TRUE:
            return
        ours = statement.holder == PROJECT_ACTOR or statement.adopt
        if not ours:
            return
        graph = self.dataset.graph(ADOPTED_GRAPH)
        declared = self.entities[claim.property].crm_property
        physical = self.entities[claim.subject].kind in PHYSICAL_KINDS
        if declared:
            # The property type names the CIDOC CRM property it stands for, so the adopted
            # layer is CRM proper rather than a private vocabulary.
            predicate = model_term(declared)
        elif isinstance(claim, Quantity) and physical:
            # A magnitude of a physical thing is CRMsci's `O12 has dimension`; the E54 it
            # points at carries the S9 Property Type, so nothing narrower is lost.
            predicate = SCI.O12_has_dimension
        else:
            predicate = adopted_property(claim.property)
            graph.add((predicate, RDF.type, RDF.Property))
            graph.add((predicate, RDFS.label, _label(self._property_label(claim.property))))
            graph.add((predicate, RDFS.seeAlso, self.uri_of(claim.property)))
        role = "timespan" if isinstance(claim, Temporal) else "dimension"
        target = (
            self.uri_of(claim.object)
            if isinstance(claim, Relation)
            else node(role, statement.source, statement.ident)
        )
        graph.add((self.uri_of(claim.subject), predicate, target))
        graph.add((target, RDFS.seeAlso, proposition))
        if not isinstance(claim, Relation):
            source = self.dataset.graph(source_graph(statement.source))
            for predicate_out, value in source.predicate_objects(target):
                graph.add((target, predicate_out, value))

    # -- wording ---------------------------------------------------------------

    def sci_classes(self, statement: Statement) -> tuple[URIRef, ...]:
        """The CRMsci class an inference also belongs to, by the logic it applied.

        CRMsci 3.2 still declares S6, S7 and S8 under its own S5 rather than under I5, so
        an inference keeps its I5 type and gains the CRMsci one beside it.
        """
        if statement.kind is not StatementKind.INFERENCE or not statement.logic:
            return ()
        declared = self.entities[statement.logic].inference_class
        return (model_term(declared),) if declared else ()

    def _property_label(self, ident: str) -> str:
        labels = self.entities[ident].labels
        return labels[0].text if labels else ident

    def magnitude(self, claim: Quantity) -> str:
        unit = self._property_label(claim.unit) if claim.unit in self.entities else claim.unit
        if claim.value is not None:
            body = f"{claim.value:g}"
        elif claim.lower is not None and claim.upper is not None:
            body = f"{claim.lower:g}–{claim.upper:g}"
        else:
            bound, value = (
                ("at least", claim.lower) if claim.lower is not None else ("at most", claim.upper)
            )
            body = f"{bound} {value:g}"
        return f"{body} {unit}"

    @staticmethod
    def period(claim: Temporal) -> str:
        if claim.label:
            return claim.label
        if claim.begin and claim.end and claim.begin != claim.end:
            return f"{claim.begin} to {claim.end}"
        return claim.begin or claim.end or ""

    def describe(self, statement: Statement) -> str:
        claim = statement.claim
        if isinstance(claim, Prose):
            return claim.gloss
        subject = self._property_label(claim.subject) if claim.subject in self.entities else claim.subject
        prop = self._property_label(claim.property)
        if isinstance(claim, Relation):
            target = self._property_label(claim.object)
        elif isinstance(claim, Temporal):
            target = self.period(claim)
        else:
            target = self.magnitude(claim)
        return f"{subject} — {prop} — {target}"


def build(corpus: Corpus) -> Dataset:
    return Emitter(corpus).build()
