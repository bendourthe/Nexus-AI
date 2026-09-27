/**
 * Renders one Mermaid fence. Composed by MessageBubble; the renderer is not
 * inlined there.
 *
 * Styling comes from `.nexus-mermaid` in the application stylesheet.
 * `style` stays forbidden on the HTML sanitiser, so the SVG must not depend
 * on an embedded stylesheet.
 */

import { useEffect, useState } from "react";
import { sanitizeSvg } from "../security/sanitizeSvg";
import { saveDiagram, type DiagramSaver } from "../studio/diagramExport";
import {
  assessMermaidSource,
  neutralizeMermaidClicks,
  RENDER_TIMEOUT_MS,
  withTimeout,
} from "./mermaidLimits";

export type DiagramRenderer = (source: string) => Promise<string>;

async function renderWithMermaid(source: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    suppressErrorRendering: true,
  });
  const id = `nexus-mermaid-${Math.random().toString(36).slice(2, 10)}`;
  const rendered = await mermaid.render(id, source);
  return rendered.svg;
}

export interface MermaidDiagramProps {
  readonly source: string;
  readonly messageId: string;
  readonly renderDiagram?: DiagramRenderer;
  readonly saveExport?: DiagramSaver;
}

export function MermaidDiagram({
  source,
  messageId,
  renderDiagram = renderWithMermaid,
  saveExport,
}: MermaidDiagramProps): JSX.Element {
  const assessment = assessMermaidSource(source);
  const [forced, setForced] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const overCap = !assessment.ok && !forced;

  useEffect(() => {
    if (overCap) return;
    let cancelled = false;
    setSvg(null);
    setError(null);
    const safeSource = neutralizeMermaidClicks(source);
    void withTimeout(renderDiagram(safeSource), RENDER_TIMEOUT_MS).then(
      (raw) => {
        if (!cancelled) setSvg(sanitizeSvg(raw));
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Diagram could not be rendered");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, overCap, renderDiagram]);

  if (overCap) {
    return (
      <div data-testid={`mermaid-capped-${messageId}`}>
        <pre>{source}</pre>
        <button type="button" onClick={() => setForced(true)}>
          Render diagram
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={`mermaid-error-${messageId}`}>
        <p role="alert">{error}</p>
        <pre>{source}</pre>
      </div>
    );
  }

  if (!svg) {
    return <p data-testid={`mermaid-pending-${messageId}`}>Rendering diagram</p>;
  }

  return (
    <div>
      <div
        className="nexus-mermaid"
        data-testid={`mermaid-diagram-${messageId}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {saveExport ? (
        <div>
          <button
            type="button"
            onClick={() => {
              void saveDiagram(saveExport, {
                suggestedName: `diagram-${messageId}`,
                svg,
                extension: "png",
              }).catch((err: unknown) => {
                setExportError(err instanceof Error ? err.message : "Export failed");
              });
            }}
          >
            Export PNG
          </button>
          <button
            type="button"
            onClick={() => {
              void saveDiagram(saveExport, {
                suggestedName: `diagram-${messageId}`,
                svg,
                extension: "svg",
              }).catch((err: unknown) => {
                setExportError(err instanceof Error ? err.message : "Export failed");
              });
            }}
          >
            Export SVG
          </button>
          {exportError ? <p role="alert">{exportError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
