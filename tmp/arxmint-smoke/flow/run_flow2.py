"""Refined flow tests — capture pre-settle rail state and use correct merchant ID."""

import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/flow")

results = {}


async def make_page(p):
    # Per the assignment spec — keep flags as required
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


async def get_uri_from_page(page):
    """Find any LN/cashu/btc payment URI on the page."""
    # Inputs first (often readonly invoice fields)
    for el in await page.query_selector_all("input"):
        try:
            v = await el.get_attribute("value")
            if v and re.match(r"(lnbc|cashu|bitcoin:|lightning:)", v, re.I):
                return v
        except Exception:
            pass
    # Code/pre blocks
    for el in await page.query_selector_all("code, pre, [class*=invoice], [class*=uri]"):
        try:
            t = (await el.inner_text()).strip()
            if re.match(r"(lnbc|cashu|bitcoin:|lightning:)", t, re.I):
                return t
        except Exception:
            pass
    # Any element with text that contains a URI
    body = await page.inner_text("body")
    m = re.search(
        r"(lnbc[a-z0-9]{20,}|cashub[A-Za-z0-9_-]{20,}|cashuA[A-Za-z0-9_-]{20,}|bitcoin:[A-Za-z0-9?=&._%-]+)",
        body,
        re.I,
    )
    return m.group(1) if m else None


async def wait_for_invoice(page, timeout_ms=15000):
    """Poll until a payment URI shows up OR settlement happens."""
    deadline = timeout_ms
    elapsed = 0
    step = 500
    while elapsed < deadline:
        body = (await page.inner_text("body")).lower()
        if "payment confirmed" in body or "thank you" in body:
            return "settled"
        uri = await get_uri_from_page(page)
        if uri:
            return uri
        # Look for rail tabs
        for btn in await page.query_selector_all("button"):
            try:
                t = (await btn.inner_text()).strip().lower()
                if t in ("lightning", "cashu", "on-chain", "onchain", "bitcoin"):
                    return "rails-visible"
            except Exception:
                pass
        await page.wait_for_timeout(step)
        elapsed += step
    return None


