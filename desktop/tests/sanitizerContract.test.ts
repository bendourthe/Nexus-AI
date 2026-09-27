import { describe, expect, it } from "vitest";
import { FORBIDDEN_TAGS } from "../src/shared/security/sanitizeArtifact";

describe("sanitiser contract", () => {
  it("keeps the HTML forbidden-tag list byte-identical to the pre-Mermaid list", () => {
    expect([...FORBIDDEN_TAGS]).toEqual(["style", "iframe", "object", "embed", "link", "meta", "base"]);
  });
});
