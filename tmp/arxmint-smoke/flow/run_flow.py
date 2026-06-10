"""Interactive checkout flow QA tests for ArxMint."""

import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/flow")
OUT.mkdir(parents=True, exist_ok=True)

results = {}


async def make_page(p):
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
    return browser, ctx, page, errors


async def scenario_a(p):
    print("\n=== Scenario A: Demo-mode auto-settle ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto(
            "http://localhost:3000/pay/seed-teneo",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        # Wait for invoice creation
        await page.wait_for_timeout(5000)
        await page.screenshot(path=str(OUT / "state_initial.png"), full_page=True)
        initial_body = (await page.inner_text("body")).lower()
        initial_has_invoice = bool(re.search(r"lnbc|cashu|bitcoin:", initial_body))

        # Wait 30s for auto-settle
        await page.wait_for_timeout(30_000)
        await page.screenshot(path=str(OUT / "state_after_30s.png"), full_page=True)
        body_after = (await page.inner_text("body")).lower()

        keywords = ["paid", "complete", "success", "thank you", "confirmed", "settled"]
        found = [k for k in keywords if k in body_after]

        # Look for action buttons
        button_texts = []
        for btn in await page.query_selector_all("button, a"):
            try:
                t = (await btn.inner_text()).strip()
                if t and len(t) < 60:
                    button_texts.append(t)
            except Exception:
                pass
        action_buttons = [
            b for b in button_texts if re.search(r"pay another|done|continue|new payment", b, re.I)
        ]

        results["A"] = {
            "errors": errors[:10],
            "initial_has_invoice": initial_has_invoice,
            "settle_keywords_found": found,
            "action_buttons": action_buttons,
            "body_excerpt": body_after[:400],
        }
        print(json.dumps(results["A"], indent=2))
    finally:
        await browser.close()


async def scenario_b(p):
    print("\n=== Scenario B: Multi-rail switching ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto(
            "http://localhost:3000/pay/seed-teneo",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        await page.wait_for_timeout(6000)
        await page.screenshot(path=str(OUT / "rails_default.png"), full_page=True)

        # Find rail tabs/buttons
        rail_buttons = {}
        for btn in await page.query_selector_all("button, [role=tab], a"):
            try:
                t = (await btn.inner_text()).strip()
                if re.search(r"^(lightning|cashu|on.?chain|bitcoin)$", t, re.I):
                    rail_buttons[t.lower()] = btn
            except Exception:
                pass

        async def get_uri():
            # Try to read input[value] or text content of an element holding an LN/cashu/btc URI
            for sel in ["input[readonly]", "input[value]", "code", "pre", "[data-uri]"]:
                els = await page.query_selector_all(sel)
                for el in els:
                    try:
                        v = await el.get_attribute("value")
                        if v and re.match(r"(lnbc|cashu|bitcoin:|lightning:)", v, re.I):
                            return v
                        t = (await el.inner_text()).strip()
                        if re.match(r"(lnbc|cashu|bitcoin:|lightning:)", t, re.I):
                            return t
                    except Exception:
                        pass
            # Fallback: scan body for first URI-looking token
            body = await page.inner_text("body")
            m = re.search(r"(lnbc[a-z0-9]{20,}|cashu[A-Za-z0-9_-]{20,}|bitcoin:[A-Za-z0-9]+)", body)
            return m.group(1) if m else None

        default_uri = await get_uri()

        cashu_uri = None
        if "cashu" in rail_buttons:
            await rail_buttons["cashu"].click()
            await page.wait_for_timeout(3000)
            await page.screenshot(path=str(OUT / "rails_cashu.png"), full_page=True)
            cashu_uri = await get_uri()

        onchain_uri = None
        onchain_label = next((k for k in rail_buttons if "chain" in k or "bitcoin" == k), None)
        if onchain_label:
            await rail_buttons[onchain_label].click()
            await page.wait_for_timeout(3000)
            await page.screenshot(path=str(OUT / "rails_onchain.png"), full_page=True)
            onchain_uri = await get_uri()

        results["B"] = {
            "errors": errors[:10],
            "rail_buttons_found": list(rail_buttons.keys()),
            "default_uri": (default_uri or "")[:80],
            "cashu_uri": (cashu_uri or "")[:80],
            "onchain_uri": (onchain_uri or "")[:80],
        }
        print(json.dumps(results["B"], indent=2))
    finally:
        await browser.close()


async def scenario_c(p):
    print("\n=== Scenario C: Shipping form ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto(
            "http://localhost:3000/pay/arxmint-merch?shipping=1",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        await page.wait_for_timeout(5000)
        await page.screenshot(path=str(OUT / "shipping_form.png"), full_page=True)

        # Look for shipping field labels/placeholders
        labels = []
        for el in await page.query_selector_all("label, input, textarea"):
            try:
                t = (await el.inner_text()).strip()
                if t:
                    labels.append(t[:60])
                ph = await el.get_attribute("placeholder")
                name = await el.get_attribute("name")
                if ph:
                    labels.append(f"ph:{ph}")
                if name:
                    labels.append(f"name:{name}")
            except Exception:
                pass

        body = (await page.inner_text("body")).lower()
        has_name = any(re.search(r"(full ?name|recipient)", l, re.I) for l in labels) or "name" in body
        has_street = any(re.search(r"(street|address|line ?1)", l, re.I) for l in labels)
        has_city = any(re.search(r"city", l, re.I) for l in labels)
        has_zip = any(re.search(r"(zip|postal)", l, re.I) for l in labels)

        results["C"] = {
            "errors": errors[:10],
            "shipping_fields": {
                "name": has_name,
                "street": has_street,
                "city": has_city,
                "zip": has_zip,
            },
            "fields_sample": labels[:30],
        }
        print(json.dumps(results["C"], indent=2))
    finally:
        await browser.close()


async def scenario_d(p):
    print("\n=== Scenario D: Preset amount + memo ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto(
            "http://localhost:3000/pay/seed-glacier?amount=2500&memo=Two+scoops",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        await page.wait_for_timeout(6000)
        await page.screenshot(path=str(OUT / "preset_params.png"), full_page=True)
        body = await page.inner_text("body")
        has_amount = "2,500" in body or "2500" in body
        has_memo = "Two scoops" in body or "two scoops" in body.lower()
        results["D"] = {
            "errors": errors[:10],
            "has_amount_2500": has_amount,
            "has_memo": has_memo,
            "body_excerpt": body[:600],
        }
        print(json.dumps(results["D"], indent=2))
    finally:
        await browser.close()


async def main():
    async with async_playwright() as p:
        await scenario_a(p)
        await scenario_b(p)
        await scenario_c(p)
        await scenario_d(p)
    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    print("\n\nDONE. Results saved to results.json")


if __name__ == "__main__":
    asyncio.run(main())
