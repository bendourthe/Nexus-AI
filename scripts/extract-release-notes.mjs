import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION = /^v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/;

function normalizeVersion(value) {
  const match = typeof value === "string" ? VERSION.exec(value) : null;
  if (!match || match[0] !== value || match[2]?.split(".").some((part) => /^0\d+$/.test(part))) {
    throw new Error(`Invalid release version: ${JSON.stringify(value)}`);
  }
  return match[1];
}

/** Extract an exact H1/H2 release section without consuming another release. */
export function extractReleaseNotes(changelog, version) {
  const wanted = normalizeVersion(version);
  const lines = changelog.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const sections = [];
  let fence = null;
  let comment = null;
  let inlineCodeRemaining = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && marker[2].trim() === "") fence = null;
      continue;
    }
    if (marker && !comment && inlineCodeRemaining === 0) {
      fence = { character: marker[1][0], length: marker[1].length, index };
      continue;
    }
    let cursor = Math.min(inlineCodeRemaining, line.length);
    let visibleLine = " ".repeat(cursor);
    inlineCodeRemaining = Math.max(0, inlineCodeRemaining - line.length - 1);
    while (cursor < line.length) {
      if (comment) {
        const end = line.indexOf("-->", cursor);
        const nextCursor = end < 0 ? line.length : end + 3;
        visibleLine += " ".repeat(nextCursor - cursor);
        cursor = nextCursor;
        if (end >= 0) comment = null;
      } else {
        const start = line.indexOf("<!--", cursor);
        let codeSpan = null;
        if (line.slice(cursor).includes("`")) {
          const paragraph = [line.slice(cursor)];
          // Inline code can span soft line breaks, but never a new Markdown block.
          for (let following = index + 1; following < lines.length; following += 1) {
            if (/^\s*$|^ {0,3}(?:#{1,6}(?:[ \t]|$)|`{3,}|~{3,}|>|<!--|(?:[-+*]|\d+[.)])[ \t])/.test(lines[following])) break;
            paragraph.push(lines[following]);
          }
          codeSpan = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/.exec(paragraph.join("\n"));
        }
        if (codeSpan && codeSpan.index < line.length - cursor && (start < 0 || cursor + codeSpan.index < start)) {
          const end = cursor + codeSpan.index + codeSpan[0].length;
          visibleLine += line.slice(cursor, cursor + codeSpan.index) + " ".repeat(Math.min(codeSpan[0].length, line.length - cursor - codeSpan.index));
          inlineCodeRemaining = Math.max(0, end - line.length - 1);
          cursor = Math.min(end, line.length);
          continue;
        }
        if (start < 0) {
          visibleLine += line.slice(cursor);
          break;
        }
        visibleLine += `${line.slice(cursor, start)}    `;
        cursor = start + 4;
        comment = { index };
      }
    }
    const heading = /^ {0,3}#{1,2}[ \t]+(?:\[([^\]\r\n]+)\](?:\([^\r\n)]*\))?|([^ \t]+))(?:[ \t].*)?$/.exec(visibleLine);
    if (!heading) continue;
    try {
      sections.push({ version: normalizeVersion(heading[1] ?? heading[2]), index });
    } catch {
      // Ordinary subsection headings are not release boundaries.
    }
  }
  const matches = sections.filter((section) => section.version === wanted);
  if (matches.length === 0) throw new Error(`Missing CHANGELOG section for ${wanted}`);
  if (matches.length > 1) throw new Error(`Duplicate CHANGELOG sections for ${wanted}`);
  const section = matches[0];
  const next = sections[sections.indexOf(section) + 1];
  if (fence && fence.index > section.index && (!next || fence.index < next.index)) {
    throw new Error(`Unclosed fenced block in CHANGELOG section for ${wanted}`);
  }
  if (comment && comment.index >= section.index && (!next || comment.index < next.index)) {
    throw new Error(`Unclosed HTML comment in CHANGELOG section for ${wanted}`);
  }
  const body = lines.slice(section.index + 1, next?.index ?? lines.length);
  while (body.length && body[0].trim() === "") body.shift();
  while (body.length && body.at(-1).trim() === "") body.pop();
  if (body.length === 0) throw new Error(`Empty CHANGELOG section for ${wanted}`);
  return `${body.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 3) throw new Error("Usage: node scripts/extract-release-notes.mjs <version> <changelog> <output>");
    const [version, changelog, output] = args;
    const notes = extractReleaseNotes(readFileSync(changelog, "utf8"), version);
    writeFileSync(output, notes, "utf8");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
