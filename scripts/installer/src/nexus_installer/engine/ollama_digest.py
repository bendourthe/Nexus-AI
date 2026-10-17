"""v2.14.0 T016 -- verify an Ollama ``hf.co`` pull against its pinned GGUF digest.

Mirrors ``core/registry/ollamaDigest.ts`` for the installer channel. An
``ollama://hf.co/<org>/<repo>:<quant>`` tag follows the repository head, so the
bytes Ollama pulls can change after the catalog pinned them. An entry that pins a
commit (``source.revision``) and exactly one ``.gguf`` file in ``weights.files``
is checked after the pull: the
model layer's digest in Ollama's on-disk manifest must equal the pinned sha256.
On a mismatch the pulled model is removed and the install fails closed.
Entries without such a pin are not checked.
"""

from __future__ import annotations

import contextlib
import json
import os
import re
import subprocess
from collections.abc import Callable
from pathlib import Path

MODEL_LAYER = "application/vnd.ollama.image.model"
_SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
_PLACEHOLDER = "0" * 64
_REVISION_RE = re.compile(r"^[a-f0-9]{40}$")


def pinned_gguf_digest(entry: dict | None) -> str | None:
    """The pinned GGUF sha256 of an ``hf.co`` Ollama entry, or None.

    An id with no catalog entry (``None``) pins nothing and is not checked.
    """
    if not isinstance(entry, dict):
        return None
    source = entry.get("source") or {}
    url = str(source.get("url") or "")
    if source.get("protocol") != "ollama" or not url.startswith("ollama://hf.co/"):
        return None
    if not _REVISION_RE.match(str(source.get("revision") or "")):
        return None
    files = (entry.get("weights") or {}).get("files") or []
    ggufs = [f for f in files if str(f.get("path", "")).lower().endswith(".gguf")]
    if len(ggufs) != 1:
        return None
    sha = str(ggufs[0].get("sha256", "")).lower()
    return sha if _SHA256_RE.match(sha) and sha != _PLACEHOLDER else None


def ollama_models_dir() -> Path:
    override = os.environ.get("OLLAMA_MODELS")
    return Path(override) if override else Path.home() / ".ollama" / "models"


def manifest_path(model_tag: str, models_dir: Path) -> Path:
    name, sep, tag = model_tag.rpartition(":")
    if not sep:
        name, tag = model_tag, "latest"
    return models_dir.joinpath("manifests", *name.split("/"), tag)


def manifest_candidates(model_tag: str, models_dir: Path) -> list[Path]:
    """As written, then with the repository path lowercased (some Ollama
    versions store ``hf.co`` names that way on case-sensitive filesystems)."""
    name, sep, tag = model_tag.rpartition(":")
    lowered = f"{name.lower()}:{tag}" if sep else model_tag.lower()
    paths = [manifest_path(model_tag, models_dir), manifest_path(lowered, models_dir)]
    # Keyed by text: Windows paths compare case-insensitively.
    return list({str(path): path for path in paths}.values())


def read_model_digest(model_tag: str, models_dir: Path | None = None) -> str | None:
    """The model layer's sha256 from a pulled tag's manifest, or None."""
    manifest = None
    for path in manifest_candidates(model_tag, models_dir or ollama_models_dir()):
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
            break
        except (OSError, ValueError):
            continue
    if not isinstance(manifest, dict):
        return None
    for layer in manifest.get("layers") or []:
        if layer.get("mediaType") == MODEL_LAYER:
            digest = str(layer.get("digest", "")).removeprefix("sha256:").lower()
            return digest if _SHA256_RE.match(digest) else None
    return None


def remove_model(model_tag: str) -> None:
    subprocess.run(
        ["ollama", "rm", model_tag], capture_output=True, timeout=120, check=True
    )


def verify_pull(
    entry: dict | None,
    model_tag: str,
    read_digest: Callable[[str], str | None] = read_model_digest,
    remove: Callable[[str], None] = remove_model,
) -> str | None:
    """None when the pull is accepted; otherwise a failure reason (model removed)."""
    expected = pinned_gguf_digest(entry)
    if expected is None:
        return None
    actual = read_digest(model_tag)
    if actual == expected:
        return None
    removed = False
    with contextlib.suppress(OSError, subprocess.SubprocessError):
        remove(model_tag)
        removed = True
    outcome = (
        "the model was removed"
        if removed
        else "removing it failed, so remove it before use"
    )
    if actual is None:
        return (
            f"pulled {model_tag} has no readable GGUF digest in Ollama's manifest; "
            f"{outcome}"
        )
    return (
        f"pulled {model_tag} has GGUF digest {actual}, but the catalog pins "
        f"{expected}; {outcome}"
    )
