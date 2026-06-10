import asyncio
import json
from playwright.async_api import async_playwright

MERCHANTS = [
    "seed-teneo",
    "seed-glacier",
    "seed-black-bear",
    "arxmint-store",
    "arxmint-merch",
    "nonexistent-merchant-xyz",
]

EXPECTED_NAMES = {
    "seed-teneo": ["Teneo"],
    "seed-glacier": ["Glacier"],
    "seed-black-bear": ["Black Bear"],
    "arxmint-store": ["ArxMint", "Store"],
    "arxmint-merch": ["ArxMint", "Merch"],
    "nonexistent-merchant-xyz": [],
}

OUT_DIR = "E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/pay"


async def test_merchant(p, merchant_id):
    browser = await p.chromium.launch(
        headless=True,
        args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
    )
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900}, bypass_csp=True)
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None,
    )

    url = f"http://localhost:3000/pay/{merchant_id}"
    status = None
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        if resp:
            status = resp.status
    except Exception as e:
        errors.append(f"goto error: {e}")

    await page.wait_for_timeout(5_000)

    screenshot_path = f"{OUT_DIR}/{merchant_id}.png"
    try:
        await page.screenshot(path=screenshot_path, full_page=True)
    except Exception as e:
        errors.append(f"screenshot error: {e}")

    title = await page.title()
    body_text = ""
    try:
        body_text = await page.locator("body").inner_text(timeout=5_000)
    except Exception as e:
        errors.append(f"inner_text error: {e}")

    expected = EXPECTED_NAMES.get(merchant_id, [])
    name_match = all(name.lower() in body_text.lower() for name in expected) if expected else False

    qr_count = 0
    try:
        qr_count = await page.locator("canvas, svg[role='img'], img[alt*='QR' i]").count()
    except Exception as e:
        errors.append(f"qr locator error: {e}")

    spinner_still_showing = False
    try:
        spinner_count = await page.locator("text=/creating invoice/i").count()
        spinner_still_showing = spinner_count > 0
    except Exception as e:
        errors.append(f"spinner locator error: {e}")

    sats_shown = False
    try:
        sats_count = await page.locator("text=/\\bsats?\\b/i").count()
        sats_shown = sats_count > 0
    except Exception:
        pass

    usd_shown = ("$" in body_text) or ("USD" in body_text)

    broken_imgs = 0
    try:
        broken_imgs = await page.evaluate(
            "Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).length"
        )
    except Exception as e:
        errors.append(f"broken imgs error: {e}")

    body_excerpt = body_text[:500].replace("\n", " | ")

    result = {
        "merchant_id": merchant_id,
        "url": url,
        "status": status,
        "title": title,
        "name_in_dom": name_match,
        "expected_names": expected,
        "body_excerpt": body_excerpt,
        "qr_count": qr_count,
        "spinner_still_showing": spinner_still_showing,
        "sats_shown": sats_shown,
        "usd_shown": usd_shown,
        "errors": errors,
        "broken_imgs": broken_imgs,
        "screenshot_path": screenshot_path,
    }

    await browser.close()
    return result


async def main():
    async with async_playwright() as p:
        results = []
        for m in MERCHANTS:
            print(f"Testing {m}...", flush=True)
            r = await test_merchant(p, m)
            results.append(r)
            print(json.dumps(r, indent=2, default=str), flush=True)

        with open(f"{OUT_DIR}/results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, default=str)


if __name__ == "__main__":
    asyncio.run(main())
