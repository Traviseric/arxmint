"""Inspect pages to understand structure for rail switching and merch shipping."""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/flow")


async def inspect_pay_page(p, url, label):
    print(f"\n=== INSPECT {label}: {url} ===")
    browser = await p.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda m: errors.append(f"console: [{m.type}] {m.text}") if m.type in ("error", "warning") else None,
    )

    # Track all network responses
    responses = []
    page.on(
        "response",
        lambda r: responses.append(f"{r.status} {r.url[:120]}") if r.status >= 400 else None,
    )

    await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
    # Don't wait too long — capture state BEFORE auto-settle for rails
    await page.wait_for_timeout(3500)

    # Capture before auto-settle screenshot
    await page.screenshot(path=str(OUT / f"inspect_{label}_early.png"), full_page=True)

    # Dump all buttons and clickable elements
    buttons = []
    for sel in ["button", "[role=tab]", "a", "[role=button]"]:
        for el in await page.query_selector_all(sel):
            try:
                t = (await el.inner_text()).strip()
                aria = await el.get_attribute("aria-label")
                data_rail = await el.get_attribute("data-rail")
                if t or aria or data_rail:
                    buttons.append({"tag": sel, "text": t[:80], "aria": aria, "data_rail": data_rail})
            except Exception:
                pass

    # Dump form inputs
    inputs = []
    for el in await page.query_selector_all("input, textarea, select"):
        try:
            inputs.append({
                "name": await el.get_attribute("name"),
                "type": await el.get_attribute("type"),
                "placeholder": await el.get_attribute("placeholder"),
                "id": await el.get_attribute("id"),
            })
        except Exception:
            pass

    # First 1500 chars of body
    body = await page.inner_text("body")

    info = {
        "url": url,
        "errors": errors[:15],
        "bad_responses": responses[:10],
        "buttons_count": len(buttons),
        "buttons": buttons[:40],
        "inputs": inputs[:30],
        "body_excerpt": body[:1500],
    }
    print(json.dumps(info, indent=2, default=str))
    await browser.close()
    return info


async def main():
    async with async_playwright() as p:
        a = await inspect_pay_page(p, "http://localhost:3000/pay/seed-teneo", "teneo")
        b = await inspect_pay_page(p, "http://localhost:3000/pay/arxmint-merch?shipping=1", "merch_ship")
    (OUT / "inspect.json").write_text(json.dumps({"teneo": a, "merch": b}, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
