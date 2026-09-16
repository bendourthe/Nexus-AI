# Nexus Strategy Anchor

**Status**: v1 draft, 2026-09-15
**Purpose**: the document plans are ranked against. When a plan cannot name the Target Problem it serves, the Persona it serves it for, and the Key Metric it moves, that is a finding about the plan.
**Authored because**: the v2.5.1 plan review found that with no anchor in the repository, "a comparison report listed it" was the strongest available prioritization argument for user-facing work. That is a ranking failure, not a planning failure.

Sections 1, 2, 3 and 6 are derived from what the repository already asserts (README "Design Principles", "The Four Pillars", "Roadmap", "Collaboration") and are low-risk. **Sections 4 and 5 are genuine product judgements that the repository does not state anywhere**, so they are marked as proposed and need the owner's confirmation before they are used to rank anything.

---

## 1. Target Problem

Generative AI that is actually useful for building things (code, conversation, images, short video) is delivered almost exclusively as a metered remote service. That imposes four costs on the person doing the work: their source code and conversations leave their machine, they need an account and API keys, they pay per token forever, and the capability disappears when the vendor changes terms, pricing, or the model behind an endpoint.

Nexus exists so that one person on one machine can do all four kinds of generative work with none of those four costs, against open-weight models they hold locally.

## 2. Persona

**Primary: the solo builder.** One developer or creator running Nexus on their own machine, single consumer GPU (RTX 3070 to 4090 class per README Design Principle 3), Windows x64 as the packaged target. They are technical enough to install a desktop app and pick a model, and they are the same person for all four pillars. They have no team, no account, and no budget line for inference.

**Secondary: the maintainer.** The person deciding whether a build is fit to ship. In practice the same human as the primary persona, which is precisely why their needs must be written down separately: shipping confidence and shipping speed pull in opposite directions, and when one person holds both roles the conflict resolves silently rather than deliberately.

**Explicitly not the persona**: teams, multi-user deployments, hosted or shared instances, organizations with compliance requirements. The README's "Safety and Use in Regulated Industries" section governs that boundary, and Collaboration states Nexus is a curated project that does not generally take outside pull requests.

## 3. Approach

Six principles, restated from the README as the durable source rather than reinvented here:

1. **Local-first.** Inference, embeddings, synthesis and memory all run on the host. No outbound calls without explicit user opt-in.
2. **Originality over wrappers.** When an external service can be reverse-engineered into a lean local module, do that. Governed by the MCP Registry Policy in `AGENTS.md`.
3. **Single-GPU ceiling.** Every pillar runs on one consumer GPU. Hardware tiers are detected at install and budgets adapt.
4. **Installer carries the burden where supported.** Provisioning the runtime, models and app is the installer's job, not the user's.
5. **Privacy by construction.** Secrets are redacted before indexing; telemetry and logs are local-only by default.
6. **Qualified OS support.** Windows x64 is the packaged desktop target; the optional VSIX covers more.

## 4. Pillar priority (PROPOSED - needs owner confirmation)

The four pillars are not equally load-bearing, but the repository has never said so, which is why adoption reports have been able to argue for work by citing a peer rather than a user. A proposed ranking:

| Rank | Pillar | Why |
|---|---|---|
| 1 | **Agentic AI Coding** | The oldest, deepest surface and the one with a second delivery channel (the VSIX). It is also the pillar whose absence would make Nexus a toy. |
| 2 | **Chatbot Explorer** | The daily-use surface and the entry point for everything else, but its gaps are affordances rather than capability holes. |
| 3 | **Image Studio** | Differentiated and GPU-heavy; the pillar most exposed to the single-GPU ceiling. |
| 4 | **Video Lab** | Newest and most expensive per unit of output; the most defensible place to ship less. |

**Why this needs confirming**: rank 2 is exactly the question the v2.5.1 review raised. If Chat ranks second, its missing affordances (branching, diagram rendering, context control) are legitimate work. If Chat ranks lower, several of them should be dropped rather than sequenced, because they were adopted from a comparison against a product whose entire reason for existing is chat.

## 5. Key Metrics (PROPOSED - needs owner confirmation)

A zero-outbound, single-user product cannot measure adoption, retention or engagement, and pretending otherwise would be the fastest way to build a telemetry pipeline that contradicts Design Principle 1. So these are **maintainer-observed acceptance judgements, not instrumented metrics**, and they are written as pass/fail conditions a human checks at release time.

| # | Metric | How it is observed | Why it is the right one |
|---|---|---|---|
| M1 | A clean machine reaches a working generation with no manual intervention | Clean-machine installer rehearsal, already tracked as `IO.P2.A` | If install fails, nothing else matters |
| M2 | Every pillar runs within budget on the reference GPU | Operator checklist on reference hardware | Design Principle 3 is the product's hardest constraint |
| M3 | The packaged bundle makes zero non-loopback connections in ordinary use | Automated assertion in the packaged smoke | Design Principle 1 is currently asserted but never measured |
| M4 | Field-reported defects per release trend down | Issue templates stamp the build version (adopted v2.4.9) | The stated blocker on the v2.4 line is field reliability |
| M5 | A shipped capability is used by the maintainer in real work within two release cycles, or is removed | Honest self-report | The only available defense against building features because a peer had them |

M3 and M5 are new. M3 turns the product's central claim into something a test can fail. M5 is deliberately uncomfortable: it is the cost of having no usage data.

## 6. Non-Goals

- Multi-user, teams, accounts, sharing, or hosted deployment.
- Any per-token billing, paid tier, sponsor gate, or star gate (README Roadmap states this outright).
- Any runtime dependency on a third-party data processor, search service, embedding service, or generation service. Governed by the MCP Registry Policy decision tree in `AGENTS.md`.
- Feature parity with any specific competitor. Comparison reports are input to ranking, never a justification on their own.

---

## How plans use this file

A plan's Goals-First section names: the Target Problem it serves, the Persona, and which Key Metric it moves. A plan that moves no metric and serves no persona is either mis-scoped or the anchor needs amending. Amend deliberately by editing this file with a dated note, never by quietly planning around it.

Related: [[product-strategy]] owns this document's shape. [[implementation-plan]] reads it during grounding. [[plan-review]]'s product lens judges plans against it.
