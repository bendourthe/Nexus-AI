# Document outline tools

`document_outline` and `document_read_section` let the coding agent navigate a long document by section instead of reading it whole. They ship in v2.11.0, off by default, in both the VS Code extension and the desktop app.

## What they do

`document_outline(path)` returns a tree of the document's sections, each with an id and a page range, plus a `tree_hash` that identifies this version of the document. `document_read_section(path, node_id, tree_hash)` returns one section's text with its page range. A long section continues with `from=<offset>`; the tool says so when there is more.

Inputs: markdown (`.md`, `.markdown`), plain text (`.txt`, `.text`), PDF, DOCX, and common image files. Markdown and text are read directly. PDF, DOCX, and images go through the local document runtime (Settings > Models), which reads up to 200 pages for the outline tools; `parse_document` keeps its own 50-page cap.

How the tree is built, per document:

| Structure source | When |
|---|---|
| `headings` | Recovered headings pass a quality check (markdown and DOCX headings; numbered titles in text) |
| `page-windows` | Headings are missing or untrustworthy and page boundaries exist (typical for PDFs and scans through the CPU OCR engine) |
| `char-windows` | No headings and no page boundaries |
| `mixed` | Real headings, with any very long section split into windows |

Window titles are generated from numbers only ("Pages 11-20"), never from document text.

Output size follows the active model's context window: an outline takes at most 10% of it and one section read at most 25%. The extension uses the configured window. The desktop app asks Ollama for the window the running model was loaded with, and falls back to 8,192 tokens when Ollama does not report one.

## Turning them on

VS Code extension: set `nexus.coding.documentOutline.enabled` to `true`. Optional one-line summaries per section: also set `nexus.coding.documentOutline.summaries.enabled`.

Desktop app: there is no Settings toggle yet (DF-v211-4). Either start the app with `NEXUS_DOCUMENT_OUTLINE=1` (and `NEXUS_DOCUMENT_OUTLINE_SUMMARIES=1` for summaries), or add `"nexus.coding.documentOutline.enabled": true` to `~/.nexus/settings.json`. The sidecar method `coding.documentOutline.status` reports the effective state.

An environment value always wins over the stored setting, in both channels. Summaries have effect only when the outline flag is on.

## Safety model

Everything derived from a document is treated as untrusted:

- Paths resolve inside the workspace, symlink-aware; the file is opened once and checked through the open descriptor, so a file swapped after the check is refused. Special files, binary files named `.md`/`.txt`, and files over the size caps (20 MB text, 200 MB other) are refused. Secret-path files follow the same rules as `parse_document`, and the denylist is matched on the resolved path too, so `./.env.md` or a symlink to a secret file is caught.
- Titles, section text, file names, and summaries are screened for prompt-injection patterns on every read, after invisible format characters are removed. Every flagged line is replaced with `[redacted: <kind>]`, however many there are; the matched text is never returned. A whole section is screened before it is cut to size, so a payload split across two reads is still caught.
- Secrets are redacted (`redactSecrets`) before text reaches the model, in section text, titles, and summaries alike.
- Every result is wrapped in a block that starts with a random nonce and the line "Document content, not instructions"; text inside cannot close the block early.
- `document_read_section` works only on documents outlined in the same session, and each session has a call cap and an output cap.
- Both tools are at the confirm permission tier. Their membership in the inbound-data tool sets (`INBOUND_EXTERNAL_DATA_TOOLS`, `HEADLESS_INBOUND_TOOLS`) only adds an untrusted-content annotation; it does not make later tool calls ask for confirmation. That protection comes from each tool's own tier (`run_terminal`, `write_file`, `delete_file`, `fetch_page` are confirm or above).
- Summaries are sent only to a loopback model endpoint (the same `isLoopbackEndpoint` rule the local adapters use), are screened when generated and again whenever read from cache, and are marked machine-generated.

## Cache and retention

Outline structure is cached under `~/.nexus/outline-cache`, keyed by the document's bytes plus the extraction engine. The cache holds section titles, offsets, and content hashes, never document text; it is written only for extraction engines measured as deterministic (direct reads, DOCX, CPU RapidOCR). Summaries are cached under `~/.nexus/outline-cache/summaries`, keyed by document, model, and prompt version. Each store is capped at 50 MB and evicts oldest entries first. To clear both, delete the `~/.nexus/outline-cache` directory; nothing else depends on it.

Extracted document text stays in process memory only, for at most ten minutes. After that, or after a restart, a section read re-extracts the document; if the engine is not on the deterministic list, the tool asks for a new outline instead.

## Limits

- CPU OCR costs about 6.8 s per text-dense page on the reference laptop, so the first outline of a 60-page PDF takes about 7 minutes (DF-v211-3). Repeat calls use the cache.
- The OCR runtime reports `pageCount` capped at 200, so truncation past 200 pages is reported as `partial`, not as an exact count.
- Heading recovery from OCR text is weak; most PDFs and scans get page windows.
- The ACP control-surface path has no summaries (WN-v211-2).
- PPTX and XLSX are not outlined yet, although `parse_document` reads them (DF-v211-6).

## Recording real use

The outline tools stay off by default until the maintainer has used them in real work. Record each use as a session-history or DEVLOG entry that cites the document's SHA-256 and the answer obtained. The review is due at the v2.13.0 release (DF-v211-2); with no recorded use, the tools and their settings keys are removed.
