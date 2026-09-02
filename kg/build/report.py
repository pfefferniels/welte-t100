"""The reports that make the graph worth having.

`by-source` is a dossier a reader can check against the book. `contested` is the reason
the graph exists: propositions several people have answered differently, laid side by side
with what each answer rests on. `single-instrument` keeps the scope discipline visible.
`unsupported` should always be empty. `code-constants` catches the emulator drifting away
from what the graph says it believes.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from .emit import PROJECT_ACTOR
from .load import load_corpus, resolve
from .schema import Corpus, Prose, Quantity, Relation, Statement, Temporal

REPO = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Position:
    """One answer to a question, with who gave it and what it rests on."""

    holder: str
    answer: str
    holds: str
    source: str
    locator: str
    statement: str


class Reporter:
    def __init__(self, corpus: Corpus) -> None:
        self.corpus = corpus
        self.entities = corpus.by_id()

    # -- helpers ---------------------------------------------------------------

    def label(self, ident: str) -> str:
        item = self.entities.get(ident)
        return item.labels[0].text if item and item.labels else ident

    def answer_of(self, statement: Statement) -> str:
        claim = statement.claim
        if isinstance(claim, Prose):
            return " ".join(claim.gloss.split())
        if isinstance(claim, Relation):
            return self.label(claim.object)
        if isinstance(claim, Temporal):
            if claim.label:
                return claim.label
            if claim.begin and claim.end and claim.begin != claim.end:
                return f"{claim.begin} to {claim.end}"
            return claim.begin or claim.end or ""
        unit = self.label(claim.unit)
        if claim.value is not None:
            body = f"{claim.value:g}"
        elif claim.lower is not None and claim.upper is not None:
            body = f"{claim.lower:g} to {claim.upper:g}"
        else:
            bound = claim.lower if claim.lower is not None else claim.upper
            word = "at least" if claim.lower is not None else "at most"
            body = f"{word} {bound:g}"
        detail = []
        if claim.sd is not None:
            detail.append(f"sd {claim.sd:g}")
        if claim.n is not None:
            detail.append(f"n = {claim.n}")
        suffix = f" ({', '.join(detail)})" if detail else ""
        return f"{body} {unit}{suffix}"

    def question_of(self, statement: Statement) -> tuple[str, str] | None:
        claim = statement.claim
        subject = claim.subject
        prop = claim.property
        if not subject or not prop:
            return None
        return subject, prop

    def position(self, statement: Statement) -> Position:
        return Position(
            holder=self.label(statement.holder),
            answer=self.answer_of(statement),
            holds=statement.holds.value if statement.holds else "stipulated",
            source=statement.source,
            locator=statement.locator,
            statement=statement.key,
        )

    def is_contested(self, group: list[Statement]) -> bool:
        """Whether the answers to one question amount to a disagreement.

        Naming several objects for one property — the parts a wind chamber evacuates, the
        states a state is louder than — is an enumeration, not a dispute, and a property
        type declared `enumerable` is never contested by its objects alone. A question is
        contested when two holders answer it differently, when the same object is held
        with different confidence, or when a holder has marked two of their own answers
        as unable to both hold.
        """
        keys = {s.key for s in group}
        if any(resolve(other, s.source) in keys for s in group for other in s.contradicts):
            return True
        prop = self.entities.get(group[0].claim.property or "")
        if prop is not None and prop.enumerable:
            by_answer: dict[str, set[object]] = defaultdict(set)
            for statement in group:
                by_answer[self.answer_of(statement)].add(statement.holds)
            return any(len(holds) > 1 for holds in by_answer.values())
        by_holder: dict[str, set[tuple[str, object]]] = defaultdict(set)
        for statement in group:
            by_holder[statement.holder].add((self.answer_of(statement), statement.holds))
        return len({frozenset(answers) for answers in by_holder.values()}) > 1

    # -- reports ---------------------------------------------------------------

    def by_source(self) -> str:
        lines = [
            "# What each source says",
            "",
            "Every statement in the graph, under the source it was read out of, with the",
            "locator and the quotation as authored. Checking a row against the book needs",
            "nothing but this page and the book.",
            "",
        ]
        for source in self.corpus.sources:
            imprint = source.citation().removeprefix(source.title).lstrip(", ")
            lines += [f"## {source.title}", ""]
            lines += [f"*{', '.join(filter(None, [', '.join(a for a in (self.label(x) for x in source.authors)), imprint]))}*", ""]
            if source.copy:
                lines += [f"Local copy: `{source.copy}`", ""]
            if source.note:
                lines += [" ".join(source.note.split()), ""]
            for statement in source.statements:
                lines += self._statement_block(statement)
            lines.append("")
        return "\n".join(lines)

    def _statement_block(self, statement: Statement) -> list[str]:
        claim = statement.claim
        subject = self.label(claim.subject) if claim.subject else "—"
        prop = self.label(claim.property) if claim.property else "—"
        block = [
            f"### `{statement.ident}` — {statement.kind.value}",
            "",
            f"**{statement.locator}** · held by {self.label(statement.holder)} "
            f"· {statement.holds.value if statement.holds else 'stipulated, not believed'}",
            "",
        ]
        if not isinstance(claim, Prose):
            block += [f"> {subject} — *{prop}* — **{self.answer_of(statement)}**", ""]
        else:
            block += [f"> {' '.join(claim.gloss.split())}", ""]
        for lang, text in statement.quotes:
            block += [f"*{lang}:* “{text}”", ""]
        if statement.translation:
            block += [f"*Translation:* {' '.join(statement.translation.split())}", ""]
        if statement.comprehension:
            block += [f"*Reading:* {' '.join(statement.comprehension.split())}", ""]
        if statement.premises:
            block += ["*Premises:* " + ", ".join(f"`{p}`" for p in statement.premises), ""]
        if statement.logic:
            block += [f"*Logic:* {self.label(statement.logic)}", ""]
        if statement.supersedes:
            block += ["*Withdraws:* " + ", ".join(f"`{p}`" for p in statement.supersedes), ""]
        if statement.note:
            block += [" ".join(statement.note.split()), ""]
        return block

    def contested(self) -> str:
        questions: dict[tuple[str, str], list[Statement]] = defaultdict(list)
        for statement in self.corpus.statements():
            question = self.question_of(statement)
            if question:
                questions[question].append(statement)

        disputed = {
            question: group
            for question, group in questions.items()
            if self.is_contested(group)
        }
        declared = [
            (s, other)
            for s in self.corpus.statements()
            for other in s.contradicts
        ]

        lines = [
            "# Where the sources disagree",
            "",
            "A question here is one subject and one property type. It is listed when two",
            "witnesses answer it differently, whether by giving a different value or by",
            "holding the same value with a different confidence, or when one witness has",
            "marked two of their own answers as contradicting. One witness naming several",
            "objects for one property is an enumeration and is not here.",
            "",
            "Nothing on this page is resolved by being here. Several of these are not even",
            "disagreements about the same quantity: where three sources put mezzoforte on",
            "three different scales, the graph can show that they differ but not that one is",
            "wrong.",
            "",
        ]
        if not disputed:
            lines += ["_No question yet carries two different answers._", ""]
        for (subject, prop), group in sorted(disputed.items()):
            lines += [
                f"## {self.label(subject)} — {self.label(prop)}",
                "",
                "| holder | answer | holds | source | locator |",
                "|---|---|---|---|---|",
            ]
            for statement in sorted(group, key=lambda s: s.source):
                position = self.position(statement)
                lines.append(
                    f"| {position.holder} | {position.answer} | {position.holds} "
                    f"| `{position.source}` | {position.locator} |"
                )
            lines.append("")
            for statement in group:
                if statement.note:
                    lines += [f"*{statement.ident}:* {' '.join(statement.note.split())}", ""]

        if declared:
            lines += [
                "## Declared contradictions",
                "",
                "Pairs the author has marked as unable to both hold, where the two are not",
                "answers to the same subject-and-property question.",
                "",
                "| statement | contradicts |",
                "|---|---|",
            ]
            for statement, other in declared:
                lines.append(f"| `{statement.key}` | `{other}` |")
            lines.append("")
        return "\n".join(lines)

    def single_instrument(self) -> str:
        machines = {
            ident
            for ident, item in self.entities.items()
            if item.kind.value == "instrument"
        }
        rows = [
            statement
            for statement in self.corpus.statements()
            if statement.claim.subject in machines
        ]
        by_machine: dict[str, list[Statement]] = defaultdict(list)
        for statement in rows:
            by_machine[statement.claim.subject].append(statement)

        lines = [
            "# Claims that rest on one machine",
            "",
            "Every statement below has a particular instrument as its subject, not the T-100",
            "type. That is deliberate and it is the sources' own doing: Hagemann says plainly",
            "that he does not know whether his values transfer, and Hagmann worked from two",
            "instruments while noting that construction details varied over the production",
            "run. A query that wants a fact about the T-100 will not find these, which is the",
            "point of the page.",
            "",
        ]
        for machine, group in sorted(by_machine.items()):
            item = self.entities[machine]
            lines += [f"## {self.label(machine)}", ""]
            if item.note:
                lines += [" ".join(item.note.split()), ""]
            lines += ["| property | value | source | locator |", "|---|---|---|---|"]
            for statement in group:
                prop = self.label(statement.claim.property) if statement.claim.property else "—"
                lines.append(
                    f"| {prop} | {self.answer_of(statement)} | `{statement.source}` "
                    f"| {statement.locator} |"
                )
            lines.append("")
        return "\n".join(lines)

    def unsupported(self) -> str:
        loose = [
            statement
            for statement in self.corpus.statements()
            if statement.holder == PROJECT_ACTOR
            and statement.kind.value in {"inference"}
            and not statement.premises
        ]
        lines = [
            "# Beliefs with nothing under them",
            "",
            "An inference of the project's own with no premise named. This page should stay",
            "empty; the loader refuses such a statement, so a row here means the loader has a",
            "hole in it.",
            "",
        ]
        lines += (
            ["_empty, as it should be._", ""]
            if not loose
            else [f"- `{s.key}` ({s.locator})" for s in loose] + [""]
        )
        return "\n".join(lines)

    def code_constants(self) -> str:
        """Compare what the graph says a parameter is with what the source file sets it to."""
        pinned = {
            item.ident: item.code
            for item in self.corpus.entities
            if item.code
        }
        claims = {
            statement.claim.subject: statement
            for statement in self.corpus.statements()
            if statement.claim.subject in pinned
            and isinstance(statement.claim, Quantity)
            and statement.holder == PROJECT_ACTOR
        }
        lines = [
            "# The graph against the code",
            "",
            "Each row is a parameter the graph records a value for and the emulator also sets.",
            "A mismatch means one of the two moved without the other, which is the failure a",
            "knowledge graph living beside its code exists to catch.",
            "",
            "| parameter | in the graph | in the code | | ",
            "|---|---|---|---|",
        ]
        drift = 0
        for ident, location in sorted(pinned.items()):
            statement = claims.get(ident)
            in_code = _read_constant(location)
            in_graph = (
                statement.claim.value
                if statement and isinstance(statement.claim, Quantity)
                else None
            )
            if in_graph is None or in_code is None:
                verdict = "not comparable"
            elif abs(in_graph - in_code) < 1e-9:
                verdict = "agree"
            else:
                verdict = "**differ**"
                drift += 1
            lines.append(
                f"| `{location}` | {'—' if in_graph is None else f'{in_graph:g}'} "
                f"| {'not found' if in_code is None else f'{in_code:g}'} | {verdict} |"
            )
        lines += ["", f"{drift} parameter(s) where the graph and the code disagree.", ""]
        return "\n".join(lines)


def _braces_block(text: str, opening: int) -> str:
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return text[opening : index + 1]
    return text[opening:]


def _read_constant(location: str) -> float | None:
    """Read `path:name` or `path:outer.name` out of a TypeScript source.

    Values are plain numbers, or a sum of two, which is how `settings.ts` writes the
    Mezzoforte centre as the measured arrest face plus half a pin thickness.
    """
    path, _, name = location.rpartition(":")
    file = REPO / path
    if not path or not file.exists():
        return None
    text = file.read_text(encoding="utf-8")
    outer, _, inner = name.partition(".")
    if inner:
        opening = re.search(rf"\b{re.escape(outer)}\s*:\s*\{{", text)
        if not opening:
            return None
        text, name = _braces_block(text, opening.end() - 1), inner
    match = re.search(rf"\b{re.escape(name)}\s*:\s*(-?[\d.]+(?:\s*\+\s*-?[\d.]+)*)", text)
    if not match:
        return None
    try:
        return sum(float(part) for part in match.group(1).split("+"))
    except ValueError:
        return None


def write_reports(root: Path, out: Path) -> int:
    reporter = Reporter(load_corpus(root))
    folder = out / "reports"
    folder.mkdir(parents=True, exist_ok=True)
    pages = {
        "by-source.md": reporter.by_source(),
        "contested.md": reporter.contested(),
        "single-instrument.md": reporter.single_instrument(),
        "unsupported.md": reporter.unsupported(),
        "code-constants.md": reporter.code_constants(),
    }
    for name, text in pages.items():
        (folder / name).write_text(text, encoding="utf-8")
        print(f"wrote {folder / name}")
    return 0
