"""Read the authored YAML into `Corpus`, refusing anything that would lose provenance.

Every problem found is collected and reported together, because fixing a source file one
error per run is miserable work.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

import yaml

from .names import BadIdentifier, check_slug
from .schema import (
    INFORMATION_KINDS,
    BeliefValue,
    Claim,
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

ACTOR_KINDS = frozenset({EntityKind.PERSON, EntityKind.GROUP})

QUANTITY_KEYS = ("value", "lower", "upper", "sd", "n")
DATE_KEYS = ("begin", "end")
STATEMENT_KEYS = frozenset(
    {
        "id", "kind", "locator", "quote", "translation", "note",
        "subject", "property", "object", "unit", "gloss", "encoded",
        "holds", "holder", "transmitted_by", "mentions", "scope", "premises", "logic",
        "adopt", "comprehension", "supersedes", "contradicts", "about", "when", "date",
        *QUANTITY_KEYS,
    }
)
SOURCE_KEYS = frozenset(
    {"id", "kind", "title", "authors", "year", "container", "pages",
     "identifier", "copy", "url", "note"}
)
ENTITY_KEYS = frozenset(
    {"id", "kind", "label", "note", "part_of", "instance_of", "same_as", "code",
     "crm_property", "concerns", "created_by", "inference_class", "enumerable"}
)


class CorpusError(Exception):
    def __init__(self, problems: Sequence[str]) -> None:
        super().__init__(f"{len(problems)} problem(s) in the authored sources")
        self.problems = tuple(problems)

    def __str__(self) -> str:
        return "\n".join([f"{len(self.problems)} problem(s):", *(f"  - {p}" for p in self.problems)])


def _lang_strings(raw: Any, where: str, problems: list[str]) -> tuple[LangString, ...]:
    if raw is None:
        return ()
    if isinstance(raw, str):
        return (LangString("en", raw),)
    if isinstance(raw, Mapping):
        return tuple(LangString(str(k), str(v)) for k, v in raw.items())
    problems.append(f"{where}: expected a string or a mapping of language code to text")
    return ()


def _sequence(raw: Any, where: str, problems: list[str]) -> tuple[str, ...]:
    if raw is None:
        return ()
    if isinstance(raw, str):
        return (raw,)
    if isinstance(raw, Sequence):
        return tuple(str(x) for x in raw)
    problems.append(f"{where}: expected a string or a list of strings")
    return ()


def _unexpected(raw: Mapping[str, Any], allowed: frozenset[str], where: str, problems: list[str]) -> None:
    for key in raw:
        if key not in allowed:
            problems.append(f"{where}: unknown field {key!r}")


def _number(raw: Any, where: str, field: str, problems: list[str]) -> float | None:
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        problems.append(f"{where}: {field} must be a number, got {raw!r}")
        return None


class Loader:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.problems: list[str] = []

    def load(self) -> Corpus:
        entities = tuple(self._entities())
        sources = tuple(self._sources())
        corpus = Corpus(entities=entities, sources=sources)
        self._check_references(corpus)
        if self.problems:
            raise CorpusError(sorted(set(self.problems)))
        return corpus

    # -- reading ---------------------------------------------------------------

    def _documents(self, folder: str) -> Iterable[tuple[Path, Mapping[str, Any]]]:
        for path in sorted((self.root / folder).glob("*.yaml")):
            if path.name.startswith("_"):
                continue
            loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
            if not isinstance(loaded, Mapping):
                self.problems.append(f"{path}: expected a mapping at the top level")
                continue
            yield path, loaded

    def _entities(self) -> Iterable[Entity]:
        for path, document in self._documents("entities"):
            rel = str(path.relative_to(self.root))
            raw_entities = document.get("entities")
            if not isinstance(raw_entities, Sequence):
                self.problems.append(f"{rel}: expected a top-level 'entities:' list")
                continue
            for raw in raw_entities:
                entity = self._entity(raw, rel)
                if entity is not None:
                    yield entity

    def _entity(self, raw: Any, rel: str) -> Entity | None:
        if not isinstance(raw, Mapping):
            self.problems.append(f"{rel}: an entity must be a mapping")
            return None
        ident = str(raw.get("id", ""))
        where = f"{rel}: entity {ident or '<no id>'}"
        _unexpected(raw, ENTITY_KEYS, where, self.problems)
        if not ident:
            self.problems.append(f"{rel}: an entity is missing its 'id'")
            return None
        try:
            check_slug(ident, where)
        except BadIdentifier as exc:
            self.problems.append(str(exc))
            return None
        try:
            kind = EntityKind(str(raw.get("kind", "")))
        except ValueError:
            self.problems.append(
                f"{where}: kind must be one of {', '.join(k.value for k in EntityKind)}"
            )
            return None
        labels = _lang_strings(raw.get("label"), f"{where}: label", self.problems)
        if not labels:
            self.problems.append(f"{where}: needs a 'label'")
        return Entity(
            ident=ident,
            kind=kind,
            labels=labels,
            note=raw.get("note"),
            part_of=raw.get("part_of"),
            instance_of=raw.get("instance_of"),
            same_as=_sequence(raw.get("same_as"), f"{where}: same_as", self.problems),
            code=raw.get("code"),
            crm_property=raw.get("crm_property"),
            concerns=_sequence(raw.get("concerns"), f"{where}: concerns", self.problems),
            created_by=_sequence(raw.get("created_by"), f"{where}: created_by", self.problems),
            inference_class=raw.get("inference_class"),
            enumerable=bool(raw.get("enumerable", False)),
            defined_in=rel,
        )

    def _sources(self) -> Iterable[Source]:
        for path, document in self._documents("sources"):
            rel = str(path.relative_to(self.root))
            raw_source = document.get("source")
            if not isinstance(raw_source, Mapping):
                self.problems.append(f"{rel}: expected a top-level 'source:' mapping")
                continue
            ident = str(raw_source.get("id", ""))
            where = f"{rel}: source {ident or '<no id>'}"
            _unexpected(raw_source, SOURCE_KEYS, where, self.problems)
            if not ident:
                self.problems.append(f"{rel}: the source is missing its 'id'")
                continue
            try:
                check_slug(ident, where)
            except BadIdentifier as exc:
                self.problems.append(str(exc))
                continue
            authors = _sequence(raw_source.get("authors"), f"{where}: authors", self.problems)
            if not authors:
                self.problems.append(f"{where}: needs at least one author in 'authors'")
            statements = tuple(
                s
                for s in (
                    self._statement(raw, ident, authors, rel)
                    for raw in document.get("statements") or ()
                )
                if s is not None
            )
            yield Source(
                ident=ident,
                kind=str(raw_source.get("kind", "unspecified")),
                title=str(raw_source.get("title", "")),
                authors=authors,
                year=raw_source.get("year"),
                container=raw_source.get("container"),
                pages=raw_source.get("pages"),
                identifier=raw_source.get("identifier"),
                copy=raw_source.get("copy"),
                url=raw_source.get("url"),
                note=raw_source.get("note"),
                statements=statements,
                defined_in=rel,
            )

    def _statement(
        self, raw: Any, source: str, authors: tuple[str, ...], rel: str
    ) -> Statement | None:
        if not isinstance(raw, Mapping):
            self.problems.append(f"{rel}: a statement must be a mapping")
            return None
        ident = str(raw.get("id", ""))
        where = f"{rel}: {source}/{ident or '<no id>'}"
        _unexpected(raw, STATEMENT_KEYS, where, self.problems)
        if not ident:
            self.problems.append(f"{rel}: a statement in {source} is missing its 'id'")
            return None
        try:
            check_slug(ident, where)
        except BadIdentifier as exc:
            self.problems.append(str(exc))
            return None
        try:
            kind = StatementKind(str(raw.get("kind", "")))
        except ValueError:
            self.problems.append(
                f"{where}: kind must be one of {', '.join(k.value for k in StatementKind)}"
            )
            return None

        locator = str(raw.get("locator", "")).strip()
        if not locator:
            self.problems.append(f"{where}: needs a 'locator'. No statement enters the graph "
                                 "without one.")

        claim = self._claim(raw, kind, where)
        if claim is None:
            return None

        holds = self._holds(raw, kind, where)
        holder = str(raw.get("holder") or (authors[0] if authors else ""))
        if not holder:
            self.problems.append(f"{where}: no 'holder' and the source names no author")

        return Statement(
            source=source,
            ident=ident,
            kind=kind,
            locator=locator,
            claim=claim,
            holder=holder,
            holds=holds,
            quotes=_lang_strings(raw.get("quote"), f"{where}: quote", self.problems),
            translation=raw.get("translation"),
            transmitted_by=_sequence(
                raw.get("transmitted_by"), f"{where}: transmitted_by", self.problems
            ),
            mentions=_sequence(raw.get("mentions"), f"{where}: mentions", self.problems),
            scope=raw.get("scope"),
            premises=_sequence(raw.get("premises"), f"{where}: premises", self.problems),
            logic=raw.get("logic"),
            adopt=bool(raw.get("adopt", False)),
            comprehension=raw.get("comprehension"),
            supersedes=_sequence(raw.get("supersedes"), f"{where}: supersedes", self.problems),
            contradicts=_sequence(raw.get("contradicts"), f"{where}: contradicts", self.problems),
            about=raw.get("about"),
            when=str(raw["when"]) if raw.get("when") is not None else None,
            note=raw.get("note"),
            defined_in=rel,
        )

    def _claim(self, raw: Mapping[str, Any], kind: StatementKind, where: str) -> Claim | None:
        subject, prop = raw.get("subject"), raw.get("property")
        quantitative = any(raw.get(k) is not None for k in QUANTITY_KEYS) or raw.get("unit")

        if kind is StatementKind.ASSESSMENT:
            gloss = raw.get("gloss")
            if not gloss:
                self.problems.append(f"{where}: an assessment needs a 'gloss' saying what "
                                     "the provenance statement asserts")
                return None
            if not raw.get("about"):
                self.problems.append(f"{where}: an assessment needs 'about', the thing whose "
                                     "provenance is being assessed")
                return None
            return Prose(gloss=str(gloss), subject=subject, property=prop,
                         encoded=raw.get("encoded"))

        if raw.get("gloss"):
            if quantitative or raw.get("object") is not None:
                self.problems.append(
                    f"{where}: a 'gloss' is for a claim kept in words; it cannot be combined "
                    "with an 'object' or a magnitude"
                )
                return None
            return Prose(gloss=str(raw["gloss"]), subject=subject, property=prop,
                         encoded=raw.get("encoded"))

        if not subject or not prop:
            self.problems.append(
                f"{where}: needs 'subject' and 'property' (or a 'gloss' for a claim kept in words)"
            )
            return None

        if raw.get("date") is not None:
            date = raw["date"]
            if not isinstance(date, Mapping):
                self.problems.append(f"{where}: 'date' must be a mapping with begin and/or end")
                return None
            if not any(date.get(key) for key in DATE_KEYS):
                self.problems.append(f"{where}: a date needs 'begin', 'end', or both")
                return None
            return Temporal(
                subject=str(subject),
                property=str(prop),
                begin=str(date["begin"]) if date.get("begin") else None,
                end=str(date["end"]) if date.get("end") else None,
                label=str(date["label"]) if date.get("label") else None,
            )

        if quantitative:
            unit = raw.get("unit")
            if not unit:
                self.problems.append(f"{where}: a magnitude needs a 'unit'. There are no "
                                     "dimensionless numbers in this graph.")
                return None
            values = {k: _number(raw.get(k), where, k, self.problems) for k in ("value", "lower", "upper", "sd")}
            if all(values[k] is None for k in ("value", "lower", "upper")):
                self.problems.append(f"{where}: a magnitude needs 'value', or 'lower'/'upper'")
                return None
            count = raw.get("n")
            return Quantity(
                subject=str(subject),
                property=str(prop),
                unit=str(unit),
                value=values["value"],
                lower=values["lower"],
                upper=values["upper"],
                sd=values["sd"],
                n=int(count) if count is not None else None,
            )

        obj = raw.get("object")
        if obj is None:
            self.problems.append(
                f"{where}: needs an 'object', or a 'value' and 'unit', or a 'gloss'"
            )
            return None
        return Relation(subject=str(subject), property=str(prop), object=str(obj))

    def _holds(self, raw: Mapping[str, Any], kind: StatementKind, where: str) -> BeliefValue | None:
        if kind is StatementKind.CONVENTION:
            if raw.get("holds") is not None:
                self.problems.append(
                    f"{where}: a convention is stipulated, not believed, so it takes no 'holds'"
                )
            return None
        raw_holds = raw.get("holds")
        if raw_holds is None:
            self.problems.append(
                f"{where}: needs 'holds', one of {', '.join(v.value for v in BeliefValue)}"
            )
            return None
        try:
            return BeliefValue(str(raw_holds).upper())
        except ValueError:
            self.problems.append(
                f"{where}: holds must be one of {', '.join(v.value for v in BeliefValue)}, "
                f"got {raw_holds!r}"
            )
            return None

    # -- cross-checking --------------------------------------------------------

    def _check_references(self, corpus: Corpus) -> None:
        entities = corpus.by_id()
        statements = corpus.statements_by_key()

        def entity_of(ident: str | None, where: str, field: str,
                      kinds: frozenset[EntityKind] | None = None) -> None:
            if ident is None:
                return
            found = entities.get(ident)
            if found is None:
                self.problems.append(f"{where}: {field} names {ident!r}, which no entity file declares")
                return
            if kinds is not None and found.kind not in kinds:
                allowed = ", ".join(sorted(k.value for k in kinds))
                self.problems.append(
                    f"{where}: {field} names {ident!r}, a {found.kind.value}; expected {allowed}"
                )

        for entity in corpus.entities:
            where = f"{entity.defined_in}: entity {entity.ident}"
            entity_of(entity.part_of, where, "part_of")
            entity_of(entity.instance_of, where, "instance_of")
            for concern in entity.concerns:
                entity_of(concern, where, "concerns")
            if entity.crm_property and entity.kind is not EntityKind.PROPERTY_TYPE:
                self.problems.append(
                    f"{where}: only a property-type may declare 'crm_property'"
                )
            if entity.enumerable and entity.kind is not EntityKind.PROPERTY_TYPE:
                self.problems.append(
                    f"{where}: only a property-type may be 'enumerable'"
                )
            if entity.inference_class and entity.kind is not EntityKind.LOGIC:
                self.problems.append(
                    f"{where}: only a logic may declare 'inference_class'"
                )
            if entity.created_by and entity.kind not in INFORMATION_KINDS:
                self.problems.append(
                    f"{where}: 'created_by' is for a text, document, software or work; "
                    "a physical thing is made by a production event, which is a statement"
                )
            for actor in entity.created_by:
                entity_of(actor, where, "created_by", ACTOR_KINDS)

        for statement in corpus.statements():
            where = f"{statement.defined_in}: {statement.key}"
            entity_of(statement.holder, where, "holder", ACTOR_KINDS)
            entity_of(statement.logic, where, "logic", frozenset({EntityKind.LOGIC}))
            entity_of(statement.scope, where, "scope")
            entity_of(statement.about, where, "about")
            for actor in statement.transmitted_by:
                entity_of(actor, where, "transmitted_by", ACTOR_KINDS)
            for mentioned in statement.mentions:
                entity_of(mentioned, where, "mentions")

            claim = statement.claim
            if isinstance(claim, Relation | Quantity | Temporal):
                entity_of(claim.subject, where, "subject")
                entity_of(claim.property, where, "property",
                          frozenset({EntityKind.PROPERTY_TYPE}))
            if isinstance(claim, Relation):
                entity_of(claim.object, where, "object")
            if isinstance(claim, Quantity):
                entity_of(claim.unit, where, "unit", frozenset({EntityKind.UNIT}))
            if isinstance(claim, Prose):
                entity_of(claim.subject, where, "subject")
                entity_of(claim.property, where, "property",
                          frozenset({EntityKind.PROPERTY_TYPE}))

            if statement.kind is StatementKind.INFERENCE:
                if not statement.premises:
                    self.problems.append(f"{where}: an inference needs at least one premise")
                if not statement.logic:
                    self.problems.append(
                        f"{where}: an inference needs a 'logic' naming how the conclusion was drawn"
                    )
            for field, refs in (
                ("premises", statement.premises),
                ("supersedes", statement.supersedes),
                ("contradicts", statement.contradicts),
            ):
                for ref in refs:
                    key = ref if "/" in ref else f"{statement.source}/{ref}"
                    if key not in statements:
                        self.problems.append(
                            f"{where}: {field} names {ref!r}, which is not a statement in this graph"
                        )
                    elif key == statement.key:
                        self.problems.append(f"{where}: {field} names the statement itself")


def resolve(ref: str, source: str) -> str:
    """A premise reference, as written, turned into a full statement key."""
    return ref if "/" in ref else f"{source}/{ref}"


def load_corpus(root: Path) -> Corpus:
    return Loader(root).load()
