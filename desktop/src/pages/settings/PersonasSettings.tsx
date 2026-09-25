/**
 * v2.4.9 -- the Personas settings tab.
 *
 * Operator ask: personas should "all appear in a dedicated settings tab,
 * likely in a table format, with the option to be edited, with structured
 * markdown capabilities in each editing window, the ability to upload a
 * persona from a markdown file, rename it, etc."
 *
 * A table of saved personas, an editor pane with a Markdown preview, import
 * from a `.md` file, rename, duplicate and delete. Everything is local: the
 * library lives in `personaLibrary.ts` and never leaves the machine.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, TextField } from "../../components/ui";
import { FileImportButton } from "../../components/ui/FileImportButton";
import {
  addPersona,
  loadPersonas,
  personaFromMarkdown,
  removePersona,
  savePersonas,
  updatePersona,
  validatePersona,
  type Persona,
} from "../../shared/persona/personaLibrary";
import { MarkdownPreview } from "../../shared/persona/MarkdownPreview";

export function PersonasSettings(): JSX.Element {
  const [personas, setPersonas] = useState<readonly Persona[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setPersonas(loadPersonas());
  }, []);

  /** Persist and keep state in one step, so the two cannot diverge. */
  const commit = useCallback((next: readonly Persona[]): void => {
    setPersonas(next);
    savePersonas(next);
  }, []);

  const selected = useMemo(
    () => personas.find((p) => p.id === selectedId) ?? null,
    [personas, selectedId],
  );

  const startNew = useCallback((): void => {
    setSelectedId(null);
    setDraftName("");
    setDraftBody("");
    setError(null);
  }, []);

  const startEdit = useCallback((persona: Persona): void => {
    setSelectedId(persona.id);
    setDraftName(persona.name);
    setDraftBody(persona.body);
    setError(null);
  }, []);

  const saveDraft = useCallback((): void => {
    const check = validatePersona(
      { name: draftName, body: draftBody },
      personas,
      selectedId ?? undefined,
    );
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    if (selectedId) {
      commit(updatePersona(personas, selectedId, { name: draftName, body: draftBody }));
      return;
    }
    const next = addPersona(personas, { name: draftName, body: draftBody });
    commit(next);
    setSelectedId(next[next.length - 1]?.id ?? null);
  }, [commit, draftBody, draftName, personas, selectedId]);

  const importMarkdown = useCallback(
    async (file: File): Promise<void> => {
      const text = await file.text();
      const { name, body } = personaFromMarkdown(file.name, text);
      // A clashing imported name gets a suffix rather than being refused:
      // importing two files from the same author is a normal thing to do.
      let candidate = name;
      let n = 2;
      while (personas.some((p) => p.name.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${name} (${n})`;
        n += 1;
      }
      const next = addPersona(personas, { name: candidate, body });
      commit(next);
      const created = next[next.length - 1];
      if (created) startEdit(created);
    },
    [commit, personas, startEdit],
  );

  const exportMarkdown = useCallback((persona: Persona): void => {
    const text = `# ${persona.name}\n\n${persona.body}\n`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${persona.name.replace(/[^\w\- ]+/g, "_")}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  return (
    <section
      data-testid="personas-settings"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", minHeight: 0 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-lg, 1.1rem)" }}>Personas</h2>
        <span style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)" }}>
          Saved instruction sets you can apply to any chat.
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
          <Button type="button" variant="ghost" testId="persona-new" onClick={startNew}>
            <Plus size={14} aria-hidden="true" /> New
          </Button>
          <FileImportButton
            testId="persona-import"
            accept=".md,.markdown,text/markdown,text/plain"
            onFile={(file) => void importMarkdown(file)}
          >
            <FileUp size={14} aria-hidden="true" /> Import Markdown
          </FileImportButton>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(16rem, 1fr) 2fr", gap: "var(--space-3)", minHeight: 0 }}>
        {/* Table of saved personas */}
        <div className="nx-card" style={{ overflow: "auto", maxHeight: "28rem" }}>
          {personas.length === 0 ? (
            <p data-testid="personas-empty" style={{ padding: "var(--space-3)", color: "var(--fg-muted)" }}>
              No personas yet. Create one, or import a Markdown file.
            </p>
          ) : (
            <table data-testid="personas-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Updated</th>
                  <th style={th} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {personas.map((persona) => (
                  <tr
                    key={persona.id}
                    data-testid={`persona-row-${persona.id}`}
                    style={{
                      background:
                        persona.id === selectedId
                          ? "color-mix(in srgb, var(--accent-chatbot) 12%, transparent)"
                          : "transparent",
                    }}
                  >
                    <td style={td}>{persona.name}</td>
                    <td style={{ ...td, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                      {new Date(persona.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Edit ${persona.name}`}
                        title="Edit"
                        testId={`persona-edit-${persona.id}`}
                        onClick={() => startEdit(persona)}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Export ${persona.name}`}
                        title="Export as Markdown"
                        testId={`persona-export-${persona.id}`}
                        onClick={() => exportMarkdown(persona)}
                      >
                        <Download size={14} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Delete ${persona.name}`}
                        title="Delete"
                        testId={`persona-delete-${persona.id}`}
                        onClick={() => {
                          commit(removePersona(personas, persona.id));
                          if (selectedId === persona.id) startNew();
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Editor */}
        <div className="nx-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-3)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>
              Name {selected ? "(rename here)" : ""}
            </span>
            <TextField
              testId="persona-name"
              value={draftName}
              onChange={(v) => setDraftName(v)}
              placeholder="Code reviewer"
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>
              Instructions (Markdown)
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Button
                type="button"
                variant="ghost"
                testId="persona-preview-toggle"
                aria-pressed={showPreview}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </span>
          </div>

          {showPreview ? (
            <div
              data-testid="persona-preview"
              style={{ ...inputStyle, minHeight: "14rem", overflow: "auto" }}
            >
              <MarkdownPreview markdown={draftBody} />
            </div>
          ) : (
            <TextField
              multiline
              rows={14}
              testId="persona-body"
              value={draftBody}
              onChange={(v) => setDraftBody(v)}
              placeholder="You are a meticulous reviewer. Be terse; cite line numbers."
            />
          )}

          {error ? (
            <p data-testid="persona-error" role="alert" style={{ margin: 0, color: "var(--status-err, #ef4444)", fontSize: "var(--text-xs)" }}>
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button type="button" testId="persona-save" onClick={saveDraft}>
              {selected ? "Save changes" : "Create persona"}
            </Button>
            {selected ? (
              <Button type="button" variant="ghost" testId="persona-cancel" onClick={startNew}>
                New instead
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

const th = {
  textAlign: "left" as const,
  padding: "var(--space-2)",
  borderBottom: "1px solid var(--border-1)",
  color: "var(--fg-muted)",
  fontWeight: 600,
  fontSize: "var(--text-xs)",
};

const td = {
  padding: "var(--space-2)",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--fg-0)",
};

const inputStyle = {
  padding: "var(--space-2)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-0)",
  color: "var(--fg-0)",
  fontSize: "var(--text-sm)",
  width: "100%",
  boxSizing: "border-box" as const,
};

