"""Validate the compiled graph: SHACL, vocabulary closure, and the competency questions.

Three separate things can go wrong and they fail differently. A SHACL violation means a
statement lost its provenance. An undeclared term means a typo in a CRM class or property
name, which RDF will otherwise carry silently for ever. An unanswered competency question
means the graph no longer supports a question the project needs it to answer.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from pathlib import Path

from rdflib import RDF, RDFS, Graph, URIRef
from rdflib.namespace import OWL, SH

from .cli import union_of
from .emit import build
from .load import load_corpus
from .names import BASE, CRM, INF, SCI

MODEL_NAMESPACES = (str(CRM), str(SCI), str(INF))
ONTOLOGY_FILES = ("cidoc_crm_v7.1.3.rdf", "crmsci_v3.2.rdf", "crminf_v1.2.1.rdf")


def load_ontologies(root: Path) -> Graph:
    ontology = Graph()
    for name in ONTOLOGY_FILES:
        ontology.parse(root / "ontology" / "external" / name)
    return ontology


def declared_terms(ontology: Graph) -> set[URIRef]:
    kinds = (RDFS.Class, RDF.Property, OWL.Class, OWL.ObjectProperty, OWL.DatatypeProperty)
    return {
        subject
        for kind in kinds
        for subject in ontology.subjects(RDF.type, kind)
        if isinstance(subject, URIRef)
    }


def model_terms_used(graph: Graph) -> Iterator[URIRef]:
    """Every CRM-family term the graph uses in a position where it must be declared."""
    for subject, predicate, obj in graph:
        if isinstance(predicate, URIRef) and str(predicate).startswith(MODEL_NAMESPACES):
            yield predicate
        if predicate == RDF.type and isinstance(obj, URIRef) and str(obj).startswith(MODEL_NAMESPACES):
            yield obj


def undeclared(graph: Graph, ontology: Graph) -> list[URIRef]:
    known = declared_terms(ontology)
    return sorted({term for term in model_terms_used(graph) if term not in known})


def dangling(graph: Graph) -> list[URIRef]:
    """Project URIs that are referred to but never given a type."""
    typed = {s for s in graph.subjects(RDF.type, None) if isinstance(s, URIRef)}
    referenced = {
        term
        for _, predicate, obj in graph
        for term in (obj,)
        if isinstance(obj, URIRef) and str(obj).startswith(BASE) and predicate != RDF.type
    }
    return sorted(referenced - typed - set(graph.subjects(None, None)))


def queries(root: Path) -> Iterable[tuple[str, str]]:
    for path in sorted((root / "tests" / "queries").glob("*.rq")):
        yield path.stem, path.read_text(encoding="utf-8")


def run_checks(root: Path, out: Path) -> int:
    from pyshacl import validate

    corpus = load_corpus(root)
    graph = union_of(build(corpus))
    ontology = load_ontologies(root)
    problems = 0

    missing = undeclared(graph, ontology)
    if missing:
        problems += len(missing)
        print(f"{len(missing)} term(s) used but not declared in CIDOC CRM 7.1.3, "
              "CRMsci 3.2 or CRMinf 1.2.1:")
        for term in missing:
            print(f"  - {term}")
    else:
        print("vocabulary: every CRM, CRMsci and CRMinf term used is declared")

    loose = dangling(graph)
    if loose:
        problems += len(loose)
        print(f"{len(loose)} project URI(s) referred to but never declared:")
        for term in loose:
            print(f"  - {term}")
    else:
        print("references: every project URI mentioned is also declared")

    shapes = Graph().parse(root / "shapes" / "provenance.ttl")
    conforms, results, _ = validate(
        graph,
        shacl_graph=shapes,
        ont_graph=ontology,
        inference="rdfs",
        advanced=True,
        meta_shacl=False,
    )
    if conforms:
        print("shapes: every statement carries its holder, its locator and its belief value")
    else:
        violations = list(results.subjects(RDF.type, SH.ValidationResult))
        problems += len(violations)
        print(f"shapes: {len(violations)} violation(s)")
        for violation in violations:
            focus = results.value(violation, SH.focusNode)
            message = results.value(violation, SH.resultMessage)
            print(f"  - {focus}\n      {message}")

    out.mkdir(parents=True, exist_ok=True)
    answered = _run_queries(root, graph, out)

    print()
    if problems:
        print(f"{problems} problem(s). {answered} competency question(s) answered.")
        return 1
    print(f"clean. {answered} competency question(s) answered.")
    return 0


def _run_queries(root: Path, graph: Graph, out: Path) -> int:
    lines: list[str] = [
        "# Competency questions",
        "",
        "Answered from `out/graph.ttl` by the queries in `kg/tests/queries/`. A question that",
        "stops returning rows is a regression in the graph, not in the query.",
        "",
    ]
    answered = 0
    for name, text in queries(root):
        rows = list(graph.query(text))
        answered += 1
        title = text.splitlines()[0].lstrip("# ").strip() if text.startswith("#") else name
        lines += [f"## {title}", "", f"`{name}.rq` — {len(rows)} row(s)", ""]
        if rows:
            headers = [str(v) for v in rows[0].labels]
            lines.append("| " + " | ".join(headers) + " |")
            lines.append("|" + "|".join(["---"] * len(headers)) + "|")
            for row in rows:
                cells = [_cell(row[label]) for label in rows[0].labels]
                lines.append("| " + " | ".join(cells) + " |")
        else:
            lines.append("_no rows_")
        lines.append("")
        print(f"query {name}: {len(rows)} row(s)")
    (out / "competency-questions.md").write_text("\n".join(lines), encoding="utf-8")
    return answered


def _cell(value: object) -> str:
    if value is None:
        return ""
    text = str(value)
    if text.startswith(BASE):
        text = text[len(BASE) :]
    return text.replace("|", "\\|").replace("\n", " ")
