"""Region access to a Stanford IIIF Image API source, with an on-disk cache."""

from __future__ import annotations

import functools
import json
import platform
import ssl
import subprocess
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

STACKS = "https://stacks.stanford.edu/image/iiif"
USER_AGENT = "roll-nuance-tracer/0.1 (piano roll research)"
KEYCHAINS = (
    "/System/Library/Keychains/SystemRootCertificates.keychain",
    "/Library/Keychains/System.keychain",
)


@functools.lru_cache(maxsize=1)
def _ssl_context() -> ssl.SSLContext:
    """Trust what the machine trusts; python.org's bundle knows no local roots."""
    context = ssl.create_default_context()
    if platform.system() != "Darwin":
        return context
    for keychain in KEYCHAINS:
        exported = subprocess.run(
            ["security", "find-certificate", "-a", "-p", keychain],
            capture_output=True,
            text=True,
        )
        try:
            context.load_verify_locations(cadata=exported.stdout)
        except (ssl.SSLError, ValueError):
            continue
    return context


def fetch(url: str, timeout: float = 300.0) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout, context=_ssl_context()) as response:
        return response.read()


@dataclass(frozen=True, order=True)
class Region:
    x: int
    y: int
    width: int
    height: int

    def __str__(self) -> str:
        return f"{self.x},{self.y},{self.width},{self.height}"


@dataclass(frozen=True)
class RollImage:
    """One scanned roll behind the IIIF Image API."""

    druid: str
    width: int
    height: int
    cache_dir: Path
    image_format: str = "png"

    @classmethod
    def open(cls, druid: str, cache_dir: Path, image_format: str = "png") -> RollImage:
        info_path = cache_dir / druid / "info.json"
        if not info_path.exists():
            info_path.parent.mkdir(parents=True, exist_ok=True)
            info_path.write_bytes(fetch(f"{cls.base_url_for(druid)}/info.json"))
        info = json.loads(info_path.read_text())
        return cls(druid, info["width"], info["height"], cache_dir, image_format)

    @staticmethod
    def base_url_for(druid: str) -> str:
        return f"{STACKS}/{druid}%2F{druid}_0001"

    @property
    def base_url(self) -> str:
        return self.base_url_for(self.druid)

    def region(self, region: Region) -> np.ndarray:
        """RGB pixels of one region, fetched once and cached."""
        path = self.cache_dir / self.druid / f"{region}.{self.image_format}"
        if not path.exists():
            url = f"{self.base_url}/{region}/full/0/default.{self.image_format}"
            path.write_bytes(fetch(url))
        with Image.open(path) as image:
            return np.asarray(image.convert("RGB"))

    def squashed(self, region: Region, height: int) -> np.ndarray:
        """One region at full width but squashed vertically, for a whole-roll view."""
        path = self.cache_dir / self.druid / f"{region}@{height}.png"
        if not path.exists():
            url = f"{self.base_url}/{region}/{region.width},{height}/0/default.png"
            path.write_bytes(fetch(url))
        with Image.open(path) as image:
            return np.asarray(image.convert("RGB"))

    def thumbnail(self, width: int) -> np.ndarray:
        path = self.cache_dir / self.druid / f"thumb_{width}.png"
        if not path.exists():
            path.write_bytes(fetch(f"{self.base_url}/full/{width},/0/default.png"))
        with Image.open(path) as image:
            return np.asarray(image.convert("RGB"))


@dataclass
class BandReader:
    """Row-wise access to a fixed vertical band, assembled from cached chunks."""

    image: RollImage
    x: int
    width: int
    chunk_rows: int = 8000

    def __post_init__(self) -> None:
        self._loaded: dict[int, np.ndarray] = {}

    def _chunk(self, index: int) -> np.ndarray:
        if index not in self._loaded:
            top = index * self.chunk_rows
            height = min(self.chunk_rows, self.image.height - top)
            self._loaded[index] = self.image.region(Region(self.x, top, self.width, height))
            while len(self._loaded) > 2:
                self._loaded.pop(next(iter(self._loaded)))
        return self._loaded[index]

    def rows(self, start: int, stop: int) -> np.ndarray:
        stop = min(stop, self.image.height)
        indices = range(start // self.chunk_rows, (stop - 1) // self.chunk_rows + 1)
        pieces = [self._chunk(i) for i in indices]
        block = np.concatenate(pieces) if len(pieces) > 1 else pieces[0]
        offset = start - min(indices) * self.chunk_rows
        return block[offset:offset + (stop - start)]

    def prefetch(self, start: int, stop: int) -> None:
        for index in range(start // self.chunk_rows, (stop - 1) // self.chunk_rows + 1):
            self._chunk(index)
