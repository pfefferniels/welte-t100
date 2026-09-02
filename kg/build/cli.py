"""`python -m kg.build <command>` — compile, check, report."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rdflib import Dataset, Graph

from .emit import build
from .load import CorpusError, load_corpus
from .names import BINDINGS

ROOT = Path(__file__).resolve().parent.parent


def union_of(dataset: Dataset) -> Graph:
    """Every quad flattened to a triple, for queries that do not care which source said it."""
    union = Graph()
    for prefix, namespace in BINDINGS.items():
        union.bind(prefix, namespace)
    for graph in dataset.graphs():
        union += graph
    return union


def compile_graph(root: Path, out: Path) -> int:
    corpus = load_corpus(root)
    dataset = build(corpus)
    out.mkdir(parents=True, exist_ok=True)
    (out / "graph.trig").write_bytes(dataset.serialize(format="trig", encoding="utf-8"))
    union = union_of(dataset)
    (out / "graph.ttl").write_bytes(union.serialize(format="turtle", encoding="utf-8"))
    graphs = [g for g in dataset.graphs() if len(g)]
    print(
        f"{len(corpus.entities)} entities, "
        f"{len(corpus.sources)} sources, "
        f"{len(corpus.statements())} statements "
        f"-> {len(union)} triples in {len(graphs)} named graphs"
    )
    print(f"wrote {out / 'graph.trig'} and {out / 'graph.ttl'}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m kg.build")
    parser.add_argument(
        "command", choices=("compile", "check", "report", "view"), help="what to do"
    )
    parser.add_argument("--root", type=Path, default=ROOT, help="the kg/ directory")
    parser.add_argument("--out", type=Path, default=None, help="where generated files go")
    args = parser.parse_args(argv)
    out = args.out or args.root / "out"

    try:
        if args.command == "compile":
            return compile_graph(args.root, out)
        if args.command == "check":
            from .check import run_checks

            return run_checks(args.root, out)
        if args.command == "report":
            from .report import write_reports

            return write_reports(args.root, out)
        from .view import write_view

        return write_view(args.root, out)
    except CorpusError as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
