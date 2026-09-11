/**
 * v2.4.9 -- named, reusable personas.
 *
 * Until now a persona was an anonymous blob of text attached to one chat: you
 * wrote it, it applied, and it was gone when you started a new session. The
 * operator asked to "save personas and give them a name that would appear in
 * the chat when selected", pick them from a dropdown, and manage them in a
 * settings tab.
 *
 * This module is the storage and the rules, with no React in it, so the
 * dropdown, the settings table and the tests all agree on one definition of
 * what a persona is and what may be done to it.
 *
 * Persistence is `localStorage` under one key holding a versioned envelope.
 * That is deliberately the same tier the rest of the renderer's UI preferences
 * use: a persona is authored text the user can re-type, not durable project
 * data, and putting it behind IPC would buy nothing a reload does not already
 * give us. The envelope carries a version so a future move to the settings
 * store can migrate rather than guess.
 */

export interface Persona {
  readonly id: string;
  /** Shown in the dropdown and beside the chat when selected. */
  readonly name: string;
  /** The instruction text. Markdown; rendered as-is by the model. */
  readonly body: string;
  /** ISO timestamps, so the table can sort by recency. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const PERSONA_STORAGE_KEY = "nexus.personas.v1";
export const PERSONA_NAME_MAX = 60;
/** A persona that is only whitespace is not a persona. */
export const PERSONA_BODY_MIN = 1;

interface PersonaEnvelope {
  readonly version: 1;
  readonly personas: readonly Persona[];
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Stable-ish id that does not need `crypto.randomUUID`.
 *
 * jsdom and older Electron renderers do not always expose it, and a persona id
 * never leaves this machine, so a timestamp plus entropy is sufficient.
 */
export function newPersonaId(): string {
  return `persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Trim and cap a name; an empty result is the caller's problem to reject. */
export function normalizePersonaName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, PERSONA_NAME_MAX);
}

export interface PersonaValidation {
  readonly ok: boolean;
  readonly error: string | null;
}

/**
 * Names are unique, case-insensitively.
 *
 * Two personas called "Editor" and "editor" would be indistinguishable in the
 * dropdown, and the dropdown is the whole point of naming them.
 */
export function validatePersona(
  candidate: { name: string; body: string },
  existing: readonly Persona[],
  ignoreId?: string,
): PersonaValidation {
  const name = normalizePersonaName(candidate.name);
  if (!name) return { ok: false, error: "Give the persona a name." };
  if (candidate.body.trim().length < PERSONA_BODY_MIN) {
    return { ok: false, error: "The persona needs some instructions." };
  }
  const clash = existing.some(
    (p) => p.id !== ignoreId && p.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) return { ok: false, error: `A persona named "${name}" already exists.` };
  return { ok: true, error: null };
}

/** Read the library, tolerating absent, malformed, or foreign-shaped data. */
export function loadPersonas(storage: Storage = safeStorage()): readonly Persona[] {
  try {
    const raw = storage.getItem(PERSONA_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const list = (parsed as PersonaEnvelope).personas;
    if (!Array.isArray(list)) return [];
    // Drop anything that is not a usable record rather than rendering holes.
    return list.filter(isPersona);
  } catch {
    return [];
  }
}

export function savePersonas(
  personas: readonly Persona[],
  storage: Storage = safeStorage(),
): void {
  try {
    const envelope: PersonaEnvelope = { version: 1, personas };
    storage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // A private window or a storage-blocked host: the session keeps working
    // with whatever is in memory. Failing the edit would be worse.
  }
}

function isPersona(value: unknown): value is Persona {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p["id"] === "string" &&
    typeof p["name"] === "string" &&
    typeof p["body"] === "string" &&
    p["name"].trim().length > 0
  );
}

function safeStorage(): Storage {
  // Every accessor is wrapped by the callers; this only has to hand back an
  // object shaped like Storage when there is no real one (SSR, a thumbnailer).
  if (typeof localStorage !== "undefined") return localStorage;
  const memory = new Map<string, string>();
  return {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: (k: string) => memory.get(k) ?? null,
    key: (i: number) => [...memory.keys()][i] ?? null,
    removeItem: (k: string) => void memory.delete(k),
    setItem: (k: string, v: string) => void memory.set(k, v),
  } as Storage;
}

/** Add a persona, returning the new list. Caller validates first. */
export function addPersona(
  personas: readonly Persona[],
  input: { name: string; body: string },
): readonly Persona[] {
  const stamp = now();
  return [
    ...personas,
    {
      id: newPersonaId(),
      name: normalizePersonaName(input.name),
      body: input.body,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

/** Update name and/or body in place, refreshing `updatedAt`. */
export function updatePersona(
  personas: readonly Persona[],
  id: string,
  patch: { name?: string; body?: string },
): readonly Persona[] {
  return personas.map((p) =>
    p.id === id
      ? {
          ...p,
          ...(patch.name !== undefined ? { name: normalizePersonaName(patch.name) } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          updatedAt: now(),
        }
      : p,
  );
}

export function removePersona(
  personas: readonly Persona[],
  id: string,
): readonly Persona[] {
  return personas.filter((p) => p.id !== id);
}

export function findPersona(
  personas: readonly Persona[],
  id: string | null | undefined,
): Persona | null {
  if (!id) return null;
  return personas.find((p) => p.id === id) ?? null;
}

/**
 * Derive a persona from an uploaded Markdown file.
 *
 * The name comes from a leading `# Heading` when there is one, else the
 * filename without its extension -- so dropping in a file someone else wrote
 * lands with a sensible name instead of "untitled". A leading heading that
 * became the name is stripped from the body, because repeating it as the first
 * instruction line is noise the model does not need.
 */
export function personaFromMarkdown(
  filename: string,
  markdown: string,
): { name: string; body: string } {
  const text = markdown.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const firstMeaningful = lines.findIndex((l) => l.trim().length > 0);
  const heading =
    firstMeaningful >= 0 ? /^#\s+(.+?)\s*$/.exec(lines[firstMeaningful] ?? "") : null;
  if (heading?.[1]) {
    const body = lines.slice(firstMeaningful + 1).join("\n").trim();
    return { name: normalizePersonaName(heading[1]), body };
  }
  const base = filename.replace(/\.[^.]+$/, "");
  return { name: normalizePersonaName(base) || "Imported persona", body: text.trim() };
}
