import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, it } from "vitest";

const originalResponse = globalThis.Response;

it("keeps the SDK HTTP session, tool calls and error responses compatible", async () => {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const { z } = await import("zod");
  const mcp = new McpServer({ name: "adapter-compatibility", version: "1.0.0" });
  mcp.registerTool("echo", { inputSchema: { text: z.string() } }, async ({ text }) => ({
    content: [{ type: "text", text }],
  }));
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
  });
  const client = new Client({ name: "compatibility-client", version: "1.0.0" }, { capabilities: {} });
  const http = createServer((request, response) => {
    void transport.handleRequest(request, response).catch((error: unknown) => {
      response.writeHead(500);
      response.end(String(error));
    });
  });
  try {
    await mcp.connect(transport);
    await new Promise<void>((ready) => http.listen(0, "127.0.0.1", ready));
    const url = new URL(`http://127.0.0.1:${(http.address() as AddressInfo).port}/mcp`);
    const clientTransport = new StreamableHTTPClientTransport(url);
    await client.connect(clientTransport);
    expect(clientTransport.sessionId).toEqual(expect.any(String));
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("echo");
    expect((await client.callTool({ name: "echo", arguments: { text: "adapter round trip" } })).content)
      .toEqual([{ type: "text", text: "adapter round trip" }]);

    const malformed = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": clientTransport.sessionId!,
      },
      body: "{",
    });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe(-32700);
    const badSession = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": "unknown-session",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "ping" }),
    });
    expect(badSession.status).toBe(404);
    await badSession.text();
    expect(globalThis.Response).toBe(originalResponse);
  } finally {
    await client.close();
    await mcp.close();
    http.closeAllConnections();
    await new Promise<void>((done, reject) => http.close((error) => error ? reject(error) : done()));
  }
});
