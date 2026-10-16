import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { marked } from "marked";

const escape = (text) => String(text).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const slug = (text) => text.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const readText = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

export function renderHandbook(source, root) {
  const markdown = readText(source);
  const sourceRoot = join(root, "docs/handbooks/_sources");
  const config = JSON.parse(readText(join(sourceRoot, "storyboards.json")));
  const name = basename(source, ".md");
  const storyboard = config.handbooks[name];
  if (!storyboard || !storyboard.slides.length || storyboard.slides.length > storyboard.ceiling) throw new Error(`Invalid storyboard: ${name}`);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Nexus handbook";
  const sections = [{ id: "intro", title, blocks: [] }];
  let section = sections[0];
  const tokens = marked.lexer(markdown, { gfm: true });
  const outputDirectory = join(root, "docs/handbooks/html", source.includes(`${join("handbooks", "technical")}`) ? "technical" : "");
  marked.walkTokens(tokens, (token) => {
    if (token.type !== "link" || !token.href || /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(token.href)) return;
    const [path, hash = ""] = token.href.split("#");
    const absolute = resolve(dirname(source), path);
    const handbookSource = [join(root, "docs/handbooks/markdown"), join(root, "docs/handbooks/technical")].find((directory) => absolute.startsWith(directory + "/") || absolute.startsWith(directory + "\\"));
    const target = handbookSource ? join(root, "docs/handbooks/html", handbookSource.endsWith("technical") ? "technical" : "", relative(handbookSource, absolute).replace(/\.md$/i, ".html")) : absolute;
    token.href = relative(outputDirectory, target).replace(/\\/g, "/") + (hash ? `#${hash}` : "");
  });
  for (const token of tokens) {
    if (token.type === "space" || (token.type === "heading" && token.depth === 1)) continue;
    if (token.type === "heading" && token.depth === 2) {
      const id = slug(token.text);
      if (sections.some((candidate) => candidate.id === id)) throw new Error(`Duplicate heading: ${id}`);
      section = { id, title: token.text, blocks: [] };
      sections.push(section);
    } else section.blocks.push(token);
  }
  const selected = new Set();
  const clone = (id) => `<div data-hb-clone="${escape(id)}"></div>`;
  const slides = storyboard.slides.map((slide, index) => {
    const sourceSection = sections.find((candidate) => candidate.id === slide.section);
    if (!sourceSection) throw new Error(`Missing section: ${slide.section}`);
    const holders = (slide.blocks ?? []).map((block) => {
      if (!sourceSection.blocks[block]) throw new Error(`Missing source block: ${slide.section}:${block}`);
      selected.add(`${slide.section}:${block}`);
      return clone(`hb-${slide.section}-${block}`);
    });
    for (const [block, indices] of Object.entries(slide.list_items ?? {})) {
      const list = sourceSection.blocks[block];
      if (list?.type !== "list") throw new Error(`Missing list: ${slide.section}:${block}`);
      const items = indices.map((item) => {
        if (!list.items[item]) throw new Error(`Missing list item: ${item}`);
        selected.add(`${slide.section}:${block}:${item}`);
        return `<li data-hb-clone="hb-${slide.section}-${block}-item-${item}"></li>`;
      }).join("");
      holders.push(`<${list.ordered ? "ol" : "ul"}>${items}</${list.ordered ? "ol" : "ul"}>`);
    }
    const heading = slide.title ?? sourceSection.title;
    return `<section data-dv-slide="${escape(slide.id)}" data-title="${escape(heading)}" data-theme="light" id="slide-${index + 1}" hidden inert aria-hidden="true">${index === 0 ? '<img class="hb-cover-mark" data-hb-brand alt="Nexus">' : ""}<h1>${escape(heading)}</h1><div class="hb-slide-content">${holders.join("")}</div></section>`;
  }).join("\n");
  // Every substantive source unit is covered or has an explicit balanced-depth omission.
  for (const current of sections) current.blocks.forEach((block, index) => {
    const key = `${current.id}:${index}`;
    if (selected.has(key) || storyboard.omissions[key]) return;
    if (block.type === "list" && block.items.every((_, item) => selected.has(`${key}:${item}`))) return;
    throw new Error(`Unaccounted presentation unit: ${name}/${key}`);
  });
  const body = sections.map((current, index) => {
    const target = storyboard.slides.find((slide) => slide.section === current.id);
    const heading = `<${index ? "h2" : "h1"} id="${current.id}">${escape(current.title)}</${index ? "h2" : "h1"}>`;
    const blocks = current.blocks.map((token, block) => {
      let html = token.type === "list" ? "" : marked.parser([token], { gfm: true });
      if (token.type === "list") {
        let item = 0;
        // Top-level list item tokens are rendered independently, retaining their source units.
        html = `<${token.ordered ? "ol" : "ul"}${token.ordered ? ` start="${token.start}"` : ""}>${token.items.map((entry) => `<li id="hb-${current.id}-${block}-item-${item++}">${marked.parser(entry.tokens, { gfm: true })}</li>`).join("")}</${token.ordered ? "ol" : "ul"}>`;
      }
      return `<div id="hb-${current.id}-${block}" data-hb-unit="${escape(`${current.id}:${block}`)}">${html}</div>`;
    }).join("\n");
    return `<section class="hb-reading-section" aria-labelledby="${current.id}">${heading}<button type="button" data-dv-chapter="${escape(target.id)}">Present chapter: ${escape(current.title)}</button>${blocks}</section>`;
  }).join("\n");
  const mark = readFileSync(join(root, "desktop/public/nexus-mark.png")).toString("base64");
  const brandedSlides = slides.replace('data-hb-brand', `src="data:image/png;base64,${mark}"`);
  const css = readText(join(sourceRoot, "dual-view.css"));
  const runtime = readText(join(sourceRoot, "dual-view-runtime.js"));
  const clones = readText(join(sourceRoot, "handbook-clones.js"));
  const styles = readText(join(sourceRoot, "handbook.css"));
  const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const digest = createHash("sha256").update(markdown).digest("hex");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="source-sha256" content="${digest}"><title>${escape(title)}</title><style>${css}\n${styles}</style></head>
<body><div data-dv-page><header class="hb-header"><img class="hb-mark" src="data:image/png;base64,${mark}" alt="Nexus" width="64" height="64"><nav aria-label="Handbook navigation"><a href="#intro">Contents</a><button type="button" data-dv-open>Presentation Mode</button></nav></header><main><div class="hb-title-action"><button type="button" data-dv-open>Presentation Mode</button></div>${body}</main><div class="hb-status" data-dv-status role="status"></div><footer><a href="#intro">Back to title</a></footer></div>
<div data-dv-deck hidden inert><div class="dv-stage">${brandedSlides}</div><div data-dv-controls><button type="button" data-dv-prev aria-label="Previous slide">${icon("M15 5l-7 7 7 7")}<span>Previous</span></button><span data-dv-count aria-live="polite"></span><label class="hb-picker-label">Slide <select data-dv-picker aria-label="Choose slide"></select></label><button type="button" data-dv-next aria-label="Next slide"><span>Next</span>${icon("M9 5l7 7-7 7")}</button><button type="button" data-dv-replay aria-label="Replay slide">${icon("M4 10a8 8 0 1 1 1 8M4 4v6h6")}<span>Replay</span></button><button type="button" data-dv-fullscreen aria-label="Toggle fullscreen">${icon("M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5")}<span>Fullscreen</span></button><button type="button" data-dv-exit aria-label="Exit presentation">${icon("M6 6l12 12M6 18L18 6")}<span>Exit presentation</span></button><div class="hb-status" data-dv-status role="status"></div></div></div>
<script>${clones}</script><script>${runtime}</script></body></html>
`;
}
