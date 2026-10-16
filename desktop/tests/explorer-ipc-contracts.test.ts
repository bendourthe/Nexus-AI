import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import { createIpcChatExplorerAdapter, createIpcChatExplorerClient } from "../src/modules/chat/ipcChatExplorerClient";
import { createIpcStudioExplorerClient } from "../src/shared/explorer/ipcStudioExplorerClient";
import { InMemoryStudioExplorerClient } from "../src/shared/explorer/studioExplorerClient";
import { studioClientAsChatExplorer } from "../src/shared/explorer/studioAsChatExplorer";
import type { StudioFolder, StudioSession, StudioTreeNode, StudioTurn } from "../../core/generations/StudioSessionStore.types";

let reply: unknown;
const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>): Promise<unknown> => reply);
beforeEach(() => {
  reply = undefined;
  invoke.mockReset();
  invoke.mockImplementation(async () => reply);
  setInvokeOverride(invoke);
});
afterEach(clearInvokeOverride);

function expectRequest(method: string, params: Record<string, unknown>): void {
  expect(invoke).toHaveBeenLastCalledWith("ipc_call", { method, params });
}

describe("chat explorer IPC contracts", () => {
  it("keeps folder mutations and both chat creation forms on their declared routes", async () => {
    const client = createIpcChatExplorerClient();
    reply = { id: "folder", parentId: null, name: "Work", createdAt: 1, updatedAt: 1 };
    expect(await client.createFolder(null, "Work")).toEqual(reply);
    expectRequest("chat.explorer.createFolder", { parentId: null, name: "Work" });
    await client.renameFolder("folder", "Renamed");
    expectRequest("chat.explorer.renameFolder", { id: "folder", name: "Renamed" });
    await client.moveFolder("folder", null);
    expectRequest("chat.explorer.moveFolder", { id: "folder", parentId: null });
    expect(await client.deleteFolder("folder")).toBeUndefined();
    expectRequest("chat.explorer.deleteFolder", { id: "folder" });
    const input = { folderId: null, title: "Draft", modelId: "local-model" };
    await client.createChat(input);
    expectRequest("chat.explorer.createChat", input);
    await client.createChat(null, "Draft", "local-model");
    expectRequest("chat.explorer.createChat", input);
    await client.renameChat("chat", "Chosen", true);
    expectRequest("chat.explorer.renameChat", { id: "chat", title: "Chosen", byUser: true });
    await client.renameChat("chat", "Automatic");
    expectRequest("chat.explorer.renameChat", { id: "chat", title: "Automatic" });
    await client.moveChat("chat", "folder");
    expectRequest("chat.explorer.moveChat", { id: "chat", folderId: "folder" });
    await client.deleteChat("chat");
    expectRequest("chat.explorer.deleteChat", { id: "chat" });
    await client.archiveChat?.("chat");
    expectRequest("sessions.archive", { pillar: "chatbot", id: "chat" });
    await client.setPersona("chat", null);
    expectRequest("chat.explorer.setPersona", { id: "chat", persona: null });
  });

  it("preserves null token counts, attachments and transcript envelopes", async () => {
    const client = createIpcChatExplorerClient();
    const input = { chatId: "chat", role: "assistant" as const, content: "answer", attachments: ["/local/image.png"], inputTokens: null, reasoningTokens: 2, reasoningText: "reason", outputTokens: 3, tokensEstimated: true };
    reply = { id: "message", ...input, createdAt: 1 };
    expect(await client.appendMessage(input)).toEqual(reply);
    expectRequest("chat.explorer.appendMessage", input);
    await client.appendMessage({ chatId: "chat", role: "user", content: "question", attachments: [] });
    expectRequest("chat.explorer.appendMessage", { chatId: "chat", role: "user", content: "question" });
    reply = { messages: [{ id: "message" }] };
    expect(await client.listMessages("chat", 7)).toEqual([{ id: "message" }]);
    expectRequest("chat.explorer.listMessages", { chatId: "chat", limit: 7 });
    await client.listMessages("chat");
    expectRequest("chat.explorer.listMessages", { chatId: "chat" });
    reply = { title: "Topic", source: "model" };
    expect(await client.generateTitle("chat", "question")).toEqual(reply);
    expectRequest("chat.generateTitle", { chatId: "chat", firstMessage: "question" });
  });

  it("rejects malformed search rows and propagates sidecar failures", async () => {
    const client = createIpcChatExplorerClient();
    const hit = { kind: "chat", id: "chat", name: "Topic", parentId: null };
    reply = { hits: [null, "bad", { ...hit, parentId: 7 }, hit] };
    expect(await client.search?.("topic", 4)).toEqual([hit]);
    expectRequest("chat.explorer.search", { query: "topic", limit: 4 });
    await client.search?.("topic");
    expectRequest("chat.explorer.search", { query: "topic" });
    invoke.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(client.tree()).rejects.toThrow("storage unavailable");
  });

  it("invalidates the production adapter's cached tree after a mutation", async () => {
    const adapter = createIpcChatExplorerAdapter();
    reply = { tree: { folder: null, children: [], chats: [] } };
    expect(await adapter.getChat("new")).toBeNull();
    expect(await adapter.getChat("new")).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
    const chat = { id: "new", folderId: null, title: "Topic", modelId: "local", contextScopeId: null, createdAt: 1, updatedAt: 1, messageCount: 0 };
    reply = chat;
    await adapter.createChat({ folderId: null, title: "Topic", modelId: "local" });
    reply = { tree: { folder: null, children: [], chats: [chat] } };
    expect(await adapter.getChat("new")).toEqual(chat);
    expectRequest("chat.explorer.tree", {});
    expect(invoke).toHaveBeenCalledTimes(3);
  });
});

