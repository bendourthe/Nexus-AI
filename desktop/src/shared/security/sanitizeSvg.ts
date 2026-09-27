/**
 * SVG profile for diagram output. Separate from the HTML artifact profile
 * so that profile's forbidden-tag list is not relaxed to admit Mermaid CSS.
 */

import DOMPurify from "isomorphic-dompurify";

export const SVG_FORBID_TAGS = ["foreignObject", "script", "use", "animate", "set", "iframe"] as const;

export const SVG_FORBID_ATTRS = ["href", "xlink:href"] as const;

export function sanitizeSvg(svg: string): string {
  const cleaned = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [...SVG_FORBID_TAGS],
    FORBID_ATTR: [...SVG_FORBID_ATTRS],
  });
  return stripAnchors(cleaned);
}

function stripAnchors(svg: string): string {
  return svg
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
}
