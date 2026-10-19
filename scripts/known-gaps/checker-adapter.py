#!/usr/bin/env python3
"""Pinned adapter to the Nexus-Hub completion checker's ledger parser (v2.15.0).

This is the one place in the repository that imports the checker. It verifies
the checker file's sha256 against the pin recorded in
docs/releases/v2/v2.15/development/v2.15.0-ledger-conversion-decisions.md before
importing it, so a checker change is never absorbed unnoticed: on a mismatch it
prints both hashes and exits 3.

Usage:
    python scripts/known-gaps/checker-adapter.py discover [--root DIR]
    python scripts/known-gaps/checker-adapter.py parse PATH [PATH ...]
    python scripts/known-gaps/checker-adapter.py parse --stdin

Every mode prints one JSON object on stdout. `discover` reads every ledger the
checker's `load_ledgers` finds; `parse` reads the given files (or stdin) with
`parse_ledger_full`. Pass `--checker FILE` to point at another copy of the
checker; the pin still applies.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

PINNED_SHA256 = "f1689e72b6f96835bb9eda7bd68280e63fbb0c4c644a2e45f8cff19a693cdfd4"
DEFAULT_CHECKER = Path.home() / ".nexus-hub" / "scripts" / "completion_minor.py"
EXIT_PIN_MISMATCH = 3
EXIT_MISSING = 4


def load_checker(path: Path) -> ModuleType:
    """Import the checker after verifying its pin; exit on a missing or changed file."""
    if not path.is_file():
        print(f"checker not found: {path}", file=sys.stderr)
        sys.exit(EXIT_MISSING)
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != PINNED_SHA256:
        print(
            f"checker sha256 mismatch: pinned {PINNED_SHA256}, found {actual} at {path}",
            file=sys.stderr,
        )
        sys.exit(EXIT_PIN_MISMATCH)
    # The checker imports its sibling modules lazily, so its directory must be importable.
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location("completion_minor", path)
    if spec is None or spec.loader is None:
        print(f"checker not importable: {path}", file=sys.stderr)
        sys.exit(EXIT_MISSING)
    module = importlib.util.module_from_spec(spec)
    sys.modules["completion_minor"] = module
    spec.loader.exec_module(module)
    return module


def item_json(item) -> dict:
    return {
        "id": item.gid,
        "kind": item.kind,
        "title": item.title,
        "state": item.state,
        "target": item.target,
        "section": item.section,
        "subsection": item.subsection,
        "level": item.level,
        "body": item.body,
    }


def parsed(checker: ModuleType, text: str) -> dict:
    items, problems = checker.parse_ledger_full(text)
    return {"items": [item_json(i) for i in items], "problems": problems}


def discover(checker: ModuleType, root: Path) -> dict:
    ledgers, unreadable = checker.load_ledgers(root)
    return {
        "pin": PINNED_SHA256,
        "unreadable": unreadable,
        "ledgers": [
            {
                "path": ledger.rel,
                "minor": ledger.token(),
                "layout": ledger.layout,
                "items": [item_json(i) for i in ledger.items],
                "problems": ledger.problems,
            }
            for ledger in ledgers
        ],
    }


def parse_files(checker: ModuleType, paths: list[str]) -> dict:
    files = []
    unreadable = []
    for raw in paths:
        try:
            with Path(raw).open("r", encoding="utf-8", newline="") as handle:
                text = handle.read()
        except (OSError, UnicodeDecodeError):
            unreadable.append(raw)
            continue
        files.append({"path": raw, **parsed(checker, text)})
    return {"pin": PINNED_SHA256, "unreadable": unreadable, "files": files}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--checker", type=Path, default=DEFAULT_CHECKER)
    sub = parser.add_subparsers(dest="mode", required=True)
    disc = sub.add_parser("discover")
    disc.add_argument("--root", type=Path, default=Path("."))
    prs = sub.add_parser("parse")
    prs.add_argument("paths", nargs="*")
    prs.add_argument("--stdin", action="store_true")
    args = parser.parse_args(argv)

    checker = load_checker(args.checker)
    if args.mode == "discover":
        result = discover(checker, args.root.resolve())
    elif args.stdin:
        text = sys.stdin.buffer.read().decode("utf-8")
        result = {
            "pin": PINNED_SHA256,
            "unreadable": [],
            "files": [{"path": "-", **parsed(checker, text)}],
        }
    else:
        result = parse_files(checker, args.paths)
    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