const folder: StudioFolder = { id: "f", pillar: "image", parentId: null, name: "Work", createdAt: 1, updatedAt: 1 };
const session: StudioSession = { id: "s", pillar: "image", folderId: "f", title: "Fox", modelId: "local", lastOutputRef: null, turnCount: 1, createdAt: 1, updatedAt: 1 };
const tree: StudioTreeNode = { folder: null, sessions: [], children: [{ folder, sessions: [session], children: [] }] };

describe("Studio explorer IPC contracts", () => {
  it("uses the selected pillar for creation and routes mutations by identity", async () => {
    const client = createIpcStudioExplorerClient("image");
    reply = folder;
    expect(await client.createFolder({ parentId: null, name: "Work" })).toEqual(folder);
    expectRequest("studio.session.createFolder", { pillar: "image", parentId: null, name: "Work" });
    await client.renameFolder("f", "Renamed");
    expectRequest("studio.session.renameFolder", { id: "f", name: "Renamed" });
    await client.moveFolder("f", null);
    expectRequest("studio.session.moveFolder", { id: "f", parentId: null });
    await client.deleteFolder("f");
    expectRequest("studio.session.deleteFolder", { id: "f" });
    reply = session;
    expect(await client.createSession({ folderId: "f", title: "Fox", modelId: "local" })).toEqual(session);
    expectRequest("studio.session.createSession", { pillar: "image", folderId: "f", title: "Fox", modelId: "local" });
    await client.renameSession("s", "Edited");
    expectRequest("studio.session.renameSession", { id: "s", title: "Edited" });
    await client.moveSession("s", null);
    expectRequest("studio.session.moveSession", { id: "s", folderId: null });
    await client.deleteSession("s");
    expectRequest("studio.session.deleteSession", { id: "s" });
    await client.archiveSession("s");
    expectRequest("sessions.archive", { pillar: "images", id: "s" });
    await createIpcStudioExplorerClient("video").archiveSession("v");
    expectRequest("sessions.archive", { pillar: "videos", id: "v" });
  });

  it("finds nested identities and ancestors without inventing missing rows", async () => {
    const client = createIpcStudioExplorerClient("image");
    reply = { tree };
    expect(await client.listTree()).toEqual(tree);
    expectRequest("studio.session.tree", { pillar: "image" });
    expect(await client.getFolder("f")).toEqual(folder);
    expect(await client.getSession("s")).toEqual(session);
    expect(await client.ancestors("f")).toEqual([folder]);
    expect(await client.ancestors(null)).toEqual([]);
    expect(await client.ancestors("missing")).toEqual([]);
    expect(await client.getFolder("missing")).toBeNull();
    expect(await client.getSession("missing")).toBeNull();
  });

  it("round-trips media and usage while retaining the list limit", async () => {
    const client = createIpcStudioExplorerClient("image");
    const input = { sessionId: "s", role: "assistant" as const, content: "done", mediaRef: "/local/fox.png", inputTokens: null, reasoningTokens: 2, reasoningText: "reason", outputTokens: 3, tokensEstimated: true, visualUnits: 1 };
    reply = { id: "turn", ...input, createdAt: 1 };
    expect(await client.appendTurn?.(input)).toEqual(reply);
    expectRequest("studio.session.appendTurn", input);
    await client.appendTurn?.({ sessionId: "s", role: "user", content: "fox" });
    expectRequest("studio.session.appendTurn", { sessionId: "s", role: "user", content: "fox", mediaRef: null });
    reply = { turns: [{ id: "turn" }] };
    expect(await client.listTurns?.("s", 9)).toEqual([{ id: "turn" }]);
    expectRequest("studio.session.listTurns", { sessionId: "s", limit: 9 });
    await client.listTurns?.("s");
    expectRequest("studio.session.listTurns", { sessionId: "s" });
    invoke.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(client.listTree()).rejects.toThrow("storage unavailable");
  });
});

