/**
 * v2.11.0 Phase 2 (T004) -- seeded generator for the document-outline fixtures.
 *
 * Every fixture is original text from a seeded word list, so nothing
 * third-party is committed. PDFs are written by a minimal text-layer PDF
 * writer and DOCX files by a minimal STORE zip writer, because the repo has no
 * declared PDF or zip dependency. The scanned (image-only) PDF is produced
 * afterwards by `scripts/rasterize-scan-fixture.py` from `scan-source.pdf`.
 *
 * Run: npx vite-node scripts/generate-outline-fixtures.ts
 *
 * Large shapes (5,000 headings, 5,000-level nesting, >200 pages) are exported
 * as functions and generated at test time, never committed.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";

export const FIXTURE_SEED = 2110;

export interface ExpectedHeading {
  readonly title: string;
  readonly level: number;
  readonly startPage: number;
  /** First words of the section body, used by the navigation check. */
  readonly firstWords: string;
}

export interface ExpectedFile {
  readonly file: string;
  readonly kind: "markdown" | "text" | "pdf" | "docx" | "scan" | "binary";
  readonly pageCount: number;
  readonly headings: readonly ExpectedHeading[];
}

export interface GeneratedFixture {
  readonly name: string;
  readonly bytes: Buffer;
  readonly expected: ExpectedFile;
}

// ---------------------------------------------------------------- randomness

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  "system value module setting device signal record channel buffer report " +
  "operator network storage index schedule profile sensor engine output input " +
  "control status limit range window option manual review sample cycle factor " +
  "service layer queue power memory driver measure handle filter stream config"
).split(" ");

const TOPICS = [
  "Introduction", "Installation", "Configuration", "Network Settings",
  "Storage Layout", "Scheduling", "Monitoring", "Troubleshooting",
  "Security Model", "Backup and Restore", "Performance Tuning", "Maintenance",
  "Calibration", "Reporting", "Appendix Notes", "Glossary Terms",
];

export function sentence(rand: () => number, words = 12): string {
  const out: string[] = [];
  for (let i = 0; i < words; i += 1) {
    out.push(WORDS[Math.floor(rand() * WORDS.length)] ?? "value");
  }
  const first = out[0] ?? "value";
  out[0] = first.charAt(0).toUpperCase() + first.slice(1);
  return `${out.join(" ")}.`;
}

function paragraph(rand: () => number, sentences: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sentences; i += 1) parts.push(sentence(rand, 8 + Math.floor(rand() * 8)));
  return parts.join(" ");
}

function firstWordsOf(text: string): string {
  return text.split(/\s+/).slice(0, 6).join(" ");
}

// ---------------------------------------------------------------- PDF writer

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface PdfLine {
  readonly text: string;
  readonly size: number;
  readonly bold: boolean;
}

/** Minimal text-layer PDF: one content stream per page, base-14 fonts only. */
export function writeTextPdf(pages: readonly (readonly PdfLine[])[]): Buffer {
  const objects: string[] = [];
  const add = (body: string): number => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  for (const lines of pages) {
    let y = 760;
    const ops: string[] = [];
    for (const line of lines) {
      ops.push(`BT /${line.bold ? "F2" : "F1"} ${line.size} Tf 56 ${y} Td (${pdfEscape(line.text)}) Tj ET`);
      y -= line.size + 4;
    }
    const stream = ops.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] ` +
          `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// ---------------------------------------------------------------- zip / DOCX

/** Minimal STORE-only zip with a fixed timestamp, so output is byte-stable. */
export function writeZip(entries: readonly { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, entry.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + entry.data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function xmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function writeDocx(paragraphs: readonly { style: "Heading1" | "Heading2" | "Normal"; text: string }[]): Buffer {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const body = paragraphs
    .map(
      (p) =>
        `<w:p>${p.style === "Normal" ? "" : `<w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>`}` +
        `<w:r><w:t xml:space="preserve">${xmlEscape(p.text)}</w:t></w:r></w:p>`,
    )
    .join("");
  const style = (id: string, name: string): string =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/></w:style>`;
  const files: { name: string; data: Buffer }[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
          "</Types>",
      ),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "word/_rels/document.xml.rels",
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "word/styles.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>` +
          style("Normal", "Normal") +
          style("Heading1", "heading 1") +
          style("Heading2", "heading 2") +
          "</w:styles>",
      ),
    },
    {
      name: "word/document.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}</w:body></w:document>`,
      ),
    },
  ];
  return writeZip(files);
}

