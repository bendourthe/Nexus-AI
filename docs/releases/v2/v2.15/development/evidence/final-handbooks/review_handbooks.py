"""Local browser evidence for the final v2.15.4 handbook candidate."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[7]
OUT = Path(__file__).resolve().parent / (sys.argv[1] if len(sys.argv) > 1 else ".")
OUT.mkdir(parents=True, exist_ok=True)
MANIFEST = json.loads((ROOT / "docs/handbooks/handbooks.json").read_text())
VIEWPORTS = [(2560, 1300), (1920, 1080), (1366, 768), (761, 844), (760, 844), (390, 844)]
READING = """() => {
 const rect = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
 const sections=Array.from(document.querySelectorAll('.hb-reading-section'));
 return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,
 title:document.title,sections:sections.map(s=>({id:s.querySelector('h1,h2').id,text:s.innerText,box:rect(s),heading:rect(s.querySelector('h1,h2'))})),
 minBodyFont:Math.min(...Array.from(document.querySelectorAll('[data-dv-page] p,[data-dv-page] li,[data-dv-page] td')).map(e=>parseFloat(getComputedStyle(e).fontSize))),
 networkResources:performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/^https?:/.test(u)),
 sourceUnits:Array.from(document.querySelectorAll('[data-hb-unit]')).map(e=>e.dataset.hbUnit)};
}"""
SLIDE = """() => {
 const slide=document.querySelector('[data-dv-slide]:not([hidden])'), stage=document.querySelector('.dv-stage'), controls=document.querySelector('[data-dv-controls]');
 const r=slide.getBoundingClientRect(), s=stage.getBoundingClientRect(), c=controls.getBoundingClientRect();
 const children=Array.from(slide.querySelectorAll('h1,h2,p,li,td,th,img')).filter(e=>e.getClientRects().length);
 const rects=children.map(e=>e.getBoundingClientRect());
 return {id:slide.dataset.dvSlide,title:slide.querySelector('h1,h2').innerText,count:document.querySelector('[data-dv-count]').innerText,
 stage:{width:s.width,height:s.height,scrollHeight:stage.scrollHeight,clientHeight:stage.clientHeight,native:stage.hasAttribute('data-dv-native')},
 slide:{height:r.height,scrollHeight:slide.scrollHeight,top:r.top,bottom:r.bottom},controls:{top:c.top,bottom:c.bottom},
 minFont:Math.min(...children.filter(e=>e.tagName!=='IMG').map(e=>parseFloat(getComputedStyle(e).fontSize))),
 contentBottom:Math.max(...rects.map(b=>b.bottom)),contentRight:Math.max(...rects.map(b=>b.right)),
 emptyClones:Array.from(slide.querySelectorAll('[data-hb-clone]')).filter(e=>!e.textContent.trim()&&!e.querySelector('img,svg')).length,
 invisible:children.filter(e=>Number(getComputedStyle(e).opacity)===0).length,
 brand:!!slide.querySelector('img[data-hb-brand]'),fullscreen:!!document.fullscreenElement,
 status:Array.from(document.querySelectorAll('[data-dv-status]')).map(e=>e.innerText).filter(Boolean)};
}"""

def main():
    result = {"observedAt": datetime.now(timezone.utc).isoformat(), "browser": "Playwright bundled Chromium", "documents": [], "failures": []}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        result["browserVersion"] = browser.version
        for item in MANIFEST["handbooks"]:
            entry = {"id": item["id"], "output": item["output"], "sha256": hashlib.sha256((ROOT / item["output"]).read_bytes()).hexdigest(), "viewports": []}
            for width, height in VIEWPORTS:
                page = browser.new_page(viewport={"width": width, "height": height}, reduced_motion="reduce")
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto((ROOT / item["output"]).as_uri())
                page.wait_for_selector("html[data-dv-ready]")
                page.evaluate("async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})))}")
                reading = page.evaluate(READING)
                prefix = f"{item['id']}-{width}"
                page.screenshot(path=str(OUT / f"{prefix}-reading.png"), full_page=True)
                if width in (1366, 390):
                    for index, section in enumerate(reading["sections"]):
                        locator = page.locator(".hb-reading-section").nth(index)
                        locator.evaluate("e=>e.scrollIntoView({behavior:'instant',block:'start'})")
                        locator.screenshot(path=str(OUT / f"{prefix}-section-{section['id']}.png"))
                if reading["documentWidth"] > width + 1 or reading["networkResources"]:
                    result["failures"].append({"id": item["id"], "width": width, "reading": reading})
                page.locator("[data-dv-open]").first.click()
                slides = []
                count = page.locator("[data-dv-slide]").count()
                for index in range(count):
                    page.locator("[data-dv-picker]").select_option(str(index))
                    page.wait_for_timeout(40)
                    slide = page.evaluate(SLIDE)
                    page.screenshot(path=str(OUT / f"{prefix}-slide-{index+1}.png"))
                    if width <= 760 and slide["stage"]["scrollHeight"] > slide["stage"]["clientHeight"]:
                        page.locator(".dv-stage").evaluate("e=>e.scrollTop=e.scrollHeight")
                        page.screenshot(path=str(OUT / f"{prefix}-slide-{index+1}-bottom.png"))
                        page.locator(".dv-stage").evaluate("e=>e.scrollTop=0")
                    if (width > 760 and (slide["contentBottom"] > slide["controls"]["top"] + 1 or slide["slide"]["scrollHeight"] > slide["slide"]["height"]+1)) or slide["contentRight"] > width+1 or slide["emptyClones"] or slide["invisible"]:
                        result["failures"].append({"id": item["id"], "width": width, "slide": slide})
                    slides.append(slide)
                page.locator("[data-dv-exit]").click()
                page.locator("[data-dv-open]").first.click()
                reset = page.evaluate("document.querySelector('[data-dv-count]').innerText")
                if not reset.startswith("1 /"):
                    result["failures"].append({"id":item["id"],"width":width,"reset":reset})
                page.keyboard.press("Escape")
                restored = page.locator("[data-dv-page]").is_visible()
                if not restored or errors:
                    result["failures"].append({"id": item["id"], "width":width,"readingRestored":restored,"errors":errors})
                if width == 1366:
                    page.pdf(path=str(OUT / f"{item['id']}-print.pdf"), format="A4", print_background=True)
                entry["viewports"].append({"width":width,"height":height,"reading":reading,"slides":slides,"reset":reset,"readingRestored":restored,"errors":errors})
                page.close()
            result["documents"].append(entry)
            print(f"Rendered {item['id']}: six viewports, {count} slides", flush=True)
        browser.close()
    (OUT / "render-observations.json").write_text(json.dumps(result, indent=2)+"\n",encoding="utf-8")
    print(f"Render failures: {len(result['failures'])}", flush=True)

if __name__ == "__main__":
    main()
