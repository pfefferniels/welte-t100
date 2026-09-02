"""Tests for the compiler, run with `python -m unittest discover kg/tests`.

The point of most of these is that the loader refuses to record a statement that has lost
its provenance. A graph whose invariants are only enforced at validation time is a graph
that will one day be committed broken.
"""

from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import yaml
from rdflib import RDF, Graph, Literal

from kg.build.cli import union_of
from kg.build.emit import build
from kg.build.load import CorpusError, load_corpus
from kg.build.names import CRM, INF, SCI, WT, BadIdentifier, check_slug
from kg.build.report import Reporter, _read_constant
from kg.build.schema import Prose, Quantity, Relation, Statement, StatementKind

ROOT = Path(__file__).resolve().parent.parent

ACTORS = {
    "entities": [
        {"id": "someone", "kind": "person", "label": {"en": "Someone"}},
        {"id": "pfeffer-niels", "kind": "person", "label": {"en": "The project"}},
        {"id": "a-thing", "kind": "object", "label": {"en": "A thing"}},
        {"id": "a-mark", "kind": "feature", "part_of": "a-thing", "label": {"en": "A mark"}},
        {"id": "a-booklet", "kind": "document", "created_by": ["someone"],
         "label": {"en": "A booklet"}},
        {"id": "a-step", "kind": "procedure", "part_of": "a-booklet",
         "label": {"en": "A step"}},
        {"id": "a-property", "kind": "property-type", "label": {"en": "A property"}},
        {"id": "a-crm-property", "kind": "property-type", "crm_property": "P2_has_type",
         "label": {"en": "is of type"}},
        {"id": "an-order", "kind": "property-type",
         "crm_property": "O28_is_conceptually_greater_than", "label": {"en": "is above"}},
        {"id": "a-unit", "kind": "unit", "label": {"en": "A unit"}},
        {"id": "an-object", "kind": "concept", "label": {"en": "An object"}},
        {"id": "another-object", "kind": "concept", "label": {"en": "Another object"}},
        {"id": "a-logic", "kind": "logic", "label": {"en": "A logic"}},
        {"id": "a-fit", "kind": "logic", "inference_class": "S6_Data_Evaluation",
         "label": {"en": "A fit"}},
    ]
}


def _statement(**overrides: object) -> dict[str, object]:
    base = {
        "id": "a-statement",
        "kind": "report",
        "locator": "p. 1",
        "subject": "a-thing",
        "property": "a-property",
        "object": "an-object",
        "holds": "TRUE",
    }
    base.update(overrides)
    return base


class Sandbox:
    """A throwaway kg/ tree holding one source, so a rule can be tested in isolation."""

    def __init__(self, statements: list[dict[str, object]]) -> None:
        self.directory = TemporaryDirectory()
        root = Path(self.directory.name)
        (root / "entities").mkdir()
        (root / "sources").mkdir()
        (root / "entities" / "actors.yaml").write_text(yaml.safe_dump(ACTORS))
        (root / "sources" / "s.yaml").write_text(
            yaml.safe_dump(
                {
                    "source": {
                        "id": "s",
                        "kind": "article",
                        "title": "A source",
                        "authors": ["someone"],
                    },
                    "statements": statements,
                },
                allow_unicode=True,
            )
        )
        self.root = root

    def __enter__(self) -> Path:
        return self.root

    def __exit__(self, *_: object) -> None:
        self.directory.cleanup()


class IdentifierTests(unittest.TestCase):
    def test_slash_is_refused(self) -> None:
        with self.assertRaises(BadIdentifier):
            check_slug("state/piano", "test")

    def test_capital_is_refused(self) -> None:
        with self.assertRaises(BadIdentifier):
            check_slug("Piano", "test")

    def test_plain_slug_is_accepted(self) -> None:
        self.assertEqual(check_slug("state-piano", "test"), "state-piano")


