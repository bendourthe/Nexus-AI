# Nexus Documentation

This is the living entry point for Nexus documentation. Active release plans and evidence live under `docs/releases/`; closed historical material lives under `docs/archive/`. Older unmigrated release documents remain under `docs/v2/`.

## Living documentation

- [Product and operator handbooks](handbooks/README.md)
- [Architecture decisions](decisions/README.md)
- [Generated module catalog](index.md)
- [Reference material](reference/)
- [Development log](DEVLOG.md)
- [Progress tracker](todos.md)

Markdown is the source of truth. Generated handbook HTML is checked with `npm run docs:handbooks:check`.

## Known-gaps triage

The [v2.15.0 last-phase evidence](releases/v2/v2.15/development/v2.15.0-last-phase-evidence.md) covers the conversion of the v1.17 to v2.12 gap files, the triage of the 47 items open in v2.12 and the follow-up batches for the older ones; what is still owed is in the [v2.15 known gaps](releases/v2/v2.15/known-gaps.md) and the [follow-up batch list](releases/v2/v2.15/development/v2.15.0-followup-batches.md).

## Spoken replies and the LFM2.5 24B worker

The [v2.14.2 last-phase evidence](archives/v2/v2.14/development/v2.14.2-last-phase-evidence.md) covers streamed spoken replies, the opt-in LFM2.5 24B-A2B entry and their measured results; open items are in the [v2.15 known gaps](releases/v2/v2.15/known-gaps.md).

## Local rewrite evaluation

The [v2.14.1 evaluation](archives/v2/v2.14/development/v2.14.1-rewrite-baseline.md) records a bounded HOLD attempt and its missing outputs. Use the frozen validation/scoring commands in the [contract companion](archives/v2/v2.14/development/v2.14.1-rewrite-contract.md); do not repeat this experiment.