// ---------------------------------------------------------------- documents

interface Section {
  readonly title: string;
  readonly level: number;
  readonly body: string[];
}

function makeSections(rand: () => number, chapters: number, sectionsPer: number, parasPer: number): Section[] {
  const out: Section[] = [];
  for (let c = 1; c <= chapters; c += 1) {
    const topic = TOPICS[(c - 1) % TOPICS.length] ?? "Topic";
    out.push({ title: `${c} ${topic}`, level: 1, body: [paragraph(rand, 3)] });
    for (let s = 1; s <= sectionsPer; s += 1) {
      const sub = TOPICS[(c + s * 3) % TOPICS.length] ?? "Detail";
      const body: string[] = [];
      for (let p = 0; p < parasPer; p += 1) body.push(paragraph(rand, 4 + Math.floor(rand() * 3)));
      out.push({ title: `${c}.${s} ${sub} Details`, level: 2, body });
    }
  }
  return out;
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line.length + word.length + 1 > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Lay sections out into PDF pages; chapters start on a new page. */
export function layoutPdf(
  sections: readonly Section[],
  opts: { readonly linesPerPage: number; readonly withToc: boolean; readonly title: string },
): { pages: PdfLine[][]; headings: ExpectedHeading[] } {
  const body: PdfLine[][] = [[]];
  const headings: ExpectedHeading[] = [];
  const tocPages = opts.withToc ? Math.max(1, Math.ceil((sections.length + 3) / opts.linesPerPage)) : 0;
  const push = (line: PdfLine): void => {
    const page = body[body.length - 1] ?? [];
    if (page.length >= opts.linesPerPage) body.push([line]);
    else page.push(line);
  };
  for (const section of sections) {
    const current = body[body.length - 1] ?? [];
    if (section.level === 1 && current.length > 0) body.push([]);
    push({ text: section.title, size: section.level === 1 ? 16 : 13, bold: true });
    headings.push({
      title: section.title,
      level: section.level,
      startPage: tocPages + body.length,
      firstWords: firstWordsOf(section.body[0] ?? ""),
    });
    for (const para of section.body) {
      for (const line of wrap(para, 88)) push({ text: line, size: 10, bold: false });
      push({ text: "", size: 10, bold: false });
    }
  }
  const total = tocPages + body.length;
  const pages: PdfLine[][] = [];
  if (opts.withToc) {
    const toc: PdfLine[] = [
      { text: opts.title, size: 18, bold: true },
      { text: "Contents", size: 13, bold: true },
    ];
    for (const h of headings) toc.push({ text: `${h.title} .......... ${h.startPage}`, size: 10, bold: false });
    for (let i = 0; i < tocPages; i += 1) pages.push(toc.slice(i * opts.linesPerPage, (i + 1) * opts.linesPerPage));
  }
  body.forEach((lines, i) => {
    pages.push([...lines, { text: "", size: 9, bold: false }, { text: `Page ${tocPages + i + 1} of ${total}`, size: 9, bold: false }]);
  });
  return { pages, headings };
}

function markdownFrom(sections: readonly Section[]): string {
  return sections.map((s) => `${"#".repeat(s.level + 1)} ${s.title}\n\n${s.body.join("\n\n")}\n`).join("\n");
}

function headingsFromMarkdownSections(sections: readonly Section[], offset = 0): ExpectedHeading[] {
  return sections.map((s) => ({ title: s.title, level: s.level + offset, startPage: 1, firstWords: firstWordsOf(s.body[0] ?? "") }));
}

export function generateFixtures(seed: number = FIXTURE_SEED): GeneratedFixture[] {
  const rand = mulberry32(seed);
  const out: GeneratedFixture[] = [];

  // Markdown with three heading levels (document title at level 0 is "#").
  const mdSections = makeSections(rand, 4, 3, 2);
  const md = `# Operator Handbook\n\n${markdownFrom(mdSections)}`;
  out.push({
    name: "handbook.md",
    bytes: Buffer.from(md, "utf8"),
    expected: {
      file: "handbook.md",
      kind: "markdown",
      pageCount: 1,
      headings: [
        { title: "Operator Handbook", level: 1, startPage: 1, firstWords: "" },
        ...headingsFromMarkdownSections(mdSections, 1),
      ],
    },
  });

  // Plain text with numbered section titles.
  const txtSections = makeSections(rand, 3, 2, 2);
  const txt = txtSections.map((s) => `${s.title}\n\n${s.body.join("\n\n")}\n`).join("\n");
  out.push({
    name: "notes.txt",
    bytes: Buffer.from(txt, "utf8"),
    expected: { file: "notes.txt", kind: "text", pageCount: 1, headings: headingsFromMarkdownSections(txtSections) },
  });

  // Born-digital PDF, 60+ pages, with a table of contents, tables, and lists.
  const longSections = makeSections(rand, 8, 3, 17).map((s, i) =>
    i % 4 === 2
      ? { ...s, body: [...s.body, "Port | Protocol | Default", "8080 | http | enabled", "8443 | https | disabled", "- check the cable", "- restart the service"] }
      : s,
  );
  const long = layoutPdf(longSections, { linesPerPage: 46, withToc: true, title: "Field Service Manual" });
  out.push({
    name: "manual-60p.pdf",
    bytes: writeTextPdf(long.pages),
    expected: { file: "manual-60p.pdf", kind: "pdf", pageCount: long.pages.length, headings: long.headings },
  });

  // Short PDF.
  const shortSections = makeSections(rand, 2, 2, 2);
  const short = layoutPdf(shortSections, { linesPerPage: 46, withToc: false, title: "Quick Guide" });
  out.push({
    name: "quick-guide.pdf",
    bytes: writeTextPdf(short.pages),
    expected: { file: "quick-guide.pdf", kind: "pdf", pageCount: short.pages.length, headings: short.headings },
  });

  // Source for the scanned fixture (rasterized by the Python helper).
  const scanSections = makeSections(rand, 4, 2, 7);
  const scan = layoutPdf(scanSections, { linesPerPage: 40, withToc: false, title: "Scanned Procedures" });
  out.push({
    name: "scan-source.pdf",
    bytes: writeTextPdf(scan.pages),
    expected: { file: "scan-10p.pdf", kind: "scan", pageCount: scan.pages.length, headings: scan.headings },
  });

  // DOCX with heading styles.
  const docxSections = makeSections(rand, 3, 2, 2);
  const paras = docxSections.flatMap((s) => [
    { style: (s.level === 1 ? "Heading1" : "Heading2") as "Heading1" | "Heading2", text: s.title },
    ...s.body.map((text) => ({ style: "Normal" as const, text })),
  ]);
  out.push({
    name: "policy.docx",
    bytes: writeDocx(paras),
    expected: { file: "policy.docx", kind: "docx", pageCount: 3, headings: headingsFromMarkdownSections(docxSections) },
  });

  // Failure shapes.
  const plain = [paragraph(rand, 5), paragraph(rand, 5), paragraph(rand, 5)].join("\n\n");
  out.push({ name: "no-headings.md", bytes: Buffer.from(plain, "utf8"), expected: { file: "no-headings.md", kind: "markdown", pageCount: 1, headings: [] } });

  const repeated = ["Overview", "Overview", "Overview"].map((t) => `## ${t}\n\n${paragraph(rand, 2)}\n`).join("\n");
  out.push({
    name: "repeated-headings.md",
    bytes: Buffer.from(repeated, "utf8"),
    expected: {
      file: "repeated-headings.md",
      kind: "markdown",
      pageCount: 1,
      headings: [1, 2, 3].map(() => ({ title: "Overview", level: 2, startPage: 1, firstWords: "" })),
    },
  });

  const fenced = `## Real Heading\n\n${paragraph(rand, 2)}\n\n\`\`\`bash\n# not a heading\necho ok\n\`\`\`\n\n    # indented code, not a heading\n\n## Second Heading\n\n${paragraph(rand, 2)}\n`;
  out.push({
    name: "fenced-code.md",
    bytes: Buffer.from(fenced, "utf8"),
    expected: {
      file: "fenced-code.md",
      kind: "markdown",
      pageCount: 1,
      headings: [
        { title: "Real Heading", level: 2, startPage: 1, firstWords: "" },
        { title: "Second Heading", level: 2, startPage: 1, firstWords: "" },
      ],
    },
  });

  const marker = `## Only Heading\n\n${paragraph(rand, 2)}\n\nPage 7 of 60\n\n\f\n\n${paragraph(rand, 2)}\n`;
  out.push({
    name: "page-marker-literal.md",
    bytes: Buffer.from(marker, "utf8"),
    expected: { file: "page-marker-literal.md", kind: "markdown", pageCount: 1, headings: [{ title: "Only Heading", level: 2, startPage: 1, firstWords: "" }] },
  });

  const crlf = `${String.fromCharCode(0xfeff)}## Windows Heading\r\n\r\n${paragraph(rand, 2)}\r\n\r\n## Second\r\n\r\n${paragraph(rand, 2)}\r\n`;
  out.push({
    name: "bom-crlf.md",
    bytes: Buffer.from(crlf, "utf8"),
    expected: {
      file: "bom-crlf.md",
      kind: "markdown",
      pageCount: 1,
      headings: [
        { title: "Windows Heading", level: 2, startPage: 1, firstWords: "" },
        { title: "Second", level: 2, startPage: 1, firstWords: "" },
      ],
    },
  });

  const binary = Buffer.alloc(512);
  for (let i = 0; i < binary.length; i += 1) binary[i] = Math.floor(rand() * 256);
  binary[3] = 0;
  out.push({ name: "binary-renamed.txt", bytes: binary, expected: { file: "binary-renamed.txt", kind: "binary", pageCount: 0, headings: [] } });

  return out;
}

// ---------------------------------------------------------------- large shapes (test time only)

export function makeManyHeadingsMarkdown(count: number): string {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) lines.push(`## Heading ${i}`, "", "body", "");
  return lines.join("\n");
}

