import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createLoadedContextProbe } from "../../../modules/coding/llm/headlessOllamaClient.js";

describe("loaded context probe response boundary", () => {
  it.each(["timeout", "cancel"])("releases an incomplete body after %s", async (mode) => {
    let headersArrived!: () => void;
    const headers = new Promise<void>((resolve) => { headersArrived = resolve; });
    const server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.flushHeaders();
      response.write("{");
      headersArrived();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address() as AddressInfo;
      const controller = new AbortController();
      const probe = createLoadedContextProbe({ baseUrl: `http://127.0.0.1:${address.port}`, timeoutMs: mode === "timeout" ? 100 : 5_000 });
      const result = probe("fixture-model", controller.signal);
      await headers;
      if (mode === "cancel") controller.abort();
      await expect(result).resolves.toBeNull();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 2_000);
});
