import asyncio
import json
from playwright.async_api import async_playwright

PAGES = [
    ("/", "home"),
    ("/merchants", "merchants"),
    ("/bazaar", "bazaar"),
    ("/merch", "merch"),
    ("/roadmap", "roadmap"),
    ("/about", "about"),
    ("/learn", "learn"),
]

BASE = "http://localhost:3000"
OUT = "E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/nav"

async def test_page(ctx, path, slug):
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)
    url = BASE + path
    result = {"url": path, "slug": slug, "status": None, "title": "", "nav": False, "errors": [], "broken_imgs": 0, "screenshot": f"nav/{slug}.png"}
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        result["status"] = resp.status if resp else None
        await page.wait_for_timeout(3000)
        result["title"] = await page.title()
        # Check nav
        nav_html = await page.content()
        result["nav"] = ("Merchants" in nav_html) or ("Bazaar" in nav_html) or (">Merch<" in nav_html)
        # Check broken images
        broken = await page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.filter(i => i.complete && i.naturalWidth === 0).length;
        }""")
        result["broken_imgs"] = broken
        await page.screenshot(path=f"{OUT}/{slug}.png", full_page=True)
    except Exception as e:
        result["errors"].append(f"nav_error: {e}")
    result["errors"].extend(errors)
    await page.close()
    return result

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
        )
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900}, bypass_csp=True)
        results = []
        for path, slug in PAGES:
            r = await test_page(ctx, path, slug)
            results.append(r)
            print(json.dumps(r, default=str))
        await browser.close()
        with open(f"{OUT}/results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)

asyncio.run(main())
