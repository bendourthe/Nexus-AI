/**
 * The one HTML sanitiser for untrusted artifact and message markup.
 *
 * Callers import this module. They do not import DOMPurify themselves, and
 * they do not keep a second copy of FORBIDDEN_TAGS.
 */

import DOMPurify from "isomorphic-dompurify";

/** Byte-identical list. Adding or removing a tag is a security change. */
export const FORBIDDEN_TAGS = ["style", "iframe", "object", "embed", "link", "meta", "base"] as const;

export function sanitizeArtifactHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [...FORBIDDEN_TAGS],
  });
}
