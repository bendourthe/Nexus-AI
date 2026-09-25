import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatPage } from "../src/modules/chat/ChatPage";
import { InMemoryChatExplorerClient } from "../src/modules/chat/chatExplorerClient";
import { CodingPage } from "../src/modules/coding/CodingPage";
import { ImageStudioPage } from "../src/modules/image/ImageStudioPage";
import { VideoLabPage } from "../src/modules/video/VideoLabPage";
import { InMemoryDiffusionClient } from "../src/modules/image/diffusionClient";
import type { ListedModelDto } from "../src/pages/settings/modelsTypes";
import { unexpectedTriples, type A11yTriple } from "./a11yBaseline";

const baselinePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "a11y-baseline.json");

const NO_MODELS = { list: async (): Promise<ListedModelDto[]> => [] };

function mount(route: string): HTMLElement {
  if (route === "chatbot") {
    return render(<ChatPage client={new InMemoryChatExplorerClient()} />).container;
  }
  if (route === "agents") {
    return render(<CodingPage modelsClient={NO_MODELS} hostVramGB={16} />).container;
  }
  if (route === "images") {
    return render(<ImageStudioPage client={new InMemoryDiffusionClient()} modelsClient={NO_MODELS} />).container;
  }
  return render(<VideoLabPage modelsClient={NO_MODELS} />).container;
}

async function triplesFor(route: string): Promise<A11yTriple[]> {
  const container = mount(route);
  if (container.childElementCount === 0) {
    throw new Error(`route did not render: ${route}`);
  }
  const results = await axe.run(container);
  const triples: A11yTriple[] = [];
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      triples.push({
        route,
        rule: violation.id,
        selector: node.target.join(" "),
      });
    }
  }
  return triples;
}

describe("pillar axe baseline", () => {
  const routes = ["chatbot", "agents", "images", "videos"] as const;

  it("matches the committed (route, rule, selector) triples", async () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as A11yTriple[];
    const observed: A11yTriple[] = [];
    for (const route of routes) observed.push(...(await triplesFor(route)));
    const added = unexpectedTriples(baseline, observed);
    expect(added, JSON.stringify(added, null, 2)).toEqual([]);
  }, 60_000);

  it("axe reports a nameless button, so a silent empty run cannot pass", async () => {
    // The unlabeled button is the fixture that proves axe reports button-name.
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
    const { container } = render(<button />);
    const results = await axe.run(container);
    expect(results.violations.map((violation) => violation.id)).toContain("button-name");
  });

  it("fails a new triple even when the total count drops", () => {
    const baseline: A11yTriple[] = [
      { route: "chatbot", rule: "button-name", selector: "button" },
      { route: "chatbot", rule: "image-alt", selector: "img" },
    ];
    const observed: A11yTriple[] = [{ route: "chatbot", rule: "label", selector: "input" }];
    expect(observed.length).toBeLessThan(baseline.length);
    expect(unexpectedTriples(baseline, observed)).toEqual([
      { route: "chatbot", rule: "label", selector: "input" },
    ]);
  });
});
