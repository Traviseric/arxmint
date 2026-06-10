"""Final scenario B test — extract URI from 'Open in Wallet' anchor href."""

import asyncio
import json
import re
import secrets
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("E:/TE-Code/te-btc/arxmint/tmp/arxmint-smoke/flow")
results = {}


async def make_page(p):
    browser = await p.chromium.launch(
        headless=True,
        args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
    )
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900}, bypass_csp=True)
    fake_ip = f"10.{secrets.randbelow(255)}.{secrets.randbelow(255)}.{secrets.randbelow(255)}"
    await ctx.set_extra_http_headers({"x-forwarded-for": fake_ip})
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None,
    )
    return browser, ctx, page, errors


async def get_uri(page):
    """Extract from 'Open in Wallet' anchor href OR QR SVG value attr."""
    # Anchor href
    for a in await page.query_selector_all("a[href]"):
        try:
            h = await a.get_attribute("href")
            if h and re.match(r"(lightning:|cashu|bitcoin:|lnbc)", h, re.I):
                return h
        except Exception:
            pass
    # SVG with value attr (qrcode.react renders as <svg>)
    for svg in await page.query_selector_all("svg"):
        try:
            v = await svg.get_attribute("value")
            if v:
                return v
        except Exception:
            pass
    # aria-label fallback
    for el in await page.query_selector_all("[aria-label]"):
        try:
            al = await el.get_attribute("aria-label")
            if al and re.search(r"(lnbc|cashu[A-Za-z]|bitcoin:)", al, re.I):
                m = re.search(r"(lnbc[a-z0-9]{20,}|cashu[A-Za-z0-9_-]{20,}|bitcoin:[A-Za-z0-9?=&._%-]+)", al, re.I)
                if m:
                    return m.group(1)
        except Exception:
            pass
    return None


async def find_rail_buttons(page):
    out = {}
    for btn in await page.query_selector_all("button"):
        try:
            t = (await btn.inner_text()).strip()
            norm = re.sub(r"[^\w\s\-]", "", t).strip().lower()
            if norm in ("lightning", "cashu", "on-chain", "onchain", "bitcoin"):
                if norm in ("bitcoin", "on-chain"):
                    norm = "onchain"
                out[norm] = btn
        except Exception:
            pass
    return out


async def main():
    async with async_playwright() as p:
        print("\n=== B (final): rail switching with href extraction ===")
        browser, ctx, page, errors = await make_page(p)
        try:
            await page.goto(
                "http://localhost:3000/pay/seed-teneo",
                wait_until="domcontentloaded",
                timeout=30_000,
            )
            # Poll for rails to appear
            rail_buttons = {}
            for _ in range(20):
                await page.wait_for_timeout(500)
                body_lc = (await page.inner_text("body")).lower()
                if "thank you" in body_lc:
                    break
                rail_buttons = await find_rail_buttons(page)
                if rail_buttons:
                    break

            await page.screenshot(path=str(OUT / "rails_default.png"), full_page=True)
            rails_seen = list(rail_buttons.keys())
            default_uri = await get_uri(page)
            print(f"Rails seen: {rails_seen}")
            print(f"Default URI: {(default_uri or '')[:80]}")

            cashu_uri = None
            if "cashu" in rail_buttons:
                buttons = await find_rail_buttons(page)
                if "cashu" in buttons:
                    await buttons["cashu"].click(timeout=5000)
                    # Poll quickly — capture URI before demo auto-settle (~5s)
                    for _ in range(8):
                        await page.wait_for_timeout(400)
                        u = await get_uri(page)
                        body_lc = (await page.inner_text("body")).lower()
                        if u and not u.lower().startswith("lightning:"):
                            cashu_uri = u
                            break
                        if "payment received" in body_lc or "thank you" in body_lc:
                            break
                    if not cashu_uri:
                        cashu_uri = await get_uri(page)
                    await page.screenshot(path=str(OUT / "rails_cashu.png"), full_page=True)
                    print(f"Cashu URI: {(cashu_uri or '')[:80]}")

            # Reload fresh for onchain test (otherwise might have settled)
            await page.goto(
                "http://localhost:3000/pay/seed-teneo",
                wait_until="domcontentloaded",
                timeout=30_000,
            )
            for _ in range(20):
                await page.wait_for_timeout(500)
                body_lc = (await page.inner_text("body")).lower()
                if "thank you" in body_lc:
                    break
                rb = await find_rail_buttons(page)
                if rb:
                    rail_buttons = rb
                    break

            onchain_uri = None
            buttons = await find_rail_buttons(page)
            if "onchain" in buttons:
                await buttons["onchain"].click(timeout=5000)
                for _ in range(8):
                    await page.wait_for_timeout(400)
                    u = await get_uri(page)
                    body_lc = (await page.inner_text("body")).lower()
                    if u and u.lower().startswith("bitcoin:"):
                        onchain_uri = u
                        break
                    if "payment received" in body_lc:
                        break
                if not onchain_uri:
                    onchain_uri = await get_uri(page)
                await page.screenshot(path=str(OUT / "rails_onchain.png"), full_page=True)
                print(f"On-chain URI: {(onchain_uri or '')[:80]}")

            # Normalize — Lightning href is "lightning:lnbc..."
            default_is_lightning = bool(default_uri and re.match(r"(lightning:|lnbc)", default_uri, re.I))
            cashu_ok = bool(cashu_uri and cashu_uri.lower().startswith("cashu"))
            onchain_ok = bool(onchain_uri and onchain_uri.lower().startswith("bitcoin:"))

            # Check for "not configured" messages — meaning the rail tab is visible but URI not available
            body = (await page.inner_text("body")).lower()
            cashu_unavailable = "has not configured a cashu mint" in body
            onchain_unavailable = "has not configured an on-chain address" in body

            if len(rails_seen) >= 2 and (cashu_ok or onchain_ok or cashu_unavailable or onchain_unavailable):
                verdict = "PASS"
            elif len(rails_seen) >= 2:
                verdict = "WARN"
            else:
                verdict = "FAIL"

            results["B"] = {
                "verdict": verdict,
                "errors": errors[:5],
                "rails_seen": rails_seen,
                "default_uri_sample": (default_uri or "")[:60],
                "default_is_lightning": default_is_lightning,
                "cashu_uri_sample": (cashu_uri or "")[:60],
                "cashu_starts_with_cashu": cashu_ok,
                "onchain_uri_sample": (onchain_uri or "")[:60],
                "onchain_starts_with_bitcoin": onchain_ok,
                "cashu_unavailable_msg_shown": cashu_unavailable,
                "onchain_unavailable_msg_shown": onchain_unavailable,
            }
        finally:
            await browser.close()
    print(json.dumps(results["B"], indent=2))
    (OUT / "results_b_final.json").write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
