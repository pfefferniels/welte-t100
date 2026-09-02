"""Assemble the browsable payload, and inline it into a single self-contained page.

The page reads this rather than the RDF, for the same reason the reports do: everything on
it is a view of the authored records, and a browser should not have to parse Turtle to show
a quotation. The RDF remains the thing to query; this is the thing to read.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from . import mechanism
from .emit import ARGUMENTATION_CLASS, Emitter
from .load import load_corpus, resolve
from .report import Reporter
from .schema import Corpus, Prose, Quantity, Relation, Statement

MARKER = '<script id="graph-data" type="application/json">{}</script>'


class Payload:
    def __init__(self, corpus: Corpus) -> None:
        self.corpus = corpus
        self.reporter = Reporter(corpus)
        self.entities = corpus.by_id()
        self.statements = corpus.statements_by_key()
        self.emitter = Emitter(corpus)
        self.backward = self._backward_references()

    def _backward_references(self) -> dict[str, dict[str, list[str]]]:
        """Who names whom, so a statement can show what was built on top of it."""
        links: dict[str, dict[str, list[str]]] = defaultdict(
            lambda: {"usedBy": [], "supersededBy": [], "contradictedBy": []}
        )
        for statement in self.corpus.statements():
            for field, inverse in (
                ("premises", "usedBy"),
                ("supersedes", "supersededBy"),
                ("contradicts", "contradictedBy"),
            ):
                for reference in getattr(statement, field):
                    key = resolve(reference, statement.source)
                    links[key][inverse].append(statement.key)
        return links

    def label(self, ident: str | None) -> str:
        return self.reporter.label(ident) if ident else ""

    def statement(self, statement: Statement) -> dict[str, object]:
        claim = statement.claim
        links = self.backward.get(statement.key, {})
        record: dict[str, object] = {
            "id": statement.key,
            "ident": statement.ident,
            "source": statement.source,
            "kind": statement.kind.value,
            "crmClass": " · ".join(
                str(c).rsplit("/", 1)[-1].replace("_", " ")
                for c in (ARGUMENTATION_CLASS[statement.kind], *self.emitter.sci_classes(statement))
            ),
            "locator": statement.locator,
            "holder": statement.holder,
            "holderLabel": self.label(statement.holder),
            "holds": statement.holds.value if statement.holds else "",
            "answer": self.reporter.answer_of(statement),
            "adopt": statement.adopt,
            "premises": [resolve(p, statement.source) for p in statement.premises],
            "supersedes": [resolve(p, statement.source) for p in statement.supersedes],
            "mentions": list(statement.mentions),
            "contradicts": [resolve(p, statement.source) for p in statement.contradicts],
            "usedBy": links.get("usedBy", []),
            "supersededBy": links.get("supersededBy", []),
            "contradictedBy": links.get("contradictedBy", []),
        }
        if claim.subject:
            record["subject"] = claim.subject
            record["subjectLabel"] = self.label(claim.subject)
        if claim.property:
            record["property"] = claim.property
            record["propertyLabel"] = self.label(claim.property)
        if isinstance(claim, Relation):
            record["object"] = claim.object
        if isinstance(claim, Quantity):
            record["magnitude"] = True
        if isinstance(claim, Prose):
            record["gloss"] = " ".join(claim.gloss.split())
        for field in ("translation", "comprehension", "note", "logic", "scope", "when"):
            value = getattr(statement, field)
            if value:
                record[field] = " ".join(str(value).split())
        if statement.logic:
            record["logicLabel"] = self.label(statement.logic)
        if statement.scope:
            record["scopeLabel"] = self.label(statement.scope)
        if statement.quotes:
            record["quotes"] = [[lang, text] for lang, text in statement.quotes]
        if statement.transmitted_by:
            record["transmittedBy"] = [
                {"id": a, "label": self.label(a)} for a in statement.transmitted_by
            ]
        return record

    def question_key(self, statement: Statement) -> str | None:
        claim = statement.claim
        if not claim.subject or not claim.property:
            return None
        return f"{claim.subject}~{claim.property}"

    def questions(self) -> list[dict[str, object]]:
        grouped: dict[str, list[Statement]] = defaultdict(list)
        for statement in self.corpus.statements():
            key = self.question_key(statement)
            if key:
                grouped[key].append(statement)
        questions = []
        for key, group in grouped.items():
            subject, prop = key.split("~", 1)
            questions.append(
                {
                    "id": key,
                    "subject": subject,
                    "subjectLabel": self.label(subject),
                    "property": prop,
                    "propertyLabel": self.label(prop),
                    "statements": [s.key for s in group],
                    "holders": sorted({self.label(s.holder) for s in group}),
                    "contested": self.reporter.is_contested(group),
                }
            )
        return sorted(
            questions,
            key=lambda q: (not q["contested"], str(q["subjectLabel"]), str(q["propertyLabel"])),
        )

    def entities_payload(self) -> list[dict[str, object]]:
        mentions: dict[str, set[str]] = defaultdict(set)
        for statement in self.corpus.statements():
            claim = statement.claim
            named = (claim.subject, claim.property, statement.holder, statement.logic,
                     statement.scope, statement.about,
                     getattr(claim, "object", None), getattr(claim, "unit", None),
                     *statement.mentions, *statement.transmitted_by)
            for ident in named:
                if ident:
                    mentions[ident].add(statement.key)
        return [
            {
                "id": item.ident,
                "kind": item.kind.value,
                "label": item.labels[0].text if item.labels else item.ident,
                "labels": [[lang, text] for lang, text in item.labels],
                "note": " ".join(item.note.split()) if item.note else "",
                "partOf": item.part_of or "",
                "code": item.code or "",
                "statements": sorted(mentions.get(item.ident, ())),
            }
            for item in sorted(self.corpus.entities, key=lambda e: e.ident)
            if mentions.get(item.ident)
        ]

    def build(self) -> dict[str, object]:
        return {
            "sources": [
                {
                    "id": source.ident,
                    "title": source.title,
                    "kind": source.kind,
                    "imprint": source.citation().removeprefix(source.title).lstrip(", "),
                    "authors": [self.label(a) for a in source.authors],
                    "note": " ".join(source.note.split()) if source.note else "",
                    "copy": source.copy or "",
                    "url": source.url or "",
                    "statements": [s.key for s in source.statements],
                }
                for source in self.corpus.sources
            ],
            "statements": {
                s.key: self.statement(s) for s in self.corpus.statements()
            },
            "questions": self.questions(),
            "entities": self.entities_payload(),
            "mechanism": mechanism.payload(self.corpus),
        }


def _between(text: str, opening: str, closing: str) -> str:
    start = text.index(opening) + len(opening)
    return text[start : text.index(closing, start)]


def as_artifact(page: str) -> str:
    """The same page without its document skeleton, which the artifact host supplies."""
    head = _between(page, "<head>", "</head>")
    return "\n".join(
        [
            _between(head, "<title>", "</title>").join(("<title>", "</title>")),
            "<style>" + _between(head, "<style>", "</style>") + "</style>",
            _between(page, "<body>", "</body>").strip(),
        ]
    )


def write_view(root: Path, out: Path) -> int:
    corpus = load_corpus(root)
    payload = Payload(corpus).build()
    template = (root / "view" / "app.html").read_text(encoding="utf-8")
    if MARKER not in template:
        raise ValueError(f"{root / 'view' / 'app.html'} has no data marker to fill")
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    page = template.replace(
        MARKER, f'<script id="graph-data" type="application/json">{data}</script>'
    )
    out.mkdir(parents=True, exist_ok=True)
    written = []
    for name, text in (("graph.html", page), ("graph.artifact.html", as_artifact(page))):
        target = out / name
        target.write_text(text, encoding="utf-8")
        written.append(f"{target.name} ({target.stat().st_size // 1024} KB)")
    schematic = payload["mechanism"]
    missing = sorted(mechanism.unplaced(corpus))
    print(
        f"schematic: {len(schematic['nodes'])} parts, {len(schematic['edges'])} links drawn, "
        f"{schematic['linksDrawnOtherwise']} shown as conduits or markers instead, "
        f"{schematic['linksNotDrawn']} not drawn, "
        f"{len(schematic['constants'])} constants"
    )
    if missing:
        print("  components the graph has and the drawing leaves out: " + ", ".join(missing))
    print(
        f"{len(payload['statements'])} statements, "
        f"{len(payload['questions'])} questions, "
        f"{len(payload['entities'])} entities -> {out}/ "
        f"{' and '.join(written)}, both self-contained"
    )
    return 0