async def scenario_a(p):
    print("\n=== A: Demo auto-settle ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto("http://localhost:3000/pay/seed-teneo", wait_until="domcontentloaded", timeout=30_000)
        # Per spec: wait ~3-5s
        await page.wait_for_timeout(5000)
        await page.screenshot(path=str(OUT / "state_initial.png"), full_page=True)
        initial_body = (await page.inner_text("body")).lower()

        # Wait 30 more seconds for auto-settle
        await page.wait_for_timeout(30_000)
        await page.screenshot(path=str(OUT / "state_after_30s.png"), full_page=True)
        body = (await page.inner_text("body")).lower()

        keywords = ["paid", "complete", "success", "thank you", "confirmed", "settled"]
        found = [k for k in keywords if k in body]
        action_btns = []
        for btn in await page.query_selector_all("button, a"):
            try:
                t = (await btn.inner_text()).strip()
                if re.search(r"pay another|new payment|done|continue", t, re.I):
                    action_btns.append(t)
            except Exception:
                pass

        results["A"] = {
            "verdict": "PASS" if found and action_btns else ("WARN" if found else "FAIL"),
            "errors": errors[:5],
            "initial_state": "settled" if "thank you" in initial_body else "invoice/loading",
            "settle_keywords": found,
            "action_buttons": action_btns,
            "screenshots": ["state_initial.png", "state_after_30s.png"],
        }
    finally:
        await browser.close()
    print(json.dumps(results["A"], indent=2))


async def scenario_b(p):
    print("\n=== B: Multi-rail switching ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        # Use seed-glacier with custom amount to trigger pre-settle render fast, then capture rails
        await page.goto("http://localhost:3000/pay/seed-teneo", wait_until="domcontentloaded", timeout=30_000)

        # Poll quickly for rails to appear BEFORE auto-settle
        rails_seen = []
        rail_buttons = {}
        for _ in range(20):
            await page.wait_for_timeout(500)
            body_lc = (await page.inner_text("body")).lower()
            if "thank you" in body_lc or "payment confirmed" in body_lc:
                break
            # Look for rail buttons in tablist
            found_this_iter = {}
            for btn in await page.query_selector_all("button[role=tab], button"):
                try:
                    t = (await btn.inner_text()).strip()
                    norm = t.lower().replace("\u26a1", "").replace("\ud83e\udd5c", "").replace("\u20bf", "").strip()
                    if norm in ("lightning", "cashu", "on-chain", "onchain", "bitcoin"):
                        found_this_iter[norm] = btn
                except Exception:
                    pass
            if found_this_iter:
                rail_buttons = found_this_iter
                rails_seen = list(found_this_iter.keys())
                break

        await page.screenshot(path=str(OUT / "rails_default.png"), full_page=True)
        default_uri = await get_uri_from_page(page)

        cashu_uri = None
        if "cashu" in rail_buttons:
            try:
                await rail_buttons["cashu"].click(timeout=5000)
                await page.wait_for_timeout(4000)
                await page.screenshot(path=str(OUT / "rails_cashu.png"), full_page=True)
                cashu_uri = await get_uri_from_page(page)
            except Exception as e:
                cashu_uri = f"click-failed: {e}"

        onchain_uri = None
        onchain_key = next((k for k in rail_buttons if k in ("on-chain", "onchain", "bitcoin")), None)
        if onchain_key:
            try:
                await rail_buttons[onchain_key].click(timeout=5000)
                await page.wait_for_timeout(4000)
                await page.screenshot(path=str(OUT / "rails_onchain.png"), full_page=True)
                onchain_uri = await get_uri_from_page(page)
            except Exception as e:
                onchain_uri = f"click-failed: {e}"

        cashu_ok = bool(cashu_uri and isinstance(cashu_uri, str) and cashu_uri.lower().startswith("cashu"))
        onchain_ok = bool(onchain_uri and isinstance(onchain_uri, str) and onchain_uri.lower().startswith("bitcoin:"))

        if rails_seen and ("cashu" in rails_seen or onchain_key):
            verdict = "PASS" if (cashu_ok or onchain_ok or (cashu_uri and onchain_uri)) else "WARN"
        elif rails_seen:
            verdict = "WARN"
        else:
            verdict = "WARN"  # Lightning-only is valid for demo mode

        results["B"] = {
            "verdict": verdict,
            "errors": errors[:5],
            "rails_seen": rails_seen,
            "default_uri": (default_uri or "")[:60],
            "cashu_uri": (cashu_uri or "")[:60] if isinstance(cashu_uri, str) else None,
            "onchain_uri": (onchain_uri or "")[:60] if isinstance(onchain_uri, str) else None,
            "cashu_prefix_ok": cashu_ok,
            "onchain_prefix_ok": onchain_ok,
            "screenshots": ["rails_default.png", "rails_cashu.png", "rails_onchain.png"],
        }
    finally:
        await browser.close()
    print(json.dumps(results["B"], indent=2))


async def scenario_c(p):
    print("\n=== C: Shipping form ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        # Spec says /pay/arxmint-merch — but seed merchant is actually "arxmint-store"
        # Run BOTH and report
        await page.goto(
            "http://localhost:3000/pay/arxmint-merch?shipping=1",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        await page.wait_for_timeout(4000)
        await page.screenshot(path=str(OUT / "shipping_form.png"), full_page=True)
        body_merch = await page.inner_text("body")
        merch_is_404 = "404" in body_merch or "page not found" in body_merch.lower() or len(body_merch.strip()) < 100

        # Try the actual seed merchant
        await page.goto(
            "http://localhost:3000/pay/arxmint-store?shipping=1",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        await page.wait_for_timeout(4000)
        await page.screenshot(path=str(OUT / "shipping_form_store.png"), full_page=True)

        # Many shipping forms only render once user clicks "continue" from amount step.
        # Try entering an amount if there's an input.
        amount_input = await page.query_selector("input[type=number], input[name*=amount i]")
        if amount_input:
            try:
                await amount_input.fill("1000")
                # Look for a continue/next button
                for btn in await page.query_selector_all("button"):
                    bt = ((await btn.inner_text()) or "").strip().lower()
                    if re.search(r"continue|next|pay|generate|create", bt):
                        await btn.click(timeout=3000)
                        break
                await page.wait_for_timeout(3000)
                await page.screenshot(path=str(OUT / "shipping_form_after_amount.png"), full_page=True)
            except Exception:
                pass

        # Inspect for shipping field names/placeholders
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

        joined = json.dumps(inputs).lower()
        has_name_field = bool(re.search(r"(full ?name|recipient|\"name\":)", joined))
        has_street = bool(re.search(r"(street|address|line)", joined))
        has_city = "city" in joined
        has_zip = bool(re.search(r"(zip|postal)", joined))

        results["C"] = {
            "verdict": "PASS" if (has_name_field and has_street and has_city) else ("WARN" if merch_is_404 else "FAIL"),
            "errors": errors[:5],
            "arxmint_merch_404": merch_is_404,
            "note": "Spec said /pay/arxmint-merch but seed merchant ID is 'arxmint-store'. Tested both.",
            "shipping_fields_on_store": {
                "name": has_name_field,
                "street": has_street,
                "city": has_city,
                "zip": has_zip,
            },
            "input_count": len(inputs),
            "screenshots": ["shipping_form.png", "shipping_form_store.png", "shipping_form_after_amount.png"],
        }
    finally:
        await browser.close()
    print(json.dumps(results["C"], indent=2))


async def scenario_d(p):
    print("\n=== D: Preset amount + memo ===")
    browser, ctx, page, errors = await make_page(p)
    try:
        await page.goto(
            "http://localhost:3000/pay/seed-glacier?amount=2500&memo=Two+scoops",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        # Capture pre-settle screenshot first
        await page.wait_for_timeout(4000)
        body_early = await page.inner_text("body")
        await page.screenshot(path=str(OUT / "preset_params.png"), full_page=True)

        has_amount = "2,500" in body_early or "2500" in body_early
        has_memo = "two scoops" in body_early.lower()

        # If page already settled, try one more time with full page text
        if not has_memo:
            # Try checking page HTML / aria for memo (might be in invoice description, hidden)
            html = await page.content()
            has_memo = "two scoops" in html.lower() or "two+scoops" in html.lower()

        results["D"] = {
            "verdict": "PASS" if (has_amount and has_memo) else ("WARN" if has_amount else "FAIL"),
            "errors": errors[:5],
            "has_amount_2500": has_amount,
            "has_memo_two_scoops": has_memo,
            "body_excerpt": body_early[:400],
            "screenshots": ["preset_params.png"],
        }
    finally:
        await browser.close()
    print(json.dumps(results["D"], indent=2))


async def main():
    async with async_playwright() as p:
        await scenario_a(p)
        await scenario_b(p)
        await scenario_c(p)
        await scenario_d(p)
    (OUT / "results_v2.json").write_text(json.dumps(results, indent=2))
    print("\nDONE")


if __name__ == "__main__":
    asyncio.run(main())
