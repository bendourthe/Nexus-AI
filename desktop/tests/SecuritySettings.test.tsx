/**
 * v1.19.1 Phase 2.5 -- Security posture settings tab.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  SecuritySettings,
  type DesktopSecurityPosture,
  type SecuritySettingsClient,
  type DocumentOutlineStatus,
} from "../src/pages/settings/SecuritySettings";
import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import { createHandlerContext, dispatch } from "../sidecar/src/handlers";
import { InMemorySettingsStore } from "../../core/storage/SettingsStore";
import { DOCUMENT_OUTLINE_SETTING_KEY, DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY } from "../../core/documents/documentOutlineEnabled";

afterEach(() => {
  clearInvokeOverride();
  vi.unstubAllEnvs();
});

const auditClient = {
  list: async () => [],
  status: async () => ({ eventCount: 0, droppedCount: 0, vaultAvailable: true }),
};

function memoryClient(initial: DesktopSecurityPosture = "standard"): SecuritySettingsClient {
  let stored = initial;
  return {
    getPosture: async () => stored,
    setPosture: async (id) => {
      stored = id;
    },
  };
}

describe("SecuritySettings", () => {
  it("renders Strict, Standard, and Unattended with a hard-denial floor", async () => {
    render(<SecuritySettings client={memoryClient()} />);
    await waitFor(() => expect(screen.getByTestId("settings-security")).toBeInTheDocument());
    expect(screen.getByTestId("security-posture-strict").textContent).toMatch(/hard-denied/i);
    expect(screen.getByTestId("security-posture-standard").textContent).toMatch(/hard-denied/i);
    expect(screen.getByTestId("security-posture-unattended").textContent).toMatch(/not a no-floor/i);
  });

  it("persists the selected posture through the client", async () => {
    const user = userEvent.setup();
    const setPosture = vi.fn(async (_id: DesktopSecurityPosture) => undefined);
    const client: SecuritySettingsClient = {
      getPosture: async () => "standard",
      setPosture,
    };
    render(<SecuritySettings client={client} />);
    await waitFor(() => expect(screen.getByTestId("security-posture-unattended")).toBeInTheDocument());
    await user.click(screen.getByTestId("security-posture-unattended").querySelector("input")!);
    expect(setPosture).toHaveBeenCalledWith("unattended");
  });

  it("renders untrusted audit rows from the injected client", async () => {
    render(
      <SecuritySettings
        client={memoryClient()}
        auditClient={{
          list: async () => [
            {
              id: 1,
              ts: "2026-08-20T00:00:00.000Z",
              actor: "worker",
              pillar: "coding",
              kind: "chat.turn",
              trusted: false,
            },
          ],
          status: async () => ({ eventCount: 1, droppedCount: 3, vaultAvailable: false }),
        }}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("audit-row-1")).toBeInTheDocument());
    expect(screen.getByTestId("audit-dropped-count")).toHaveTextContent("Dropped: 3");
    expect(screen.getByText("untrusted")).toBeInTheDocument();
    expect(screen.getByTestId("audit-vault-notice")).toBeInTheDocument();
  });

  it("toggles parse_document through the injected client", async () => {
    const user = userEvent.setup();
    const setEnabled = vi.fn(async (_enabled: boolean) => undefined);
    render(
      <SecuritySettings
        client={memoryClient()}
        parseDocumentClient={{
          getEnabled: async () => false,
          setEnabled,
        }}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("parse-document-toggle")).toBeInTheDocument());
    await user.click(screen.getByTestId("parse-document-toggle"));
    expect(setEnabled).toHaveBeenCalledWith(true);
  });

  it("persists both outline switches through the real sidecar and restores summary preferences", async () => {
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    const settings = new InMemorySettingsStore();
    ctx.settings = settings;
    setInvokeOverride(async (_command, args) => dispatch(String(args?.method), args?.params, ctx));
    const user = userEvent.setup();
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} />);
    const outline = screen.getByRole("checkbox", { name: "Enable document outline tools" });
    const summaries = screen.getByRole("checkbox", { name: "Generate one-line section summaries" });
    await waitFor(() => expect(outline).toBeEnabled());
    expect(outline).not.toBeChecked();
    expect(summaries).toBeDisabled();
    await user.click(outline);
    await waitFor(() => expect(summaries).toBeEnabled());
    expect(await settings.get(DOCUMENT_OUTLINE_SETTING_KEY)).toBe(true);
    summaries.focus();
    await user.keyboard(" ");
    await waitFor(() => expect(summaries).toBeChecked());
    expect(await settings.get(DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY)).toBe(true);
    await user.click(outline);
    await waitFor(() => expect(outline).not.toBeChecked());
    expect(summaries).not.toBeChecked();
    expect(summaries).toBeDisabled();
    expect(await settings.get(DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY)).toBe(true);
    await user.click(outline);
    await waitFor(() => expect(summaries).toBeChecked());
  });

  it("holds both switches disabled while status is loading", async () => {
    let resolveStatus!: (status: DocumentOutlineStatus) => void;
    const status = new Promise<DocumentOutlineStatus>((resolve) => { resolveStatus = resolve; });
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} documentOutlineClient={{ getStatus: () => status, setEnabled: async () => undefined }} />);
    expect(screen.getByTestId("document-outline-toggle")).toBeDisabled();
    expect(screen.getByTestId("document-outline-summaries-toggle")).toBeDisabled();
    resolveStatus({ enabled: true, summariesEnabled: true });
    await waitFor(() => expect(screen.getByTestId("document-outline-toggle")).toBeEnabled());
    expect(screen.getByTestId("document-outline-summaries-toggle")).toBeChecked();
  });

  it("shows a status-load failure and keeps the unknown state disabled", async () => {
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} documentOutlineClient={{ getStatus: async () => { throw new Error("disconnected"); }, setEnabled: async () => undefined }} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load document outline settings");
    expect(screen.getByTestId("document-outline-toggle")).toBeDisabled();
  });

  it("does not show a failed write as an enabled setting", async () => {
    const user = userEvent.setup();
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} documentOutlineClient={{ getStatus: async () => ({ enabled: false, summariesEnabled: false }), setEnabled: async () => { throw new Error("write failed"); } }} />);
    const outline = screen.getByTestId("document-outline-toggle");
    await waitFor(() => expect(outline).toBeEnabled());
    await user.click(outline);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not confirm document outline settings");
    expect(outline).not.toBeChecked();
  });

  it("shows effective environment overrides through the real status IPC", async () => {
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "1");
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE_SUMMARIES", "0");
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.settings = new InMemorySettingsStore();
    setInvokeOverride(async (_command, args) => dispatch(String(args?.method), args?.params, ctx));
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} />);
    await waitFor(() => expect(screen.getByTestId("document-outline-toggle")).toBeChecked());
    expect(screen.getByTestId("document-outline-toggle")).toBeDisabled();
    expect(screen.getByTestId("document-outline-summaries-toggle")).not.toBeChecked();
    expect(screen.getByTestId("document-outline-summaries-toggle")).toBeDisabled();
    expect(screen.getByText(/NEXUS_DOCUMENT_OUTLINE controls this switch/)).toBeInTheDocument();
    expect(screen.getByText(/NEXUS_DOCUMENT_OUTLINE_SUMMARIES controls summaries/)).toBeInTheDocument();
  });

  it("preserves the stored outline preference when changing summaries under an environment override", async () => {
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "1");
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE_SUMMARIES", "");
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    const settings = new InMemorySettingsStore();
    ctx.settings = settings;
    await settings.set(DOCUMENT_OUTLINE_SETTING_KEY, false);
    setInvokeOverride(async (_command, args) => dispatch(String(args?.method), args?.params, ctx));
    const user = userEvent.setup();
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} />);
    const outline = screen.getByTestId("document-outline-toggle");
    const summaries = screen.getByTestId("document-outline-summaries-toggle");
    await waitFor(() => expect(summaries).toBeEnabled());
    expect(outline).toBeChecked();
    expect(outline).toBeDisabled();
    await user.click(summaries);
    await waitFor(() => expect(summaries).toBeChecked());
    expect(await settings.get(DOCUMENT_OUTLINE_SETTING_KEY)).toBe(false);
    expect(await settings.get(DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY)).toBe(true);
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "");
    expect(await dispatch("coding.documentOutline.status", {}, ctx)).toEqual({ enabled: false, summariesEnabled: false });
  });

  it("shows authoritative state when a successful write differs from its request", async () => {
    const user = userEvent.setup();
    const getStatus = vi.fn()
      .mockResolvedValueOnce({ enabled: false, summariesEnabled: false })
      .mockResolvedValueOnce({ enabled: false, summariesEnabled: false, environmentOverrides: { enabled: true, summariesEnabled: false } });
    const setEnabled = vi.fn(async () => undefined);
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} documentOutlineClient={{ getStatus, setEnabled }} />);
    const outline = screen.getByTestId("document-outline-toggle");
    await waitFor(() => expect(outline).toBeEnabled());
    await user.click(outline);
    await screen.findByText(/NEXUS_DOCUMENT_OUTLINE controls this switch/);
    expect(setEnabled).toHaveBeenCalledWith(true, undefined);
    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(outline).not.toBeChecked();
    expect(outline).toBeDisabled();
  });

  it("blocks stale controls when a successful disable cannot be confirmed", async () => {
    const user = userEvent.setup();
    const getStatus = vi.fn()
      .mockResolvedValueOnce({ enabled: true, summariesEnabled: true })
      .mockRejectedValueOnce(new Error("status connection lost"));
    const setEnabled = vi.fn(async () => undefined);
    render(<SecuritySettings client={memoryClient()} auditClient={auditClient} documentOutlineClient={{ getStatus, setEnabled }} />);
    const outline = screen.getByTestId("document-outline-toggle");
    const summaries = screen.getByTestId("document-outline-summaries-toggle");
    await waitFor(() => expect(outline).toBeChecked());
    await user.click(outline);
    await screen.findByRole("alert");
    expect(outline).toBeDisabled();
    expect(summaries).toBeDisabled();
    await user.click(summaries);
    expect(setEnabled).toHaveBeenCalledTimes(1);
    expect(setEnabled).toHaveBeenCalledWith(false, undefined);
  });
});