class LoaderRefusalTests(unittest.TestCase):
    def _problems(self, statements: list[dict[str, object]]) -> tuple[str, ...]:
        with Sandbox(statements) as root:
            with self.assertRaises(CorpusError) as caught:
                load_corpus(root)
            return caught.exception.problems

    def test_a_statement_without_a_locator_is_refused(self) -> None:
        problems = self._problems([_statement(locator="")])
        self.assertTrue(any("locator" in p for p in problems), problems)

    def test_a_statement_without_a_belief_value_is_refused(self) -> None:
        statement = _statement()
        del statement["holds"]
        problems = self._problems([statement])
        self.assertTrue(any("holds" in p for p in problems), problems)

    def test_a_magnitude_without_a_unit_is_refused(self) -> None:
        statement = _statement(value=1.0)
        del statement["object"]
        problems = self._problems([statement])
        self.assertTrue(any("unit" in p for p in problems), problems)

    def test_an_inference_without_a_premise_is_refused(self) -> None:
        problems = self._problems([_statement(kind="inference", logic="a-logic")])
        self.assertTrue(any("premise" in p for p in problems), problems)

    def test_an_inference_without_a_logic_is_refused(self) -> None:
        problems = self._problems(
            [_statement(), _statement(id="b", kind="inference", premises=["a-statement"])]
        )
        self.assertTrue(any("logic" in p for p in problems), problems)

    def test_a_convention_may_not_be_believed(self) -> None:
        statement = _statement(kind="convention", value=1.0, unit="a-unit")
        del statement["object"]
        problems = self._problems([statement])
        self.assertTrue(any("stipulated" in p for p in problems), problems)

    def test_an_unknown_property_is_refused(self) -> None:
        problems = self._problems([_statement(property="not-declared")])
        self.assertTrue(any("not-declared" in p for p in problems), problems)

    def test_a_property_of_the_wrong_kind_is_refused(self) -> None:
        problems = self._problems([_statement(property="an-object")])
        self.assertTrue(any("property-type" in p for p in problems), problems)

    def test_a_gloss_cannot_carry_an_object_as_well(self) -> None:
        problems = self._problems([_statement(gloss="in words")])
        self.assertTrue(any("gloss" in p for p in problems), problems)

    def test_a_premise_outside_the_graph_is_refused(self) -> None:
        problems = self._problems(
            [_statement(kind="inference", logic="a-logic", premises=["nowhere/at-all"])]
        )
        self.assertTrue(any("nowhere/at-all" in p for p in problems), problems)


