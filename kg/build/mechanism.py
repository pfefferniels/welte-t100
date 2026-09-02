"""The schematic's own payload: a layout and the fitted constants.

Only the layout is invented here. Which parts exist and how they connect comes from the
topology statements in the graph, so a link that is not in `hagmann-1984` is not in the
drawing, and the constants come from `emulator-fit`. If a component has no position below
it simply is not drawn, and `write_view` says how many were left out.

The layout is a reading of Anhang 13, not a copy of it. Hagmann's own note at p. 62 n. 29
says the plates are schematic and not to scale, and so is this.

A shape name is more than a size here: it picks which cut-away the page draws inside the
box, so `doppelventil-38` is a `doublevalve` and `ventil-22` a plain `valve` because
Hagmann says the sforzando has one seat where the crescendo has two. The boxes are sized to
hold that drawing rather than a caption.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import NamedTuple

from .schema import Corpus, Quantity, Relation, Statement

# Box sizes travel with the payload so the drawing and the viewBox are computed from one
# table rather than from two that can drift apart. A relay box is 70 tall because a shuttle
# valve needs two seats and room to travel between them; at the old 30 it could only hold a
# number.
SHAPES: dict[str, tuple[int, int]] = {
    "membrane": (108, 70), "doublevalve": (108, 70), "valve": (108, 70),
    "latch": (108, 70), "cone": (108, 70), "plenum": (108, 70), "hook": (108, 70),
    "port": (100, 56), "throttle": (48, 48),
    "bellows": (132, 130), "bellows-small": (104, 52),
    "supply": (100, 56), "spring": (64, 44), "link": (100, 44), "adjuster": (56, 22),
}
CAPTION_DROP = 44   # room under the bellows for its two readout lines; no other part has one
MARGIN = 22

# Two columns, because four stacked rows of it added more height to the drawing than the
# drawing could spare.
LEGEND = [
    ("air", "air let in from outside — this is what moves things"),
    ("vacuum", "air drawn back out, towards the blower"),
    ("control", "one part working another"),
    ("unsettled", "a link the sources do not settle"),
]
LEGEND_COLUMNS, LEGEND_COLUMN, LEGEND_ROW = 2, 620, 16

# id: (x, y, shape, caption).
LAYOUT: dict[str, tuple[int, int, str, str]] = {
    # One row per function, in the order the openings sit on the glide block, so that a
    # perforation and the valve it works are on the same line. Mezzoforte takes two rows
    # because it has two openings and one named valve between them.
    "gleitblock-opening-7": (100, 100, "port", "7 · MF off"),
    "gleitblock-opening-8": (100, 196, "port", "8 · MF on"),
    "doppelventil-53": (300, 148, "doublevalve", "53"),
    "mezzofortebalg-93": (760, 148, "hook", "93 · hook"),

    "gleitblock-opening-9": (100, 292, "port", "9 · cresc off"),
    "membrankammer-44": (300, 292, "membrane", "44"),
    "doppelventil-47": (460, 292, "doublevalve", "47"),
    "membrankammer-41": (620, 292, "latch", "41 · latch"),
    "bohrung-100": (760, 292, "throttle", "100"),

    "gleitblock-opening-10": (100, 388, "port", "10 · cresc on"),
    "membrankammer-35": (300, 388, "membrane", "35"),
    "doppelventil-38": (460, 388, "doublevalve", "38"),

    "gleitblock-opening-11": (100, 484, "port", "11 · sf off"),
    "membrankammer-28": (300, 484, "membrane", "28"),
    "doppelventil-31": (460, 484, "doublevalve", "31"),
    "hilfsbalg-94": (620, 484, "bellows-small", "94"),
    "drossel-96": (760, 484, "throttle", "96"),

    "gleitblock-opening-12": (100, 580, "port", "12 · sf on"),
    "ventil-22": (300, 580, "valve", "22"),
    "hilfsbalg-95": (620, 580, "bellows-small", "95"),
    "drossel-97": (760, 580, "throttle", "97"),

    # the bellows and what it drives
    # Nothing here sits between two parts that have to reach each other: spring 89 used to
    # stand between the cone valve and wind chamber 86, with no way round it.
    "nuancierbalg-90": (940, 388, "bellows", "90 · Nuancierbalg"),
    "kettenband": (1090, 388, "link", "chain band"),
    "ledermutter-92": (1090, 304, "adjuster", "92"),
    "feder-89": (1240, 300, "spring", "89"),
    "kegelventil-87": (1240, 388, "cone", "87 · cone"),
    "regelbalg-91": (1090, 484, "bellows-small", "91 · Regelbalg"),
    "regelfeder-101": (1090, 560, "spring", "101"),
    "windkammer-86": (1240, 484, "plenum", "86 · delivered"),
    "kondukte-88": (1240, 580, "plenum", "88 · to notes"),
    "tonerzeugungsbalg-121": (1240, 676, "bellows-small", "121 · note"),

    # The supply keeps to the relay's own columns: a box half a column over would split a
    # routing gutter and leave the lanes in it stacked on one line. Neither wind chamber may
    # stand under the double valves, though, or its run up to the top one goes straight
    # through the two below it.
    "geblaese": (100, 708, "supply", "blower"),
    "magazinbalg": (300, 708, "bellows-small", "magazine"),
    "windkammer-15": (620, 708, "plenum", "15 · vacuum"),
    "windkammer-17": (760, 708, "plenum", "17 · atmosphere"),
}

# Adjusters hang off the part they norm rather than sitting in the flow.
ADJUSTERS = {
    "bohrung-20": "ventil-22",
    "bohrung-29": "drossel-96",
    "bohrung-37": "membrankammer-35",
    "bohrung-46": "membrankammer-44",
    "bohrung-16": "windkammer-17",
    "drossel-98": "kondukte-39",
    "drossel-99": "kondukte-23",
}

# A membrane sits inside its chamber and a trunk conduit is the line itself, so a link that
# ends at one is drawn as ending at the part that carries it. Without this the relay chains
# break visibly: chamber 28 would reach its glide-block opening and stop, because the link on
# to valve 31 is stated of membrane 30.
PROXY = {
    "membran-36": "membrankammer-35",
    "membran-40": "membrankammer-41",
    "membran-45": "membrankammer-44",
    "membran-30": "membrankammer-28",
    "kondukte-14": "windkammer-15",
}

# Parts and concepts the drawing represents as something other than a box: conduits become
# the edges themselves, bores become markers on what they norm, membranes sit inside their
# chamber, and a latched function is a badge on the latch chamber.
DRAWN_OTHERWISE = set(ADJUSTERS) | {
    "kondukte-14", "kondukte-23", "kondukte-27", "kondukte-33", "kondukte-34",
    "kondukte-39", "kondukte-43", "kondukte-48", "kondukte-54",
    "membran-30", "membran-36", "membran-40", "membran-45",
    "gleitblock", "function-crescendo-on",
}

# Band titles sit in rows nothing else occupies. The relay's used to sit at y=330, on top
# of the glide-block opening for Sforzando on.
BANDS = [
    (50, 44, "from the roll"),
    (246, 44, "the relay"),
    (874, 44, "the bellows, and what it drives"),
    (50, 664, "the supply, common to every valve"),
]

# Properties whose sentence runs the opposite way from the flow. "53 is triggered by opening
# 8" is the right statement and the wrong arrow: on the page the perforation comes first.
REVERSED = {"triggered-by-opening"}

# How a link is drawn: what it carries, not merely that it exists.
FLOW = {
    "supplies-vacuum-to": "vacuum",
    "evacuates": "vacuum",
    "admits-air-to": "air",
    "supplies-atmosphere-to": "air",
    "actuates": "control",
    "arrests": "control",
    "opens-throttle": "control",
    "triggered-by-opening": "air",
    "holds-state-latched": "control",
    "releases-latch": "control",
}

TOPOLOGY = (
    "supplies-vacuum-to", "supplies-atmosphere-to", "evacuates", "admits-air-to",
    "actuates", "arrests", "opens-throttle", "triggered-by-opening", "holds-state-latched",
    "releases-latch",
)

# The drawing is Hagmann's T-100 as he describes it and as the project reads his plate, and
# nothing else. Brougher's screws and regulator are scoped to two instruments at once and
# are deliberately not identified with Hagmann's parts, so their links stay off the page.
DRAWN_FROM = ("hagmann-1984", "pfeffer-anhang13")

# Parts the drawing shows as something else: a container as its parts, an alias as the part
# it is identified with. Neither is a hole in the drawing.
STOOD_IN_FOR = {
    "relais", "tonpneumatik",
    "phillips-adjuster-crescendo-f", "phillips-adjuster-crescendo-p",
    "phillips-adjuster-forz-f", "phillips-adjuster-forz-p",
}

# What the simulation needs, as (subject, property base) pairs it looks up per half.
CONSTANTS = {
    "alpha": ("model-pneumatic", "flow-exponent"),
    "piano": ("nuancierbalg-90", "rail-open"),
    "forte": ("nuancierbalg-90", "rail-closed"),
    "mezzoforte": ("mezzofortebalg-93", "pin-centre"),
    "mfThickness": ("mezzofortebalg-93", "pin-thickness"),
    "crescendoRate": ("kondukte-39", "conductance-to-vacuum"),
    "crescendoTarget": ("function-crescendo-on", "flow-target"),
    "releaseRate": ("bohrung-100", "conductance-to-atmosphere"),
    "releaseTarget": ("state-slow-decrescendo", "flow-target"),
    "sforzandoRate": ("kondukte-23", "conductance-to-vacuum"),
    "sforzandoTarget": ("function-sforzando-on", "flow-target"),
    "sforzandoAssistRate": ("drossel-96", "conductance-to-atmosphere"),
    "tripThreshold": ("bohrung-20", "trip-threshold"),
    "membraneFillMs": ("membrankammer-28", "charge-time"),
    "assistFillMs": ("bohrung-29", "charge-time"),
    "valveTailMs": ("bohrung-29", "bleed-time"),
    "inertiaMs": ("kettenband", "moving-mass-time"),
    "valveBand": ("ventil-22", "valve-lift-band"),
}


# -- routing -------------------------------------------------------------------
#
# Orthogonal runs with rounded corners, which is how a pneumatic circuit is normally drawn,
# and one shared lane per source so that a chamber feeding five valves reads as a trunk with
# stubs rather than five lines laid over each other.

LANE_GAP = 16
AROUND = 22


class Anchor(NamedTuple):
    x: float
    y: float
    left: float
    right: float
    top: float
    bottom: float


def anchor(ident: str) -> Anchor:
    x, y, shape, _ = LAYOUT[ident]
    w, h = SHAPES.get(shape, (96, 30))
    return Anchor(x, y, x - w / 2, x + w / 2, y - h / 2, y + h / 2)


def columns() -> list[tuple[float, float]]:
    """The x-intervals the boxes occupy, merged, so the gaps between them are free."""
    spans = sorted((anchor(i).left, anchor(i).right) for i in LAYOUT)
    merged: list[list[float]] = []
    for left, right in spans:
        if merged and left <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], right)
        else:
            merged.append([left, right])
    return [(a, b) for a, b in merged]


def gutter_for(start: float, end: float) -> tuple[float, float] | None:
    """The free corridor between two columns, if the run crosses one."""
    bands = columns()
    for (_, right), (left, _) in zip(bands, bands[1:]):
        if right >= start - 1 and left <= end + 1:
            return right, left
    return None


def crosses_a_box(points: list[tuple[float, float]], skip: set[str]) -> list[str]:
    """Which parts a route runs through. Should always be empty."""
    hit = []
    for ident in LAYOUT:
        if ident in skip:
            continue
        box = anchor(ident)
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            lo_x, hi_x = sorted((x1, x2))
            lo_y, hi_y = sorted((y1, y2))
            if lo_x <= box.right and box.left <= hi_x and lo_y <= box.bottom and box.top <= hi_y:
                hit.append(ident)
                break
    return hit


def clear_h(x1: float, x2: float, y: float, skip: set[str]) -> bool:
    lo, hi = sorted((x1, x2))
    return not any(
        a.left <= hi and lo <= a.right and a.top <= y <= a.bottom
        for ident in LAYOUT if ident not in skip
        for a in (anchor(ident),)
    )


def clear_v(x: float, y1: float, y2: float, skip: set[str]) -> bool:
    lo, hi = sorted((y1, y2))
    return not any(
        a.top <= hi and lo <= a.bottom and a.left <= x <= a.right
        for ident in LAYOUT if ident not in skip
        for a in (anchor(ident),)
    )


def corridors() -> list[float]:
    """The horizontal lanes between rows of boxes, plus one below everything."""
    rows = sorted({(anchor(i).top, anchor(i).bottom) for i in LAYOUT})
    merged: list[list[float]] = []
    for top, bottom in rows:
        if merged and top <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], bottom)
        else:
            merged.append([top, bottom])
    lanes = [(a[1] + b[0]) / 2 for a, b in zip(merged, merged[1:]) if b[0] - a[1] > 18]
    return lanes + [merged[-1][1] + AROUND]


def route_all(drawn: list[dict]) -> None:
    lanes: dict[tuple[str, float], float] = {}
    taken: dict[float, list[float]] = {}
    bands = columns()

    def lane_in(gutter: tuple[float, float], source: str) -> float:
        key = (source, gutter[0])
        if key in lanes:
            return lanes[key]
        used = taken.setdefault(gutter[0], [])
        span = gutter[1] - gutter[0]
        step = min(LANE_GAP, max(6.0, span / (len(used) + 2)))
        lane = min(max(gutter[0] + 6 + len(used) * step, gutter[0] + 6), gutter[1] - 6)
        used.append(lane)
        lanes[key] = lane
        return lane

    for edge in drawn:
        a, b = anchor(edge["from"]), anchor(edge["to"])
        skip = {edge["from"], edge["to"]}
        points: list[tuple[float, float]] | None = None

        # Straight along a row or down a column, in whichever direction the target lies.
        if abs(a.y - b.y) <= 4:
            if b.left > a.right and clear_h(a.right, b.left, a.y, skip):
                points = [(a.right, a.y), (b.left, b.y)]
            elif a.left > b.right and clear_h(a.left, b.right, a.y, skip):
                points = [(a.left, a.y), (b.right, b.y)]
        if points is None and abs(a.x - b.x) <= 4:
            if b.top > a.bottom and clear_v(a.x, a.bottom, b.top, skip):
                points = [(a.x, a.bottom), (b.x, b.top)]
            elif a.top > b.bottom and clear_v(a.x, b.bottom, a.top, skip):
                points = [(a.x, a.top), (b.x, b.bottom)]

        # Otherwise a lane in a corridor between the two columns, taking the one nearest the
        # target first: a run that turns late crosses less.
        if points is None:
            low, high = sorted((a.x, b.x))
            gutters = [(right, left) for (_, right), (left, _) in zip(bands, bands[1:])
                       if right >= low - 1 and left <= high + 1]
            for gutter in (reversed(gutters) if b.x > a.x else gutters):
                lane = lane_in(gutter, edge["from"])
                out = a.right if lane > a.x else a.left
                into = b.left if lane < b.x else b.right
                if (clear_h(out, lane, a.y, skip) and clear_v(lane, a.y, b.y, skip)
                        and clear_h(lane, into, b.y, skip)):
                    points = [(out, a.y), (lane, a.y), (lane, b.y), (into, b.y)]
                    break

        # Failing that, out to the side, along a clear corridor, and in from above or below.
        if points is None:
            side = [(right, left) for (_, right), (left, _) in zip(bands, bands[1:])
                    if right >= a.right - 1] or [(a.right + 12, a.right + 28)]
            lane = lane_in(side[0], edge["from"])
            for y in sorted(corridors(), key=lambda c: abs(c - (a.y + b.y) / 2)):
                into = b.bottom if y > b.y else b.top
                if (clear_h(a.right, lane, a.y, skip) and clear_v(lane, a.y, y, skip)
                        and clear_h(lane, b.x, y, skip) and clear_v(b.x, y, into, skip)):
                    points = [(a.right, a.y), (lane, a.y), (lane, y), (b.x, y), (b.x, into)]
                    break

        if points is None:
            floor = max(anchor(i).bottom for i in LAYOUT) + AROUND
            points = [(a.x, a.bottom), (a.x, floor), (b.x, floor), (b.x, b.bottom)]

        edge["points"] = [[round(x, 1), round(y, 1)] for x, y in points]
        edge["blocked"] = crosses_a_box(points, skip)


def constants(corpus: Corpus) -> dict[str, dict[str, object]]:
    """Every simulation constant, with the statement it comes from."""
    by_key: dict[tuple[str, str], Statement] = {}
    for statement in corpus.statements():
        claim = statement.claim
        if isinstance(claim, Quantity):
            by_key[(claim.subject, claim.property)] = statement

    found: dict[str, dict[str, object]] = {}
    for name, (subject, base) in CONSTANTS.items():
        entry: dict[str, object] = {}
        for half in ("bass", "treble"):
            statement = by_key.get((subject, f"{base}-{half}"))
            if statement is None:
                continue
            entry[half] = statement.claim.value
            entry.setdefault("statements", {})[half] = statement.key  # type: ignore[union-attr]
        if entry:
            entry["subject"] = subject
            found[name] = entry
    return found


def edges(corpus: Corpus) -> tuple[list[dict[str, object]], dict[str, int]]:
    """The drawable links, and an account of the ones that are not boxes-and-arrows.

    A conduit is an edge, a bore is a marker on the part it norms, a membrane sits inside
    its chamber, and a latch points at a function rather than a part. None of those is a
    missing link; they are the same links drawn another way. Anything else would be a hole
    in the drawing and is counted separately so the page can say so.
    """
    drawn: list[dict[str, object]] = []
    seen: dict[tuple[str, str], dict[str, object]] = {}
    tally = {"shown-otherwise": 0, "not-drawn": 0}

    def add(source: str, target: str, kind: str, via: str, key: str,
            holds: str = "TRUE") -> None:
        """One line per pair of parts. Several statements can assert the same link — three
        do for the chain band — and the line carries all of them rather than being drawn
        three times over."""
        if source == target:
            tally["shown-otherwise"] += 1
            return
        flow = FLOW.get(kind, "control")
        existing = seen.get((source, target))
        if existing is not None:
            if key not in existing["statements"]:
                existing["statements"].append(key)
            if flow not in existing["carries"]:
                existing["carries"].append(flow)
            if holds != "TRUE":
                existing["holds"] = holds
            return
        edge = {"from": source, "to": target, "kind": kind, "via": via,
                "carries": [flow], "holds": holds,
                "statement": key, "statements": [key]}
        seen[(source, target)] = edge
        drawn.append(edge)

    for statement in corpus.statements():
        claim = statement.claim
        if statement.source not in DRAWN_FROM:
            continue
        if not isinstance(claim, Relation) or claim.property not in TOPOLOGY:
            continue
        subject, obj = claim.subject, claim.object
        if claim.property in REVERSED:
            subject, obj = obj, subject
        source = PROXY.get(subject, subject)
        target = PROXY.get(obj, obj)
        if source not in LAYOUT or target not in LAYOUT:
            elsewhere = {source, target} - set(LAYOUT)
            key = "shown-otherwise" if elsewhere <= DRAWN_OTHERWISE else "not-drawn"
            tally[key] += 1
            continue
        vias = [m for m in statement.mentions if m.startswith(("kondukte", "kettenband"))]
        via = vias[0] if vias else ""
        if via in LAYOUT:
            # A linkage that is itself drawn — the chain band — is a stop on the way, not a
            # label beside a line that jumps over it.
            standing = statement.holds.value if statement.holds else "TRUE"
            add(source, via, claim.property, "", statement.key, standing)
            add(via, target, claim.property, "", statement.key, standing)
        else:
            add(source, target, claim.property, via,
                statement.key, statement.holds.value if statement.holds else "TRUE")
    route_all(drawn)
    return drawn, tally


def view_box() -> str:
    """Snug to what is actually drawn, so the page is not padded with empty space."""
    left = right = top = bottom = None
    for x, y, shape, _ in LAYOUT.values():
        w, h = SHAPES.get(shape, (96, 30))
        drop = CAPTION_DROP if shape == "bellows" else 4
        left = x - w / 2 if left is None else min(left, x - w / 2)
        right = x + w / 2 if right is None else max(right, x + w / 2)
        top = y - h / 2 if top is None else min(top, y - h / 2)
        bottom = y + h / 2 + drop if bottom is None else max(bottom, y + h / 2 + drop)
    for x, y, _ in BANDS:
        left, top = min(left, x), min(top, y - 12)
    for x, y, _, _ in legend_places():
        left, bottom = min(left, x), max(bottom, y + 6)
    left, top = left - MARGIN, top - MARGIN
    return f"{left:g} {top:g} {right + MARGIN - left:g} {bottom + MARGIN - top:g}"


def legend_places() -> list[tuple[float, float, str, str]]:
    """Where each key sits, so the page places nothing the viewBox has not allowed for."""
    top = max(anchor(i).bottom for i in LAYOUT) + 34
    return [
        (50.0 + (i % LEGEND_COLUMNS) * LEGEND_COLUMN,
         top + (i // LEGEND_COLUMNS) * LEGEND_ROW, carries, text)
        for i, (carries, text) in enumerate(LEGEND)
    ]


def payload(corpus: Corpus) -> dict[str, object]:
    links, tally = edges(corpus)
    return {
        "viewBox": view_box(),
        "shapes": SHAPES,
        "nodes": [
            {"id": ident, "x": x, "y": y, "shape": shape, "caption": caption}
            for ident, (x, y, shape, caption) in LAYOUT.items()
        ],
        "adjusters": [{"id": a, "on": b} for a, b in ADJUSTERS.items() if b in LAYOUT],
        "bands": [{"x": x, "y": y, "title": t} for x, y, t in BANDS],
        "legend": [
            {"x": x, "y": y, "carries": carries, "text": text}
            for x, y, carries, text in legend_places()
        ],
        "edges": links,
        "linksDrawnOtherwise": tally["shown-otherwise"],
        "linksNotDrawn": tally["not-drawn"],
        "constants": constants(corpus),
    }


def unplaced(corpus: Corpus) -> Iterator[str]:
    """T-100 components the graph knows about that the schematic does not draw."""
    for item in corpus.entities:
        if item.kind.value == "component" and item.ident not in LAYOUT:
            if (item.ident not in DRAWN_OTHERWISE and item.ident not in STOOD_IN_FOR
                    and item.part_of != "welte-licensee-and-original"):
                yield item.ident
