/**
 * Export-time sanitise. Independent of the in-app SVG pass: an exported file
 * is opened outside the shell, so the bytes have to be safe on their own.
 * This module does not fetch remote images or fonts.
 */

import { sanitizeSvg } from "../security/sanitizeSvg";

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export interface DiagramSaveRequest {
  readonly suggestedName: string;
  readonly bytesBase64: string;
  readonly extension: "svg" | "png";
  readonly path?: string;
}

export type DiagramSaver = (request: DiagramSaveRequest) => Promise<string>;

export function sanitizeExportFilename(raw: string, extension: "svg" | "png"): string {
  const leaf = raw.split(/[/\\]/).pop() ?? "diagram";
  let cleaned = leaf.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
  const stem = cleaned.split(".")[0] ?? "";
  if (!cleaned || RESERVED.test(stem)) cleaned = "diagram";
  if (!cleaned.toLowerCase().endsWith(`.${extension}`)) {
    cleaned = `${cleaned}.${extension}`;
  }
  return cleaned;
}

export function sanitizeExportSvg(svg: string): string {
  let out = sanitizeSvg(svg);
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  out = out.replace(/url\(\s*['"]?https?:[^)]*\)/gi, "none");
  out = out.replace(/https?:\/\/[^\s"'<>)]+/gi, "");
  out = out.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  out = out.replace(/<!ENTITY[\s\S]*?>/gi, "");
  return out;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function assertNoHttpScheme(bytes: string): void {
  const withoutNamespace = bytes.split(SVG_NAMESPACE).join("");
  if (/https?:/i.test(withoutNamespace)) {
    throw new Error("refusing to write a diagram that still contains an http scheme");
  }
}

/**
 * Rasterise without resolving remote images or fonts. `draw` is the only
 * pixel path. It receives the sanitised SVG and must not fetch.
 */
export async function rasterizeSanitizedSvg(
  svg: string,
  draw: (sanitized: string) => Promise<Uint8Array> | Uint8Array,
): Promise<Uint8Array> {
  const sanitized = sanitizeExportSvg(svg);
  assertNoHttpScheme(sanitized);
  return draw(sanitized);
}

export async function saveDiagram(
  saver: DiagramSaver,
  input: { suggestedName: string; svg: string; extension: "svg" | "png"; pngBytes?: Uint8Array },
): Promise<string> {
  const svg = sanitizeExportSvg(input.svg);
  assertNoHttpScheme(svg);
  const bytes =
    input.extension === "png"
      ? (input.pngBytes ?? new TextEncoder().encode(svg))
      : new TextEncoder().encode(svg);
  if (bytes.byteLength === 0) throw new Error("refusing to write an empty file");
  const payload = bytesToBase64(bytes);
  return saver({
    suggestedName: sanitizeExportFilename(input.suggestedName, input.extension),
    bytesBase64: payload,
    extension: input.extension,
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
