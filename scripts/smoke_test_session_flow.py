"""
End-to-end smoke test for the new ?session= flow.

Simulates what Teneo's btc-create-checkout Lambda will do:
1. Mint a checkout session via /api/checkout with merchantId=seed-teneo,
   amountSats, memo, fulfillmentUrl
2. Redirect user (us) to /pay/seed-teneo?session={sessionId}
3. Render the page and verify the QR loads with the PRE-MINTED invoice
   (no "Creating invoice..." spinner — that would mean the page minted its
   own session instead of using ours)
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from urllib import request as urlrequest

from playwright.async_api import async_playwright

BASE = os.environ.get("ARXMINT_BASE", "http://localhost:3000")
OUT_DIR = Path("tmp/arxmint-smoke/session-flow")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def post_checkout() -> dict:
    payload = {
        "merchantId": "seed-teneo",
        "amountSats": 1234,  # distinctive so we can verify it's our session
        "memo": "Teneo session-flow smoke test",
        "fulfillmentUrl": "https://api-staging.teneo.io/webhook/btcpay",
    }
    req = urlrequest.Request(
        f"{BASE}/api/checkout",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Idempotency-Key": "session-flow-smoke",
            "x-forwarded-for": "10.20.30.40",
        },
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


async def main():
    print(f"[1/3] Minting session via POST {BASE}/api/checkout (mimicking Teneo Lambda)")
    minted = post_checkout()
    print(f"      sessionId: {minted['sessionId']}")
    print(f"      invoice:   {minted['invoice'][:60]}...")
    print(f"      amount:    {minted['amountSats']} sats")

    pay_url = f"{BASE}/pay/seed-teneo?session={minted['sessionId']}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
        )
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900}, bypass_csp=True)
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
        page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

        print(f"[2/3] GET  {pay_url}")
        await page.goto(pay_url, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(3_000)
        await page.screenshot(path=str(OUT_DIR / "session_render.png"), full_page=True)

        body_text = (await page.inner_text("body")).lower()
        checks = {
            "merchant_name": "teneo" in body_text,
            "amount_1234_visible": "1,234" in body_text or "1234" in body_text,
            "qr_present": (await page.locator("canvas, svg, img[alt*='QR' i]").count()) > 0,
            "no_creating_spinner": "creating invoice" not in body_text,
            "no_console_errors": len(errors) == 0,
        }
        print(f"[3/3] Checks: {json.dumps(checks)}")
        if errors:
            print(f"      Errors: {errors[:3]}")

        await browser.close()

    verdict = "PASS" if all(checks.values()) else "FAIL"
    print(f"\nVERDICT: {verdict}")
    print(f"Screenshot: {(OUT_DIR / 'session_render.png').resolve()}")
    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
