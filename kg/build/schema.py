"""The records a source file compiles into.

Every field that carries provenance is required by construction: a `Statement` cannot be
built without a locator, a holder and a belief value, and `Loader` refuses a file that
leaves one out. The CRM shape those records take is decided in `emit`, not here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import NamedTuple

from rdflib import URIRef

from .names import CRM, INF, SCI


class LangString(NamedTuple):
    lang: str
    text: str


class EntityKind(StrEnum):
    PERSON = "person"
    GROUP = "group"
    CONCEPT = "concept"
    PROPERTY_TYPE = "property-type"
    UNIT = "unit"
    COMPONENT = "component"
    INSTRUMENT = "instrument"
    ROLL = "roll"
    OBJECT = "object"
    FEATURE = "feature"
    COLLECTION = "collection"
    DOCUMENT = "document"
    TEXT = "text"
    SOFTWARE = "software"
    PROCEDURE = "procedure"
    LOGIC = "logic"
    PLACE = "place"
    ACTIVITY = "activity"
    PRODUCTION = "production"
    PERFORMANCE = "performance"
    WORK = "work"


class Shape(NamedTuple):
    """Where a kind of entity lives in the URI space and what CRM class it takes."""

    space: str
    crm_class: URIRef
    auto_type: str | None


ENTITY_SHAPES: dict[EntityKind, Shape] = {
    EntityKind.PERSON: Shape("actor", CRM.E21_Person, None),
    EntityKind.GROUP: Shape("actor", CRM.E74_Group, None),
    EntityKind.CONCEPT: Shape("concept", CRM.E55_Type, None),
    EntityKind.PROPERTY_TYPE: Shape("property", SCI.S9_Property_Type, None),
    EntityKind.UNIT: Shape("unit", CRM.E58_Measurement_Unit, None),
    EntityKind.COMPONENT: Shape("thing", CRM.E55_Type, "mechanism-component"),
    EntityKind.INSTRUMENT: Shape("thing", CRM["E22_Human-Made_Object"], None),
    EntityKind.ROLL: Shape("thing", CRM["E22_Human-Made_Object"], "piano-roll"),
    EntityKind.OBJECT: Shape("thing", CRM["E22_Human-Made_Object"], None),
    EntityKind.FEATURE: Shape("thing", CRM["E25_Human-Made_Feature"], None),
    EntityKind.COLLECTION: Shape("thing", CRM.E78_Curated_Holding, None),
    EntityKind.DOCUMENT: Shape("text", CRM.E31_Document, None),
    EntityKind.TEXT: Shape("text", CRM.E73_Information_Object, None),
    EntityKind.SOFTWARE: Shape("text", CRM.E73_Information_Object, "software"),
    EntityKind.PROCEDURE: Shape("text", CRM.E29_Design_or_Procedure, None),
    EntityKind.LOGIC: Shape("logic", INF.I3_Inference_Logic, None),
    EntityKind.PLACE: Shape("place", CRM.E53_Place, None),
    EntityKind.ACTIVITY: Shape("event", CRM.E7_Activity, None),
    EntityKind.PRODUCTION: Shape("event", CRM.E12_Production, None),
    EntityKind.PERFORMANCE: Shape("event", CRM.E7_Activity, "performance"),
    EntityKind.WORK: Shape("work", CRM.E73_Information_Object, "musical-work"),
}

# Events are declared here only as existing and being of a kind. Everything about them
# that could be got wrong — when, where, by whom — is a statement with a locator, so that
# the CIDOC CRM in the adopted layer is derived from beliefs rather than asserted beside
# them.
EVENT_KINDS = frozenset(
    {EntityKind.ACTIVITY, EntityKind.PRODUCTION, EntityKind.PERFORMANCE}
)

OBSERVABLE_KINDS = frozenset(
    {EntityKind.INSTRUMENT, EntityKind.ROLL, EntityKind.OBJECT, EntityKind.COMPONENT,
     EntityKind.FEATURE}
)

# Physical things, which is where CRMsci's `O12 has dimension` applies, and where a
# part-whole link is `P46`. Features are physical too but sit on their carrier by `P56`.
PHYSICAL_KINDS = frozenset(
    {EntityKind.INSTRUMENT, EntityKind.ROLL, EntityKind.OBJECT, EntityKind.FEATURE,
     EntityKind.COLLECTION}
)

# Information objects, whose parts are `P148 components` and which an E65 Creation makes.
INFORMATION_KINDS = frozenset(
    {EntityKind.DOCUMENT, EntityKind.TEXT, EntityKind.SOFTWARE, EntityKind.PROCEDURE,
     EntityKind.WORK}
)


class StatementKind(StrEnum):
    MEASUREMENT = "measurement"
    OBSERVATION = "observation"
    REPORT = "report"
    INFERENCE = "inference"
    ASSESSMENT = "assessment"
    CONVENTION = "convention"


class BeliefValue(StrEnum):
    TRUE = "TRUE"
    FALSE = "FALSE"
    UNKNOWN = "UNKNOWN"
    PROBABLE = "PROBABLE"


@dataclass(frozen=True)
class Entity:
    ident: str
    kind: EntityKind
    labels: tuple[LangString, ...]
    note: str | None = None
    part_of: str | None = None
    instance_of: str | None = None
    same_as: tuple[str, ...] = ()
    code: str | None = None
    crm_property: str | None = None
    concerns: tuple[str, ...] = ()
    created_by: tuple[str, ...] = ()
    inference_class: str | None = None
    enumerable: bool = False
    defined_in: str = ""

    @property
    def shape(self) -> Shape:
        return ENTITY_SHAPES[self.kind]


@dataclass(frozen=True)
class Relation:
    """A proposition of the form subject–property–object, all three named entities."""

    subject: str
    property: str
    object: str


@dataclass(frozen=True)
class Quantity:
    """A proposition assigning a measured or stipulated magnitude to an entity."""

    subject: str
    property: str
    unit: str
    value: float | None = None
    lower: float | None = None
    upper: float | None = None
    sd: float | None = None
    n: int | None = None

    def __post_init__(self) -> None:
        if self.value is None and self.lower is None and self.upper is None:
            raise ValueError("a quantity needs at least one of value, lower, upper")


@dataclass(frozen=True)
class Temporal:
    """A proposition placing something in time."""

    subject: str
    property: str
    begin: str | None = None
    end: str | None = None
    label: str | None = None

    def __post_init__(self) -> None:
        if self.begin is None and self.end is None:
            raise ValueError("a date needs at least one of begin, end")

    @property
    def unit(self) -> None:
        return None


@dataclass(frozen=True)
class Prose:
    """A proposition the project has chosen not to formalise, kept in words.

    `gloss` is what it says; `encoded` is an optional Turtle fragment for the part that
    could be formalised. Used where forcing a subject-property-object shape would claim
    more precision than the source supports, and for provenance statements.
    """

    gloss: str
    subject: str | None = None
    property: str | None = None
    encoded: str | None = None


Claim = Relation | Quantity | Temporal | Prose


@dataclass(frozen=True)
class Statement:
    source: str
    ident: str
    kind: StatementKind
    locator: str
    claim: Claim
    holder: str
    holds: BeliefValue | None = None
    quotes: tuple[LangString, ...] = ()
    translation: str | None = None
    transmitted_by: tuple[str, ...] = ()
    mentions: tuple[str, ...] = ()
    scope: str | None = None
    premises: tuple[str, ...] = ()
    logic: str | None = None
    adopt: bool = False
    comprehension: str | None = None
    supersedes: tuple[str, ...] = ()
    contradicts: tuple[str, ...] = ()
    about: str | None = None
    when: str | None = None
    note: str | None = None
    defined_in: str = ""

    @property
    def key(self) -> str:
        return f"{self.source}/{self.ident}"


@dataclass(frozen=True)
class Source:
    ident: str
    kind: str
    title: str
    authors: tuple[str, ...]
    year: int | None = None
    container: str | None = None
    pages: str | None = None
    identifier: str | None = None
    copy: str | None = None
    url: str | None = None
    note: str | None = None
    statements: tuple[Statement, ...] = field(default_factory=tuple)
    defined_in: str = ""

    def citation(self) -> str:
        parts = [self.title]
        if self.container:
            parts.append(self.container)
        if self.year:
            parts.append(str(self.year))
        if self.pages:
            parts.append(f"pp. {self.pages}")
        return ", ".join(parts)


@dataclass(frozen=True)
class Corpus:
    entities: tuple[Entity, ...]
    sources: tuple[Source, ...]

    def by_id(self) -> dict[str, Entity]:
        return {e.ident: e for e in self.entities}

    def statements(self) -> tuple[Statement, ...]:
        return tuple(s for src in self.sources for s in src.statements)

    def statements_by_key(self) -> dict[str, Statement]:
        return {s.key: s for s in self.statements()}
