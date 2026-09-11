/**
 * v2.4.9 -- the persona library's rules, independent of any UI.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  addPersona,
  findPersona,
  loadPersonas,
  personaFromMarkdown,
  PERSONA_STORAGE_KEY,
  removePersona,
  savePersonas,
  updatePersona,
  validatePersona,
  type Persona,
} from "../src/shared/persona/personaLibrary";

function seed(...names: string[]): readonly Persona[] {
  let list: readonly Persona[] = [];
  for (const name of names) list = addPersona(list, { name, body: `${name} body` });
  return list;
}

describe("validatePersona", () => {
  it("requires a name and a body", () => {
    expect(validatePersona({ name: "", body: "x" }, []).ok).toBe(false);
    expect(validatePersona({ name: "  ", body: "x" }, []).ok).toBe(false);
    expect(validatePersona({ name: "Editor", body: "   " }, []).ok).toBe(false);
    expect(validatePersona({ name: "Editor", body: "Be terse." }, []).ok).toBe(true);
  });

  it("rejects a duplicate name case-insensitively", () => {
    // Two entries called Editor and editor are indistinguishable in the
    // dropdown, which is the entire reason personas are named.
    const list = seed("Editor");
    expect(validatePersona({ name: "editor", body: "x" }, list).ok).toBe(false);
    expect(validatePersona({ name: "  EDITOR ", body: "x" }, list).ok).toBe(false);
    expect(validatePersona({ name: "Reviewer", body: "x" }, list).ok).toBe(true);
  });

  it("lets a persona keep its own name while being edited", () => {
    const list = seed("Editor");
    const id = list[0]!.id;
    expect(validatePersona({ name: "Editor", body: "new" }, list, id).ok).toBe(true);
  });
});

describe("CRUD", () => {
  it("adds, updates and removes", () => {
    let list = seed("Editor");
    expect(list).toHaveLength(1);
    const id = list[0]!.id;

    list = updatePersona(list, id, { name: "Copy editor", body: "Be terse." });
    expect(list[0]?.name).toBe("Copy editor");
    expect(list[0]?.body).toBe("Be terse.");

    list = removePersona(list, id);
    expect(list).toHaveLength(0);
  });

  it("normalizes a name on the way in", () => {
    const list = addPersona([], { name: "  Deep   Reviewer  ", body: "x" });
    expect(list[0]?.name).toBe("Deep Reviewer");
  });

  it("finds by id and tolerates a missing one", () => {
    const list = seed("A", "B");
    expect(findPersona(list, list[1]!.id)?.name).toBe("B");
    expect(findPersona(list, "nope")).toBeNull();
    expect(findPersona(list, null)).toBeNull();
  });
});

describe("persistence", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips through storage", () => {
    const list = seed("Editor", "Reviewer");
    savePersonas(list);
    const back = loadPersonas();
    expect(back.map((p) => p.name)).toEqual(["Editor", "Reviewer"]);
  });

  it("returns empty rather than throwing on junk", () => {
    localStorage.setItem(PERSONA_STORAGE_KEY, "{not json");
    expect(loadPersonas()).toEqual([]);
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadPersonas()).toEqual([]);
  });

  it("drops malformed records rather than rendering holes", () => {
    localStorage.setItem(
      PERSONA_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        personas: [
          { id: "a", name: "Good", body: "x" },
          { id: "b", name: "", body: "x" },
          { nope: true },
          null,
        ],
      }),
    );
    expect(loadPersonas().map((p) => p.name)).toEqual(["Good"]);
  });
});

describe("personaFromMarkdown", () => {
  it("takes the name from a leading heading and strips it from the body", () => {
    const { name, body } = personaFromMarkdown("whatever.md", "# Code Reviewer\n\nBe strict.\n");
    expect(name).toBe("Code Reviewer");
    expect(body).toBe("Be strict.");
  });

  it("falls back to the filename when there is no heading", () => {
    const { name, body } = personaFromMarkdown("deep-reviewer.md", "Be strict.\n");
    expect(name).toBe("deep-reviewer");
    expect(body).toBe("Be strict.");
  });

  it("keeps a non-heading first line in the body", () => {
    const { body } = personaFromMarkdown("x.md", "## Not a title\nBody here");
    expect(body).toContain("## Not a title");
  });

  it("never produces an empty name", () => {
    expect(personaFromMarkdown(".md", "body").name).toBe("Imported persona");
  });

  it("handles CRLF input", () => {
    const { name, body } = personaFromMarkdown("x.md", "# Title\r\n\r\nBody\r\n");
    expect(name).toBe("Title");
    expect(body).toBe("Body");
  });
});