class EmissionTests(unittest.TestCase):
    def test_a_report_compiles_to_a_belief_with_a_holder_and_a_locator(self) -> None:
        with Sandbox([_statement()]) as root:
            graph = union_of(build(load_corpus(root)))
        belief = WT["belief/s/a-statement"]
        self.assertIn((belief, RDF.type, INF.I2_Belief), graph)
        self.assertIn((belief, INF.J5_holds_to_be, Literal("TRUE")), graph)
        self.assertEqual(
            graph.value(WT["passage/s/a-statement"], WT["locator"]), Literal("p. 1")
        )

    def test_a_measurement_carries_its_dimension_and_unit(self) -> None:
        statement = _statement(kind="measurement", value=-101.6, unit="a-unit")
        del statement["object"]
        with Sandbox([statement]) as root:
            graph = union_of(build(load_corpus(root)))
        argument = WT["statement/s/a-statement"]
        dimension = WT["dimension/s/a-statement"]
        self.assertIn((argument, RDF.type, SCI.S21_Measurement), graph)
        self.assertIn((argument, SCI.O39_observed_dimension, dimension), graph)
        self.assertEqual(graph.value(dimension, CRM.P90_has_value), Literal(-101.6))
        self.assertEqual(graph.value(dimension, CRM.P91_has_unit), WT["unit/a-unit"])

    def test_a_convention_produces_no_belief(self) -> None:
        statement = _statement(kind="convention", value=0.06, unit="a-unit")
        del statement["object"], statement["holds"]
        with Sandbox([statement]) as root:
            graph = union_of(build(load_corpus(root)))
        self.assertNotIn((WT["belief/s/a-statement"], None, None), graph)
        self.assertIn(
            (WT["statement/s/a-statement"], INF.J33_assigned_propositions,
             WT["proposition/s/a-statement"]),
            graph,
        )

    def test_withdrawing_a_claim_keeps_it_and_concludes_it_false(self) -> None:
        with Sandbox(
            [
                _statement(id="old"),
                _statement(id="new", supersedes=["old"]),
            ]
        ) as root:
            graph = union_of(build(load_corpus(root)))
        withdrawal = WT["withdrawal/s/new.old"]
        self.assertIn((withdrawal, INF.J5_holds_to_be, Literal("FALSE")), graph)
        self.assertIn((WT["belief/s/old"], None, None), graph)

    def test_entity_kinds_nest_by_the_property_their_class_allows(self) -> None:
        with Sandbox([_statement()]) as root:
            graph = union_of(build(load_corpus(root)))
        self.assertIn((WT["thing/a-mark"], RDF.type, CRM["E25_Human-Made_Feature"]), graph)
        self.assertIn((WT["thing/a-mark"], CRM.P56i_is_found_on, WT["thing/a-thing"]), graph)
        self.assertIn((WT["text/a-step"], RDF.type, CRM.E29_Design_or_Procedure), graph)
        self.assertIn((WT["text/a-step"], CRM.P148i_is_component_of, WT["text/a-booklet"]), graph)

    def test_a_created_text_gets_a_creation_with_its_author(self) -> None:
        with Sandbox([_statement()]) as root:
            graph = union_of(build(load_corpus(root)))
        creation = WT["creation/entity/a-booklet"]
        self.assertIn((creation, RDF.type, CRM.E65_Creation), graph)
        self.assertIn((creation, CRM.P94_has_created, WT["text/a-booklet"]), graph)
        self.assertIn((creation, CRM.P14_carried_out_by, WT["actor/someone"]), graph)

    def test_a_fitting_logic_types_its_inference_in_crmsci_as_well(self) -> None:
        statement = _statement(kind="inference", logic="a-fit", premises=["ground"],
                               value=1.5, unit="a-unit")
        del statement["object"]
        with Sandbox([_statement(id="ground"), statement]) as root:
            graph = union_of(build(load_corpus(root)))
        inference = WT["statement/s/a-statement"]
        self.assertIn((inference, RDF.type, INF.I5_Inference_Making), graph)
        self.assertIn((inference, RDF.type, SCI.S6_Data_Evaluation), graph)
        self.assertIn((inference, SCI.O10_assigned_dimension, WT["dimension/s/a-statement"]), graph)

    def test_the_adopted_layer_speaks_crm_and_crmsci(self) -> None:
        typed = _statement(id="typed", property="a-crm-property", object="an-object",
                           holder="someone", adopt=True)
        ordered = _statement(id="ordered", subject="an-object", property="an-order",
                             object="another-object", adopt=True)
        measured = _statement(id="measured", kind="measurement", value=2.0, unit="a-unit",
                              adopt=True)
        del measured["object"]
        with Sandbox([typed, ordered, measured]) as root:
            graph = union_of(build(load_corpus(root)))
        self.assertIn((WT["thing/a-thing"], CRM.P2_has_type, WT["concept/an-object"]), graph)
        self.assertIn((WT["concept/an-object"], SCI.O28_is_conceptually_greater_than,
                       WT["concept/another-object"]), graph)
        self.assertIn((WT["thing/a-thing"], SCI.O12_has_dimension,
                       WT["dimension/s/measured"]), graph)


