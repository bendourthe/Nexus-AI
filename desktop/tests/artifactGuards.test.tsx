import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FORBIDDEN_TAGS, sanitizeArtifactHtml } from "../src/shared/security/sanitizeArtifact";
import { sanitizeSvg } from "../src/shared/security/sanitizeSvg";
import { MermaidDiagram } from "../src/shared/chat/MermaidDiagram";
import {
  MAX_EDGES,
  MAX_FENCE_BYTES,
  MAX_NODES,
  RENDER_TIMEOUT_MS,
  assessMermaidSource,
  countMermaidEdges,
  countMermaidNodes,
  mermaidByteLength,
  neutralizeMermaidClicks,
} from "../src/shared/chat/mermaidLimits";

const ATTACKS = [
  "<script>parent.postMessage('x','*')</script>",
  "<iframe src=\"https://example.invalid\"></iframe>",
  "<svg><foreignObject><script>alert(1)</script></foreignObject></svg>",
  "<svg><animate attributeName=\"href\" values=\"javascript:alert(1)\"/></svg>",
  "<svg><set attributeName=\"xlink:href\" to=\"javascript:alert(1)\"/></svg>",
  "<svg><use href=\"#external\"></use></svg>",
  "<svg onclick=\"alert(1)\"><text>x</text></svg>",
  "<math><mi onclick=\"alert(1)\">x</mi></math>",
];

describe("artifact guards", () => {
  it("strips the attack corpus from the HTML and SVG sanitisers", () => {
    for (const attack of ATTACKS) {
      const html = sanitizeArtifactHtml(attack).toLowerCase();
      expect(html).not.toContain("<script");
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain("<style");
      expect(html).not.toContain("postmessage");
      expect(html).not.toContain("javascript:");
      const svg = sanitizeSvg(attack).toLowerCase();
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("<iframe");
      expect(svg).not.toContain("foreignobject");
      expect(svg).not.toContain("<animate");
      expect(svg).not.toContain("<set");
      expect(svg).not.toContain("<use");
      expect(svg).not.toContain("javascript:");
      expect(svg).not.toContain("onclick");
      expect(svg).not.toContain("href");
    }
  });

  it("drops a click-directive anchor and keeps a readable label", () => {
    const source = 'flowchart LR\nA[Start] --> B[End]\nclick A href "https://example.invalid"';
    const neutralized = neutralizeMermaidClicks(source);
    expect(neutralized.toLowerCase()).not.toContain("click ");
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.invalid"><text>Start</text></a></svg>',
    );
    expect(svg.toLowerCase()).not.toContain("<a");
    expect(svg.toLowerCase()).not.toContain("href");
    expect(svg).toContain("Start");
  });

  it("keeps FORBIDDEN_TAGS byte-identical", () => {
    expect(FORBIDDEN_TAGS.join(",")).toBe("style,iframe,object,embed,link,meta,base");
    const styled = sanitizeArtifactHtml("<p>ok</p><style>body{color:red}</style>");
    expect(styled.toLowerCase()).not.toContain("<style");
    expect(styled).toContain("ok");
  });

  it("allows DOMPurify imports only in the shared security modules", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist") continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx|mjs)$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, "utf8");
        if (text.includes("isomorphic-dompurify")) {
          hits.push(path.relative(root, full).replaceAll("\\", "/"));
        }
      }
    };
    walk(path.join(root, "src"));
    expect(hits.sort()).toEqual([
      "src/shared/security/sanitizeArtifact.ts",
      "src/shared/security/sanitizeSvg.ts",
    ]);
  });

  it("caps fences at the stated boundary and one past it", () => {
    const atBytes = "A".repeat(MAX_FENCE_BYTES);
    expect(mermaidByteLength(atBytes)).toBe(MAX_FENCE_BYTES);
    expect(assessMermaidSource(atBytes).ok).toBe(true);
    expect(assessMermaidSource(`${atBytes}B`).ok).toBe(false);

    const nodes = Array.from({ length: MAX_NODES }, (_, index) => `N${index}[L]`).join("\n");
    expect(countMermaidNodes(nodes)).toBe(MAX_NODES);
    expect(assessMermaidSource(`flowchart LR\n${nodes}`).ok).toBe(true);
    const oneMore = `${nodes}\nNextra[L]`;
    expect(countMermaidNodes(oneMore)).toBe(MAX_NODES + 1);
    expect(assessMermaidSource(oneMore).ok).toBe(false);

    const edges = Array.from({ length: MAX_EDGES }, () => "A --> B").join("\n");
    expect(countMermaidEdges(edges)).toBe(MAX_EDGES);
    expect(assessMermaidSource(edges).ok).toBe(true);
    expect(assessMermaidSource(`${edges}\nA --> B`).ok).toBe(false);
  });

  it("renders a readable label and shows invalid syntax inline", async () => {
    const ok = vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg"><text>Readable label</text></svg>');
    render(<MermaidDiagram messageId="m1" source={"flowchart LR\nA[Readable label]"} renderDiagram={ok} />);
    expect(await screen.findByText("Readable label")).toBeTruthy();

    const bad = vi.fn(async () => {
      throw new Error("parse error");
    });
    render(<MermaidDiagram messageId="m2" source={"flowchart LR\nnot valid"} renderDiagram={bad} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("parse error");
    expect(screen.getByText(/not valid/)).toBeTruthy();
  });

  it("falls back when rendering exceeds the timeout", async () => {
    render(
      <MermaidDiagram
        messageId="m3"
        source={"flowchart LR\nA --> B"}
        renderDiagram={() => new Promise(() => undefined)}
      />,
    );
    expect(await screen.findByRole("alert", {}, { timeout: RENDER_TIMEOUT_MS + 1500 })).toHaveTextContent(
      /timed out/,
    );
    expect(screen.getByText(/A --> B/)).toBeTruthy();
  });
});
