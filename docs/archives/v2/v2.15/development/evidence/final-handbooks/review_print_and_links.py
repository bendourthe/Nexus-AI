"""Additional offline print, link and navigation evidence."""
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

import pypdfium2 as pdfium
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[7]
OUT = Path(__file__).resolve().parent / "iteration2"
MAP = json.loads((ROOT / "docs/handbooks/handbooks.json").read_text())
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for entry in MAP["handbooks"]:
        item = {"id": entry["id"]}
        page = browser.new_page(viewport={"width":1366,"height":768})
        page.goto((ROOT / entry["output"]).as_uri())
        page.wait_for_selector("html[data-dv-ready]")
        links = page.locator("[data-dv-page] a[href]").evaluate_all("es=>es.map(e=>({text:e.textContent,href:e.href}))")
        missing = []
        for link in links:
            url = urlsplit(link["href"])
            if url.scheme == "file":
                pathname = unquote(url.path).lstrip("/")
                if not Path(pathname).is_file(): missing.append(link)
        item["missingFileLinks"] = missing
        page.locator("[data-dv-open]").first.click()
        page.wait_for_timeout(750)
        item["normalMotionInvisible"] = page.locator("[data-dv-slide]:not([hidden])").evaluate("s=>Array.from(s.querySelectorAll('h1,p,li,td')).filter(e=>getComputedStyle(e).opacity==='0').length")
        page.keyboard.press("ArrowRight")
        item["keyboardNext"] = page.locator("[data-dv-count]").inner_text()
        page.keyboard.press("Home")
        item["keyboardHome"] = page.locator("[data-dv-count]").inner_text()
        page.keyboard.press("End")
        item["keyboardEnd"] = page.locator("[data-dv-count]").inner_text()
        page.keyboard.press("Escape")
        page.evaluate("()=>{document.querySelector('[data-dv-deck]').requestFullscreen=()=>Promise.reject(new Error('reviewed fallback'));}")
        page.locator("[data-dv-open]").first.click()
        page.wait_for_timeout(100)
        item["fullscreenFailureFallback"] = page.locator("[data-dv-deck] [data-dv-status]").inner_text()
        item["fallbackDeckVisible"] = page.locator("[data-dv-deck]").is_visible()
        page.close()

        context = browser.new_context(java_script_enabled=False,viewport={"width":1366,"height":768})
        nojs = context.new_page()
        nojs.goto((ROOT / entry["output"]).as_uri())
        headings = nojs.locator("main h1,main h2").all_text_contents()
        item["noJsHeadings"] = headings
        item["noJsPageVisible"] = nojs.locator("[data-dv-page]").is_visible()
        item["noJsDeckHidden"] = not nojs.locator("[data-dv-deck]").is_visible()
        nojs.emulate_media(media="print")
        nojs.screenshot(path=str(OUT / (entry["id"]+"-nojs-print.png")),full_page=True)
        pdf = OUT / (entry["id"]+"-nojs-print.pdf")
        nojs.pdf(path=str(pdf),format="A4",print_background=True)
        reader = PdfReader(pdf)
        text = "".join(page.extract_text() or "" for page in reader.pages)
        norm = lambda value: re.sub(r"[^a-z0-9]","",value.lower())
        item["printPages"] = len(reader.pages)
        item["printMissingHeadings"] = [heading for heading in headings if norm(heading) not in norm(text)]
        rendered = pdfium.PdfDocument(pdf)
        for index in range(len(rendered)):
            rendered[index].render(scale=1.1).to_pil().save(OUT / f"{entry['id']}-pdf-page-{index+1}.png")
        rendered.close()
        context.close()
        results.append(item)
        print(entry["id"],"print",item["printPages"],"pages; missing links",len(missing),flush=True)
    browser.close()
(OUT / "print-navigation-observations.json").write_text(json.dumps(results,indent=2)+"\n",encoding="utf-8")
