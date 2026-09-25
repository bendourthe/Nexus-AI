# Skill placement decision (Phase 3.1)

**Decision: option B.** The self-driving skill lives at `modules/coding/skills/catalog/nexus/SKILL.md`.

`NexusHubSyncer` writes only under `catalogRoot()`, which `core/storage/paths.ts` resolves to `~/.nexus-ai/catalog/` (or `NEXUS_AI_HOME`). `sync --apply` replaces that managed tree from the Hub manifest. A file added by hand inside that tree is not part of `MANIFEST.sha256` and the next apply can delete it.

`modules/coding/skills/catalog/` is inside this repository. Sync never receives that path as `catalogRoot` unless a caller overrides it, and the default does not. The skill therefore ships with the Nexus release that introduces the commands it documents, and a later `nexus skills sync --apply` does not remove it.

Option A (author it only in Nexus-Hub) would publish the skill on Hub's cadence, after this release. Option C (both copies) would drift. Neither is used.
