/**
 * WN-2 -- CSS math functions in inline styles are invisible to the test suite.
 *
 * jsdom's `cssstyle` cannot parse `min()`, `max()` or `clamp()`, so it drops
 * the whole declaration: `element.style.width` comes back `""` and
 * `toHaveStyle({ width: "min(22rem, 100%)" })` can never pass. A component can
 * therefore carry a sizing bug through the entire suite untouched.
 *
 * That is not hypothetical. The generation progress bar was fixed once, and a
 * SECOND width regression survived because the pending row used
 * `width: fit-content` while the bar used `min(22rem, 100%)` -- the bar's
 * percentage resolved against a shrink-to-fit box, so caption length still
 * leaked into the bar. Every unit test passed. It was caught by rendering the
 * component and looking at the pixels.
 *
 * This guard keeps the affected surfaces on the `width` + `max-width` pair,
 * which is the same rule and IS assertable. It is deliberately scoped to the
 * files whose sizing tests exist rather than the whole tree: a media query or
 * a stylesheet may use `min()` freely, and so may a component nobody asserts
 * geometry on.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Components whose inline sizing is asserted in unit tests. */
const GEOMETRY_ASSERTED_FILES = [
  "src/shared/chat/GenerationProgressBar.tsx",
  "src/shared/chat/generationProgress.ts",
  "src/shared/chat/MessageBubble.tsx",
];

/**
 * CSS math in a `width` or `minWidth` declaration.
 *
 * Deliberately NOT every property. The regression class is a SIZE whose
 * percentage resolves against an unexpected containing block -- that is what
 * `width: min(22rem, 100%)` inside a `fit-content` parent did. A `maxWidth`
 * cap such as `min(100%, 28rem)` cannot produce it: it only ever shrinks an
 * element, never widens one relative to a sibling, and it is the idiomatic
 * way to write "at most this, and never wider than my parent".
 *
 * Widening this to all properties would force rewriting legitimate responsive
 * caps into less correct fixed values purely to satisfy a test-harness
 * limitation, trading real behaviour for assertability. The narrow rule
 * catches the bug that actually shipped.
 */
const CSS_MATH = /\b(?:width|minWidth):\s*[`"'][^`"']*\b(?:min|max|clamp)\s*\(/g;

describe("inline styles avoid CSS math functions (WN-2)", () => {
  for (const relative of GEOMETRY_ASSERTED_FILES) {
    it(`${relative} uses assertable width rules`, () => {
      const source = readFileSync(resolve(process.cwd(), relative), "utf-8");
      const hits = [...source.matchAll(CSS_MATH)].map((m) => m[0].trim());
      expect(
        hits,
        `jsdom drops these declarations, so any sizing assertion on them ` +
          `silently passes. Use width + maxWidth instead.`,
      ).toEqual([]);
    });
  }

  it("documents the jsdom limitation it exists to cover", () => {
    // A guard whose premise stops being true should be deleted, not kept as
    // cargo. If jsdom ever learns min(), this fails and says so.
    const style = document.createElement("div").style;
    style.setProperty("width", "min(22rem, 100%)");
    expect(
      style.getPropertyValue("width"),
      "jsdom now parses min(); this guard and WN-2 can be retired.",
    ).toBe("");
  });
});