class CorpusTests(unittest.TestCase):
    """The authored graph itself, not a sandbox."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.corpus = load_corpus(ROOT)
        cls.graph = union_of(build(cls.corpus))

    def test_the_two_hagmanns_are_distinct_people(self) -> None:
        identifiers = {actor.ident for actor in self.corpus.entities}
        self.assertIn("hagmann-peter", identifiers)
        self.assertIn("hagemann-reinhard", identifiers)

    def test_every_measured_vacuum_figure_is_scoped_to_one_instrument(self) -> None:
        """A reading off a manometer belongs to the machine it was read on.

        Hagemann is the only witness here who measured one, and he says himself that he
        does not know whether his values transfer. Brougher's figures are regulating
        targets rather than readings, so they are not covered by this rule but by the one
        below: they name the part they are a property of and carry their scope on the
        proposition, and so are never a bare fact about a type either.
        """
        measured = {
            statement.claim.subject
            for statement in self._vacuum_figures()
            if statement.kind is StatementKind.MEASUREMENT
        }
        self.assertEqual(measured, {"ibach-8171-21310"})

    def test_every_unmeasured_vacuum_figure_carries_its_scope(self) -> None:
        loose = [
            statement.key
            for statement in self._vacuum_figures()
            if statement.kind is not StatementKind.MEASUREMENT and not statement.scope
        ]
        self.assertEqual(loose, [])

    def _vacuum_figures(self) -> list[Statement]:
        """Levels only. A tolerance and a difference share the unit but not the quantity."""
        vacuum = {"vacuum-in-piano", "vacuum-in-crescendo", "vacuum-in-forte",
                  "vacuum-in-fortissimo", "supply-vacuum", "vacuum-at-full-closure"}
        return [
            statement
            for statement in self.corpus.statements()
            if isinstance(statement.claim, Quantity) and statement.claim.property in vacuum
        ]

    def test_the_mezzoforte_question_has_more_than_one_answer(self) -> None:
        reporter = Reporter(self.corpus)
        answers = {
            reporter.answer_of(statement)
            for statement in self.corpus.statements()
            if statement.claim.property
            in {"mf-position-on-scale", "mf-position-on-velocity-span", "hook-arrest-level"}
        }
        self.assertGreater(len(answers), 3, answers)

    def test_the_sforzando_latch_carries_beliefs_from_several_holders(self) -> None:
        holders = {
            statement.holder
            for statement in self.corpus.statements()
            if isinstance(statement.claim, Relation)
            and statement.claim.property == "latching-behaviour"
            and statement.claim.subject == "function-sforzando-on"
        }
        self.assertGreaterEqual(len(holders), 4, holders)

    def test_every_prose_claim_says_something(self) -> None:
        for statement in self.corpus.statements():
            if isinstance(statement.claim, Prose):
                self.assertTrue(statement.claim.gloss.strip(), statement.key)

    def test_only_provenance_assessments_are_kept_in_prose(self) -> None:
        """Everything a source says is a proposition; only an I15 needs a gloss."""
        prose = [
            statement.key
            for statement in self.corpus.statements()
            if isinstance(statement.claim, Prose)
            and statement.kind is not StatementKind.ASSESSMENT
        ]
        self.assertEqual(prose, [])

    def test_the_track_map_has_two_independent_witnesses(self) -> None:
        """Hagmann's Anhang 10 and Gottschewski's p. 138 answer the same twelve questions."""
        answers: dict[tuple[str, str], set[str]] = {}
        for statement in self.corpus.statements():
            claim = statement.claim
            if isinstance(claim, Quantity) and claim.property in {"roll-line-bass", "roll-line-treble"}:
                answers.setdefault((claim.subject, claim.property), set()).add(statement.holder)
        two_witnesses = [q for q, holders in answers.items() if len(holders) >= 2]
        self.assertGreaterEqual(len(two_witnesses), 12, answers)

    def test_an_enumeration_by_one_witness_is_not_a_dispute(self) -> None:
        reporter = Reporter(self.corpus)
        by_question: dict[tuple[str, str], list[Statement]] = {}
        for statement in self.corpus.statements():
            question = reporter.question_of(statement)
            if question:
                by_question.setdefault(question, []).append(statement)
        self.assertFalse(reporter.is_contested(by_question[("windkammer-15", "evacuates")]))
        self.assertFalse(reporter.is_contested(by_question[("kettenband", "mechanically-couples")]))
        self.assertTrue(reporter.is_contested(by_question[("function-sforzando-on", "latching-behaviour")]))
        self.assertTrue(reporter.is_contested(by_question[("model-pneumatic", "flow-exponent")]))
        self.assertTrue(reporter.is_contested(by_question[("mezzofortebalg-93", "blocks-in-directions")]))

    def test_every_crm_property_named_resolves(self) -> None:
        from kg.build.names import model_term

        for entity in self.corpus.entities:
            if entity.crm_property:
                model_term(entity.crm_property)
            if entity.inference_class:
                model_term(entity.inference_class)


class CodeCrossCheckTests(unittest.TestCase):
    def test_a_sum_in_the_source_is_read(self) -> None:
        self.assertAlmostEqual(
            _read_constant("emulator/src/cli/settings.ts:bass.mezzoforte"), 0.6052
        )

    def test_a_missing_symbol_reads_as_none(self) -> None:
        self.assertIsNone(_read_constant("emulator/src/cli/settings.ts:notAThing"))

    def test_a_missing_file_reads_as_none(self) -> None:
        self.assertIsNone(_read_constant("nowhere/at/all.ts:x"))


if __name__ == "__main__":
    unittest.main()
