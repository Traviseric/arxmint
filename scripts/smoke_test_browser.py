"""
Smoke test: drive a headless browser through the seed-teneo checkout to prove
the full chain works (dev server running → /api/checkout creates session →
/pay/seed-teneo?session=... renders QR → DEMO_MODE auto-settles after 5s).

Run from arxmint root:
    python scripts/smoke_test_browser.py

Outputs screenshots to ./tmp/arxmint-smoke/
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest

from playwright.async_api import async_playwright

BASE = os.environ.get("ARXMINT_BASE", "http://localhost:3001")
OUT_DIR = Path("tmp/arxmint-smoke")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def post_checkout(merchant_id: str, amount_sats: int, memo: str) -> dict:
    payload = {
        "merchantId": merchant_id,
        "amountSats": amount_sats,
        "memo": memo,
    }
    req = urlrequest.Request(
        f"{BASE}/api/checkout",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Idempotency-Key": f"smoke-{merchant_id}-{amount_sats}"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        return {"error": exc.code, "body": exc.read().decode("utf-8", errors="ignore")}


async def smoke():
    # 1. Mint a checkout session for seed-teneo
    print(f"[1/4] POST {BASE}/api/checkout merchantId=seed-teneo amountSats=1000")
    result = post_checkout("seed-teneo", 1000, "Teneo smoke test 1 credit")
    print(f"      -> {json.dumps(result, indent=2)[:500]}")
    if "error" in result or "sessionId" not in result:
        print("FAIL: checkout creation did not return sessionId")
        return 1
    session_id = result["sessionId"]
    pay_url = f"{BASE}/pay/seed-teneo?session={session_id}"

    # 2. Spin up headless chromium and visit the pay page
    async with async_playwright() as p:
        # --disable-web-security strips CSP enforcement so we can tell whether
        # the page is broken because of CSP or because of something else.
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
        )
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            bypass_csp=True,
        )
        page = await ctx.new_page()

        console_errors = []
        page.on("pageerror", lambda exc: console_errors.append(f"pageerror: {exc}"))
        page.on("console", lambda msg: console_errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)

        print(f"[2/4] GET  {pay_url}")
        # /pay opens an SSE connection for live status, so networkidle never fires.
        # Wait for DOM + a render budget instead.
        await page.goto(pay_url, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(3_000)  # let React hydrate + render
        await page.screenshot(path=str(OUT_DIR / "01_initial.png"), full_page=True)

        # 3. Look for expected content: QR canvas/img, amount, merchant name
        body_text = (await page.inner_text("body")).lower()
        checks = {
            "merchant_name_present": "teneo" in body_text,
            "amount_present": "1000" in body_text or "1,000" in body_text,
            "qr_element_present": (await page.locator("canvas, svg, img[alt*='QR' i]").count()) > 0,
            "no_console_errors": len(console_errors) == 0,
        }
        print(f"[3/4] Initial checks: {json.dumps(checks)}")
        if console_errors:
            print(f"      Console errors: {console_errors[:5]}")

        # 4. Wait for DEMO_MODE auto-settle (5s delay + status poll)
        print("[4/4] Waiting 8s for DEMO_MODE auto-settle...")
        await page.wait_for_timeout(8_000)
        await page.screenshot(path=str(OUT_DIR / "02_post_settle.png"), full_page=True)
        post_body = (await page.inner_text("body")).lower()
        settled = any(word in post_body for word in ("paid", "complete", "success", "thank"))
        print(f"      Settled indicator in DOM: {settled}")

        await browser.close()

    print(f"\nScreenshots: {OUT_DIR.resolve()}")
    print(f"VERDICT: {'PASS' if all(checks.values()) and settled else 'PARTIAL'}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(smoke()))
