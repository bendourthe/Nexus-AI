# Chat pillar capability bar

**Status**: living reference. Introduced in v2.6.0 Phase 1.
**Applies to**: every change that adds or changes a persistent control, a stored conversation, or rendered model output on the Chat pillar.
**Enforced by**: the v2.6.0 phase tests that cite this document, and by review against the items below. A release may call the Chat pillar done only when each item is observable as written here.

## Why this document exists

The Chat pillar is the daily-use surface and the entry point to the other pillars. Adoption reports can argue for a control because a hosted chat product has it. That is not a reason to ship it. This document states what "supported" means in a form a reader can check, the same way [model-acceptance.md](model-acceptance.md) states what "admitted" means for a model.

STRATEGY.md ranks the Chat pillar second of four. That rank was confirmed on 2026-09-26. A control that fails an item below is not a Chat-pillar feature yet, even if the screen shows something that looks like one.

## The bar

Each item says what a reader can check. It does not name the module that implements it.

### Message edit and regenerate

Supported means a user can change a previous user message and can ask for another assistant reply from that point, and both the original and the replacement remain addressable afterwards. A regenerate that overwrites the only copy of the previous reply is not supported.

v2.6.0 does not add this control. The item stays on the bar so a later plan cannot treat silence as a pass.

### Conversation branching

Supported means the user can start a second continuation from any message. Both continuations remain after the app restarts, the message they split from is unchanged, and the continuation that was active before restart is the one that is active after restart. A parent relation that lives only in component state is not supported, because a restart would forget which continuation was open.

A branch deeper than 8 is rejected. A parent that points at its own descendant is rejected. Deleting a message or a thread that other branches still cite is rejected. It is not silently cascaded.

### Thread export

Supported means the user can save the active continuation to a file the user chose. Sibling continuations are not folded into that file. The file names the message the continuation split from, when it split. Search still finds messages on continuations that were not exported. Delete of one continuation does not delete the others.

v2.6.0 exports a diagram (SVG and PNG), not a whole thread. Whole-thread export stays on the bar and is not claimed by this release.

### Per-category token accounting

Supported means the composer can show where the next request's context is going, and the parts add up. The invariant is `sum(known categories) + unaccounted = total`. An input the product cannot measure is shown as unknown and counted in `unaccounted`. It is never shown as zero. Cache-read and cache-creation counters are annotated beside the total. They are not added into it, because they overlap the prompt tokens they describe.

The readout measures the next request's projected payload, not a lifetime sum. Remaining capacity never renders below zero. When the total itself is unavailable, the readout is hidden.

### User-initiated compaction

Supported means the user can ask the product to shorten the thread, the most recent turns stay byte-for-byte the same, and the user can undo the last shortening. The action is refused while a reply is still streaming, while an automatic compaction holds the same lease, and when the thread is too short to benefit. A failed shortening leaves the thread untouched. The automatic path and the user path both take the same lease. The pre-compact hook observes that work. It does not perform it.

### Artifact rendering

Supported means a fenced Mermaid diagram in a message renders with readable text labels. Invalid syntax stays in the message as text. It does not blank the message. The HTML sanitiser's forbidden-tag list is one shared list. A second copy of that list is a failure of this item. Diagram output goes through a separate SVG sanitise that removes script, foreignObject, use, animate, set, and links. A `click` directive in the diagram source produces no link and no navigation.

### Keyboard reachability

Supported means every persistent control named below can be reached and activated with the keyboard alone, and exposes an accessible name a screen reader can announce. A control that appears only on pointer hover, with no focus path, is not supported.

## Persistent controls

Three controls land on the message surface or the composer in v2.6.0. Two more appear only on a rendered diagram. Each has a default-visibility rule and an empty-state rule.

| Control | Default visibility | Empty state |
|---|---|---|
| Branch affordance | A message shows "Branch from here" when it can be branched. When the open thread has sibling continuations, the sibling switcher stays visible and announces which continuation is active. | A new thread with no siblings does not show a switcher. The branch button is still present on each message so the keyboard can reach it. A fresh install with zero threads shows the existing empty composer and no branch chrome. |
| Context readout | Visible when projected usage is at least half the window, or when `unaccounted` is greater than zero. Hidden when the total is unavailable. | A fresh install with zero threads, and an empty thread at zero usage, shows no readout. |
| Compact control | Visible only while the context readout is visible, and placed next to it. | Hidden on an empty thread. When a reply is streaming, or the thread is too short, the control stays visible only if the readout is visible, and it is disabled with the reason in its accessible name. |
| Diagram export | Visible on a rendered diagram. PNG is the default format. | Absent on a message that has no diagram. |
| Diagram versions | Visible when the diagram has more than one retained version. The index is the version id, not the position in a list. | A diagram with one version shows no switcher. When older versions were pruned, the switcher says that older versions were pruned. |

### Branches under export, search, and delete

Export of a diagram writes that diagram only. It does not attach sibling threads. Search returns hits from every continuation and labels the continuation they belong to. Delete of a continuation removes that continuation. Delete of a parent that still has continuations is refused, and the user is told why. If the organizer cannot find a continuation's parent, the continuation is listed at the root with a marker that the parent is missing. It is not hidden.

## How a phase maps onto this bar

| Remaining phase | Bar item it must make observable |
|---|---|
| Phase 2, conversation forking | Conversation branching, and the branch affordance row above |
| Phase 3, Mermaid rendering | Artifact rendering |
| Phase 4, versioning and export | Diagram export and diagram versions. Thread export of a whole conversation is not this phase. |
| Phase 5, context pressure and compaction | Per-category token accounting and user-initiated compaction, and the readout and compact rows above |
| Keyboard reachability | Every control those phases add |

Message edit and regenerate, and whole-thread export, remain on the bar and are outside this plan.
