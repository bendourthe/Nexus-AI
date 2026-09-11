/**
 * v2.4.9 -- a small, safe Markdown preview for the persona editor.
 *
 * The repo ships no Markdown dependency, and adding one for a preview pane is
 * not worth the bundle or the supply-chain surface. This covers the structure
 * a persona actually uses -- headings, lists, code, emphasis, links -- and
 * renders REACT ELEMENTS rather than an HTML string, so there is no
 * `dangerouslySetInnerHTML` and nothing to sanitize: unsupported syntax simply
 * shows as the literal text the author typed.
 *
 * It is deliberately not a full CommonMark implementation. If persona text
 * ever needs tables or footnotes, reach for a real parser rather than growing
 * this one; a half-complete parser that looks complete is the trap here.
 */

import type { JSX, ReactNode } from "react";

export interface MarkdownPreviewProps {
  readonly markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps): JSX.Element {
  return (
    <div data-testid="markdown-preview" style={{ display: "flex", flexDirection: "column", gap: "0.6em" }}>
      {renderBlocks(markdown)}
    </div>
  );
}

/** Split into blocks and render each. Exported for tests. */
export function renderBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code: everything until the closing fence is literal.
    if (/^```/.test(line.trim())) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? "").trim())) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // consume the closing fence
      out.push(
        <pre key={key++} style={preStyle}>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const size = [1.5, 1.3, 1.15, 1.05, 1, 1][level - 1] ?? 1;
      out.push(
        <div
          key={key++}
          role="heading"
          aria-level={level}
          style={{ fontSize: `${size}em`, fontWeight: 600, color: "var(--fg-0)" }}
        >
          {renderInline(heading[2] ?? "")}
        </div>,
      );
      i += 1;
      continue;
    }

    // A run of list items becomes one list.
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*([-*+]|\d+\.)\s+/, ""));
        i += 1;
      }
      const children = items.map((item, n) => <li key={n}>{renderInline(item)}</li>);
      out.push(
        ordered ? (
          <ol key={key++} style={listStyle}>
            {children}
          </ol>
        ) : (
          <ul key={key++} style={listStyle}>
            {children}
          </ul>
        ),
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Otherwise a paragraph: consecutive non-blank, non-structural lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,6})\s+/.test(lines[i] ?? "") &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i] ?? "") &&
      !/^```/.test((lines[i] ?? "").trim())
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    out.push(
      <p key={key++} style={{ margin: 0, color: "var(--fg-1, var(--fg-0))" }}>
        {renderInline(para.join(" "))}
      </p>,
    );
  }

  return out;
}

/**
 * Inline emphasis, code and links.
 *
 * One pass over an alternation, so a `**bold**` inside `` `code` `` stays
 * literal: code is matched first and its contents are never re-scanned.
 */
export function renderInline(text: string): ReactNode[] {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      out.push(
        <code key={key++} style={codeStyle}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (link) {
        const href = link[2] ?? "";
        // Only http(s) is linkable. A javascript: or data: URL in authored
        // persona text is never legitimate here.
        const safe = /^https?:\/\//i.test(href);
        out.push(
          safe ? (
            <a key={key++} href={href} target="_blank" rel="noreferrer noopener">
              {link[1]}
            </a>
          ) : (
            <span key={key++}>{link[1]}</span>
          ),
        );
      } else {
        out.push(token);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const preStyle = {
  margin: 0,
  padding: "var(--space-2)",
  borderRadius: "var(--radius-sm, 6px)",
  background: "var(--bg-1)",
  color: "var(--fg-1, var(--fg-0))",
  fontSize: "var(--text-xs)",
  overflowX: "auto" as const,
};

const codeStyle = {
  padding: "0.1em 0.35em",
  borderRadius: "4px",
  background: "var(--bg-1)",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "0.9em",
};

const listStyle = { margin: 0, paddingLeft: "1.25em", color: "var(--fg-1, var(--fg-0))" };
