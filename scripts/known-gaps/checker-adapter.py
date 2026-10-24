#!/usr/bin/env python3
"""Pinned adapter to the Nexus-Hub completion checker's ledger parser (v2.15.0).

This is the one place in the repository that imports the checker. It verifies
the sha256 of the checker and of every sibling module it imports against the pins
below (the checker's pin is recorded in
docs/archives/v2/v2.15/development/v2.15.0-ledger-conversion-decisions.md), so a
checker change is never absorbed unnoticed: on a mismatch it prints both hashes
and exits 3. Each module is compiled from the bytes that were hashed, never from
a cached .pyc, and the checker's directory is never put on sys.path, so an
unpinned import fails instead of running.

Usage:
    python scripts/known-gaps/checker-adapter.py discover [--root DIR]
    python scripts/known-gaps/checker-adapter.py parse PATH [PATH ...]
    python scripts/known-gaps/checker-adapter.py parse --stdin
    python scripts/known-gaps/checker-adapter.py verify-migrations [--root DIR]

Every mode prints one JSON object on stdout. `discover` reads every ledger the
checker's `load_ledgers` finds; `parse` reads the given files (or stdin) with
`parse_ledger_full`. `verify-migrations` runs the checker's `migration_copy_status`
for every migrated item. Pass `--checker FILE` to point at another copy of the
checker; the pins still apply. `verify-migrations` also loads the siblings the
checker's migration check imports (`check_plan_completion.py`, `minor_close.py`).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from types import ModuleType

PINNED_SHA256 = "f1689e72b6f96835bb9eda7bd68280e63fbb0c4c644a2e45f8cff19a693cdfd4"
# Every sibling module the checker imports, in the order they must load.
SIBLING_PINS = {
    "approval_page": "7d8ceb03c96150dd75e2221f677700678e89e543d3e9662093ada917ed1ad53e",
    "approval_binding": "e3bf9464ce0361cc1b59e40b8bafb2d8717861e0557c4a6bc20b8e52bba5fae1",
}
# Loaded after the checker, only for verify-migrations (imported lazily there).
MIGRATION_PINS = {
    "check_plan_completion": "de1f1fa9f977baec65322ca338b52964f07238b516cbd754fd51b90a358bf4eb",
    "minor_close": "83693da42d4ae06463c83c22daf46bfa7b85cc6a85d4a909bd649b6c1cdd4abd",
}
DEFAULT_CHECKER = Path.home() / ".nexus-hub" / "scripts" / "completion_minor.py"
EXIT_PIN_MISMATCH = 3
EXIT_MISSING = 4


def load_pinned(name: str, path: Path, pinned: str) -> ModuleType:
    """Execute the exact bytes whose sha256 matches `pinned` as module `name`."""
    if not path.is_file():
        print(f"{name} not found: {path}", file=sys.stderr)
        sys.exit(EXIT_MISSING)
    source = path.read_bytes()
    actual = hashlib.sha256(source).hexdigest()
    if actual != pinned:
        print(
            f"{path.name} sha256 mismatch: pinned {pinned}, found {actual} at {path}",
            file=sys.stderr,
        )
        sys.exit(EXIT_PIN_MISMATCH)
    module = ModuleType(name)
    module.__file__ = str(path)
    sys.modules[name] = module
    exec(compile(source, str(path), "exec"), module.__dict__)  # noqa: S102 - pinned bytes
    return module


def load_checker(path: Path, migrations: bool = False) -> ModuleType:
    """Load the checker and its pinned siblings; exit on a missing or changed file."""
    sys.dont_write_bytecode = True
    # The checker's own pin is checked first, so a changed checker always reads
    # as a mismatch (exit 3), whatever state its siblings are in.
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
    for name, pinned in SIBLING_PINS.items():
        load_pinned(name, path.parent / f"{name}.py", pinned)
    checker = load_pinned("completion_minor", path, PINNED_SHA256)
    if migrations:
        for name, pinned in MIGRATION_PINS.items():
            load_pinned(name, path.parent / f"{name}.py", pinned)
    return checker


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


def verify_migrations(checker: ModuleType, root: Path) -> dict:
    ledgers, _ = checker.load_ledgers(root)
    results = []
    for ledger in ledgers:
        for item in ledger.items:
            if item.state != "migrated":
                continue
            status, found = checker.migration_copy_status(
                ledgers, item.target, ledger, item
            )
            results.append(
                {
                    "source": ledger.rel,
                    "id": item.gid,
                    "target": item.target,
                    "status": status,
                    "copy": f"{found[0].rel}#{found[1].gid}" if found else None,
                }
            )
    return {"pin": PINNED_SHA256, "migrations": results}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--checker", type=Path, default=DEFAULT_CHECKER)
    sub = parser.add_subparsers(dest="mode", required=True)
    disc = sub.add_parser("discover")
    disc.add_argument("--root", type=Path, default=Path("."))
    prs = sub.add_parser("parse")
    prs.add_argument("paths", nargs="*")
    prs.add_argument("--stdin", action="store_true")
    ver = sub.add_parser("verify-migrations")
    ver.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args(argv)

    checker = load_checker(args.checker, migrations=args.mode == "verify-migrations")
    if args.mode == "discover":
        result = discover(checker, args.root.resolve())
    elif args.mode == "verify-migrations":
        result = verify_migrations(checker, args.root.resolve())
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
