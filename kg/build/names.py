"""Namespaces, and the only place a URI is minted."""

from __future__ import annotations

import re

from rdflib import Namespace, URIRef

CRM = Namespace("http://www.cidoc-crm.org/cidoc-crm/")
SCI = Namespace("http://www.cidoc-crm.org/extensions/crmsci/")
INF = Namespace("http://www.cidoc-crm.org/extensions/crminf/")

BASE = "https://w3id.org/welte-t100/"
WT = Namespace(BASE)

# The URI spaces an identifier can land in. Each gets its own prefix so that both the
# serialised Turtle and a SPARQL query can name a node without escaping anything.
SPACES = (
    "actor", "concept", "property", "unit", "thing", "text", "source", "logic", "symbol",
    "statement", "belief", "proposition", "dimension", "passage", "adoption", "adopted",
    "meaning", "comprehension", "transmission", "transmitted-belief", "revision",
    "withdrawal", "creation", "identifier", "timespan", "graph", "p",
)

BINDINGS = {
    "crm": CRM, "crmsci": SCI, "crminf": INF, "wt": WT,
    **{space.replace("-", "_"): Namespace(f"{BASE}{space}/") for space in SPACES},
}

# No "/" inside an identifier: it would be legal in a URI but has to be escaped in every
# SPARQL prefixed name, which makes the graph tiresome to query for no gain.
_SLUG = re.compile(r"[a-z0-9][a-z0-9._-]*\Z")


class BadIdentifier(ValueError):
    """An identifier that cannot be turned into a URI without guessing."""


def check_slug(ident: str, where: str) -> str:
    if not _SLUG.match(ident):
        raise BadIdentifier(
            f"{where}: {ident!r} is not a usable identifier. "
            "Use lower-case letters, digits, dot, dash and underscore. "
            "'/' separates URI spaces and cannot appear inside an identifier."
        )
    return ident


def entity(space: str, ident: str) -> URIRef:
    """The URI of a named thing: an actor, a concept, a document, a logic."""
    return WT[f"{space}/{ident}"]


def node(role: str, source: str, statement: str) -> URIRef:
    """The URI of one of the nodes a statement compiles into."""
    return WT[f"{role}/{source}/{statement}"]


def source_graph(source: str) -> URIRef:
    return WT[f"graph/{source}"]


ENTITY_GRAPH = WT["graph/entities"]
ADOPTED_GRAPH = WT["graph/adopted"]
ANNOTATION_GRAPH = WT["graph/annotations"]

# Bookkeeping predicates. These are not claims about the Welte mechanism and are
# deliberately outside the CRM namespaces; `emit.declare_annotations` gives each one
# an rdfs:comment saying so.
LOCATOR = WT["locator"]
STATEMENT_KIND = WT["statementKind"]
DEFINED_IN = WT["definedIn"]
CONTRADICTS = WT["contradicts"]
SAMPLE_SIZE = WT["sampleSize"]
STANDARD_DEVIATION = WT["standardDeviation"]
SCOPED_TO = WT["scopedTo"]

ANNOTATIONS = {
    LOCATOR: "Where in the cited source the statement is found. Bookkeeping, not a CRM claim.",
    STATEMENT_KIND: "The authoring kind this node was compiled from. Bookkeeping.",
    DEFINED_IN: "The YAML file a node was authored in. Bookkeeping.",
    CONTRADICTS: "Two beliefs the project holds cannot both be true. CRMinf has no property "
    "for this, and inventing a CRM one would misrepresent the model.",
    SAMPLE_SIZE: "n, for a measurement over a sample. Bookkeeping alongside the E54 Dimension.",
    STANDARD_DEVIATION: "The standard deviation reported with a measurement. Bookkeeping.",
    SCOPED_TO: "The entity the author limits the claim to, where that is narrower than the "
    "proposition's own domain. Bookkeeping.",
}


def adopted_property(property_id: str) -> URIRef:
    """The plain RDF property standing for an S9 Property Type in the adopted layer."""
    return WT[f"p/{property_id}"]


# A `crm_property` or `inference_class` is written as the bare term, and its initial says
# which of the three models it belongs to: P for CIDOC CRM, O and S for CRMsci, J and I for
# CRMinf. `check` still refuses any term the vendored files do not declare.
_MODEL_BY_INITIAL = {"P": CRM, "E": CRM, "O": SCI, "S": SCI, "J": INF, "I": INF}


def model_term(name: str) -> URIRef:
    try:
        return _MODEL_BY_INITIAL[name[0]][name]
    except (KeyError, IndexError) as exc:
        raise BadIdentifier(
            f"{name!r} is not a CIDOC CRM, CRMsci or CRMinf term: it should begin with "
            "P, E, O, S, J or I"
        ) from exc
