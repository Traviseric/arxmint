"""ArxMint responsive + a11y smoke test."""
import asyncio
import json
import os
from playwright.async_api import async_playwright

OUT = r"E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/responsive"
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ("root", "http://localhost:3000/"),
    ("pay-seed-teneo", "http://localhost:3000/pay/seed-teneo"),
    ("merchants", "http://localhost:3000/merchants"),
    ("bazaar", "http://localhost:3000/bazaar"),
    ("merch", "http://localhost:3000/merch"),
]

VIEWPORTS = [
    ("mobile", 375, 812),
    ("tablet", 768, 1024),
    ("desktop", 1440, 900),
]


async def main():
    results = {"responsive": [], "a11y": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
        )

        for slug, url in PAGES:
            row = {"page": slug, "url": url}
            for vname, W, H in VIEWPORTS:
                ctx = await browser.new_context(viewport={"width": W, "height": H}, bypass_csp=True)
                page = await ctx.new_page()
                page_errors = []
                page.on("pageerror", lambda e: page_errors.append(str(e)))
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                    await page.wait_for_timeout(3_000)
                    shot = os.path.join(OUT, f"{slug}_{vname}.png")
                    await page.screenshot(path=shot, full_page=True)

                    h_scroll = await page.evaluate(
                        "() => document.documentElement.scrollWidth > window.innerWidth"
                    )
                    scroll_w = await page.evaluate("() => document.documentElement.scrollWidth")
                    inner_w = await page.evaluate("() => window.innerWidth")
                    small_btns = await page.evaluate("""() => {
                        const btns = Array.from(document.querySelectorAll('button, a'));
                        return btns.filter(b => {
                            const r = b.getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
                        }).length;
                    }""")
                    total_btns = await page.evaluate(
                        "() => document.querySelectorAll('button, a').length"
                    )
                    row[f"{vname}_hscroll"] = h_scroll
                    row[f"{vname}_scrollW"] = scroll_w
                    row[f"{vname}_innerW"] = inner_w
                    row[f"{vname}_smallBtns"] = small_btns
                    row[f"{vname}_totalBtns"] = total_btns

                    if vname == "desktop":
                        h1_count = await page.locator("h1").count()
                        imgs_missing_alt = await page.evaluate("""() => {
                            const imgs = Array.from(document.querySelectorAll('img'));
                            return imgs.filter(i => !i.hasAttribute('alt')).length;
                        }""")
                        total_imgs = await page.evaluate(
                            "() => document.querySelectorAll('img').length"
                        )
                        lang = await page.evaluate("() => document.documentElement.lang")
                        results["a11y"].append({
                            "page": slug,
                            "h1": h1_count,
                            "imgs_missing_alt": imgs_missing_alt,
                            "total_imgs": total_imgs,
                            "lang": lang,
                            "errors": page_errors[:3],
                        })
                except Exception as e:
                    row[f"{vname}_error"] = str(e)[:200]
                finally:
                    await ctx.close()
            results["responsive"].append(row)

        await browser.close()

    with open(os.path.join(OUT, "results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print(json.dumps(results, indent=2))


asyncio.run(main())
