"""v2.14.0 T001 -- regenerate the synthetic voice-latency utterance fixtures.

The utterances are Kokoro speech of fixed scripts, never recordings of a
person. Run from the repo root with the provisioned audio venv:

    <audio-venv-python> tests/fixtures/voice/generate_fixtures.py

It rewrites `<id>.wav` and `manifest.json` beside this file. Requires the
installed `kokoro-82m` weights; it never downloads anything.
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[2]))

from runtimes.audio import engines  # noqa: E402

# Each script asks for a reply of a known size class. "medium" is the plan's
# reference fixture: about three sentences, one code block and one link.
SCRIPTS = {
    "short": "What is the capital of France? Answer in one short sentence.",
    "medium": (
        "In about three sentences, explain what a TypeScript interface is. "
        "Include one short code block and one link to the TypeScript handbook."
    ),
    "long": (
        "In about eight sentences, explain how a hash map works, "
        "including collisions and resizing."
    ),
}


def main() -> None:
    entries = []
    for fixture_id, script in SCRIPTS.items():
        wav = base64.b64decode(engines.speak({"text": script})["audioBase64"])
        (HERE / f"{fixture_id}.wav").write_bytes(wav)
        entries.append(
            {
                "id": fixture_id,
                "wav": f"{fixture_id}.wav",
                "script": script,
                "sha256": hashlib.sha256(wav).hexdigest(),
                "bytes": len(wav),
            }
        )
    manifest = {"schemaVersion": 1, "voice": engines.KOKORO_VOICE, "fixtures": entries}
    (HERE / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(entries)} fixtures to {HERE}")


if __name__ == "__main__":
    main()
