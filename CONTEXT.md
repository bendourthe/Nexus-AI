# Nexus domain glossary

Ubiquitous language only. Architecture lives in `AGENTS.md` and `ARCHITECTURE.md`.

## Document outline

**Definition**: A tree of the headings of one parsed document, with a page range and character range per node, built locally from `parse_document` output and valid only for the content hash it was built from.

**Avoid**: table of contents index, page index, vector index, document map

**Relationships**: Narrower than a parsed document. Not the same as memory retrieval (`HybridRetriever` searches memory rows, an outline navigates one document). Not the same as the code graph (`codegraph_*` indexes symbols).

## Section

**Definition**: The text between one outline node's start and end offsets, read through `document_read_section` with its page range.

**Avoid**: chunk, passage, snippet

**Relationships**: A leaf or branch of a document outline. Not the same as a memory chunk, which has no stored position in the source document.


## Rewrite adaptation

**Definition**: An explicitly frozen text-only instruction set derived from installed editing guidance for one local model request.

**Avoid**: full skill execution, model fine-tune

**Relationships**: Uses editing guidance and produces a candidate rewrite; narrower than the complete installed skill workflow.

## Literal obligation

**Definition**: A fixture-declared exact text and occurrence requirement checked against the decoded rewrite.

**Avoid**: fact guarantee, semantic proof

**Relationships**: A deterministic preservation check, separate from semantic and readability review.

## Carry-forward register

**Definition**: The ledger `docs/v2/v2.12/known-gaps.md` that collected open items from archived minors at the v2.11 and v2.13 closes, one row per item with a link to its archived record.

**Avoid**: master gap list, backlog, index

**Relationships**: A known-gaps ledger. Not complete: it carries 23 of the 205 archived open items by id (measured 2026-10-19). Not the same as the active minor's ledger.

## Archived-only item

**Definition**: An open item in an archived known-gaps ledger that no active ledger or the carry-forward register carries.

**Avoid**: orphan gap, lost gap, dead gap

**Relationships**: The opposite of a superseded entry. Triaged in batches by follow-up plans after v2.15.0.

## Superseded entry

**Definition**: An archived ledger entry whose owed work is carried by a register or active-ledger entry, marked `CLOSED` with a pointer to that entry.

**Avoid**: duplicate, merged gap, migrated duplicate

**Relationships**: Closed for the checker; the work itself stays owed through the entry it points to. Not the same as a migrated entry, which carries a verified "Migrated from" line.

## Legacy cutoff

**Definition**: The oldest minor whose known-gaps ledger the completion checker evaluates; ledgers older than it (v0.7 and v1.0 to v1.3) are historical and do not gate a minor run.

**Avoid**: archive exclusion, ignore list

**Relationships**: A Nexus-Hub checker setting requested in the v2.15.0 handoff. Never used to hide an item a parseable ledger still owes.
