# Document Output

The experimental `document_outline` and `document_read_section` tools and their Settings controls have been retired following the owner's removal decision and the frozen evaluation fallback. They are absent from the extension, desktop, scheduled and ACP tool registries. This page retains its existing URL so older links still explain the outcome.

## Document Parsing

Generic OCR and `parse_document` remain available under their independent opt-in. In the desktop app, Settings > Security still offers "Enable parse_document for coding sessions". `NEXUS_PARSE_DOCUMENT` and `nexus.coding.parseDocument.enabled` retain their existing behavior. The removed outline settings and `NEXUS_DOCUMENT_OUTLINE` / `NEXUS_DOCUMENT_OUTLINE_SUMMARIES` environment variables cannot restore the retired tools.

`parse_document` reads up to 50 pages per call. Its extracted text is redacted, screened as untrusted content and sized against the active model's context window and the room left in the conversation. Use a smaller `max_pages` when output is truncated. This limit does not guarantee answer quality or increase the OCR runtime's own capabilities.

## Conversation Space

The output budget still uses backend prompt usage where available and a conservative fallback otherwise. It reserves room for the answer, applies a fixed-share ceiling and reports a nearly full window. The extension, desktop, scheduled runner and ACP preserve their active-model context lookup for document parsing.

Both agent loops retain tool-result compaction and native tool-history behavior. Native Ollama calls keep assistant tool calls and tool-role results. OpenAI-compatible paths and saved sessions retain their existing supported history representation; retirement does not claim to close their recorded native-history gaps.

## Retained Evidence

The frozen expanded evaluation found cross-section accuracy below the promotion threshold: Qwen 3.5 9B scored 0/20 and Gemma 4 12B scored 4/20. The owner selected removal, so no repeat of the futile benchmark is authorized by this change. Historical plans, raw measurements, fixtures and reports remain evidence of that result; they do not describe an enabled current feature. See the [evaluation record](../../archives/v2/v2.12/development/outline-eval.md).

Existing `~/.nexus/outline-cache` files and saved user preference keys are retained. Retirement neither reads those keys to enable tools nor deletes cached data. Restarting the app ends any old in-memory tool instances; the new composition cannot create outline tools. Standalone algorithm and historical fixture support may remain in source without a product registration.