describe("Studio sessions adapted for the shared explorer", () => {
  it("preserves synchronous reads, nesting, rename intent and media through mutations", async () => {
    const inner = new InMemoryStudioExplorerClient("image");
    const client = studioClientAsChatExplorer(inner);
    const parent = await client.createFolder({ parentId: null, name: "Work" });
    const child = await client.createFolder({ parentId: parent.id, name: "Drafts" });
    const chat = await client.createChat({ folderId: child.id, title: "Fox", modelId: "local" });
    expect(client.listTree()).not.toBeInstanceOf(Promise);
    expect(await client.getFolder(child.id)).toMatchObject({ name: "Drafts" });
    expect((await client.ancestors(child.id)).map((f) => f.id)).toEqual([parent.id, child.id]);
    expect(await client.ancestors(null)).toEqual([]);
    expect(await client.getChat("missing")).toBeNull();
    expect(await client.getFolder("missing")).toBeNull();
    expect(await client.renameChat(chat.id, "Chosen fox", true)).toMatchObject({ userRenamed: true });
    await client.renameFolder(child.id, "Edits");
    await client.moveFolder(child.id, null);
    await client.moveChat(chat.id, child.id);
    expect(await client.search(" fox ")).toEqual([{ kind: "chat", id: chat.id, name: "Chosen fox", parentId: child.id }]);
    expect(await client.search(" ")).toEqual([]);
    expect(await client.search("e", 1)).toHaveLength(1);
    const appended = await client.appendMessage?.({ chatId: chat.id, role: "assistant", content: "done", attachments: ["/local/fox.png"], inputTokens: null, outputTokens: 3 });
    expect(appended).toMatchObject({ chatId: chat.id, attachments: ["/local/fox.png"], inputTokens: null, outputTokens: 3 });
    expect(await client.listMessages?.(chat.id)).toEqual([appended]);
    await client.archiveChat?.(chat.id);
    expect(await client.getChat(chat.id)).toBeNull();
    const removed = await client.createChat({ folderId: child.id, title: "Remove", modelId: "local" });
    await client.deleteChat(removed.id);
    await client.deleteFolder(child.id);
    expect(await client.getFolder(child.id)).toBeNull();
  });

  it("maps asynchronous IPC replies and reports missing transcript capabilities", async () => {
    const raw = createIpcStudioExplorerClient("image");
    const client = studioClientAsChatExplorer(raw);
    reply = { tree };
    expect(client.listTree()).toBeInstanceOf(Promise);
    expect(await client.getChat("s")).toMatchObject({ id: "s", messageCount: 1 });
    expect(await client.getFolder("f")).toMatchObject({ id: "f", color: null, icon: null });
    expect(await client.ancestors("f")).toHaveLength(1);
    reply = { turns: [{ id: "t", sessionId: "s", role: "assistant", content: "text", mediaRef: null, createdAt: 1 } satisfies StudioTurn] };
    expect(await client.listMessages?.("s")).toMatchObject([{ chatId: "s", attachments: [] }]);
    delete raw.appendTurn;
    delete raw.listTurns;
    expect(() => client.appendMessage?.({ chatId: "s", role: "user", content: "question" })).toThrow("appendTurn is not available");
    expect(client.listMessages?.("s")).toEqual([]);
  });
});
