/**
 * Asks the shell's loopback capture server for a PNG of the Nexus window.
 * The URL must be loopback. The token is the one the shell put in the child
 * environment. This client never accepts a host that is not the local machine.
 */

import { WindowCaptureError, type WindowCaptureRequest, type WindowCaptureResult } from "./jsonCliRoutes.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function assertLoopbackCaptureUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new WindowCaptureError(503, "unavailable", "Nexus window capture URL is not a loopback URL");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(host)) {
    throw new WindowCaptureError(503, "unavailable", "Nexus window capture URL is not a loopback URL");
  }
  return url;
}

export async function captureNexusWindow(
  request: WindowCaptureRequest,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<WindowCaptureResult> {
  const rawUrl = env.NEXUS_WINDOW_CAPTURE_URL;
  const token = env.NEXUS_WINDOW_CAPTURE_TOKEN;
  if (!rawUrl || !token) {
    throw new WindowCaptureError(503, "unavailable", "Nexus window capture is not attached");
  }
  const url = assertLoopbackCaptureUrl(rawUrl);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new WindowCaptureError(503, "unavailable", `Nexus window capture did not answer: ${message}`);
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? response.status)
        : `Nexus window capture returned HTTP ${response.status}`;
    const code =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { code?: string } }).error?.code ?? "unavailable")
        : "unavailable";
    throw new WindowCaptureError(response.status === 400 ? 400 : 503, code, message);
  }
  return body as WindowCaptureResult;
}
