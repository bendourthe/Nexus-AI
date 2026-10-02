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