export function makeNestedListMarkdown(depth: number): string {
  const lines: string[] = [];
  for (let i = 0; i < depth; i += 1) lines.push(`${"  ".repeat(i)}- level ${i + 1}`);
  return lines.join("\n");
}

export function makeLongPdf(pageCount: number, seed: number = FIXTURE_SEED): Buffer {
  const rand = mulberry32(seed + 1);
  const pages: PdfLine[][] = [];
  for (let p = 1; p <= pageCount; p += 1) {
    pages.push([
      { text: `${p} Section ${p}`, size: 13, bold: true },
      { text: sentence(rand), size: 10, bold: false },
    ]);
  }
  return writeTextPdf(pages);
}

// ---------------------------------------------------------------- CLI

export function writeFixtures(root: string, seed: number = FIXTURE_SEED): string[] {
  const docsDir = join(root, "docs");
  const expectedDir = join(root, "expected");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(expectedDir, { recursive: true });
  const written: string[] = [];
  for (const fixture of generateFixtures(seed)) {
    writeFileSync(join(docsDir, fixture.name), fixture.bytes);
    writeFileSync(
      join(expectedDir, `${fixture.expected.file}.json`),
      `${JSON.stringify(fixture.expected, null, 2)}\n`,
    );
    written.push(fixture.name);
  }
  return written;
}

const HERE = dirname(fileURLToPath(import.meta.url));
// vite-node does not put the script path in argv, so "imported by Vitest" is
// the reliable signal that this module is not the entry point.
if (!process.env["VITEST"]) {
  const root = resolve(HERE, "../tests/fixtures/documents/outline");
  const written = writeFixtures(root);
  process.stdout.write(`wrote ${written.length} fixtures to ${root}\n`);
}
