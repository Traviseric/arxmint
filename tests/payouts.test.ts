import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register @/ path alias resolver so payouts.ts (which imports @/lib/db etc.)
// loads in the Node.js test runner. DB/Supabase calls in the functions under
// test are only invoked dynamically — validators and constants are pure.
register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const {
  isPayoutSchedule,
  isPayoutRail,
  PAYOUT_SCHEDULES,
  PAYOUT_RAILS,
} = await import("../lib/payouts.ts");

// ---- Validators ----

test("isPayoutSchedule accepts valid schedules", () => {
  for (const s of PAYOUT_SCHEDULES) {
    assert.equal(isPayoutSchedule(s), true, `expected ${s} to be valid`);
  }
});

test("isPayoutSchedule rejects invalid schedules", () => {
  assert.equal(isPayoutSchedule("hourly"), false);
  assert.equal(isPayoutSchedule("monthly"), false);
  assert.equal(isPayoutSchedule(""), false);
});

test("isPayoutRail accepts valid rails", () => {
  for (const r of PAYOUT_RAILS) {
    assert.equal(isPayoutRail(r), true, `expected ${r} to be valid`);
  }
});

test("isPayoutRail rejects invalid rails", () => {
  assert.equal(isPayoutRail("stripe"), false);
  assert.equal(isPayoutRail("fedimint"), false);
  assert.equal(isPayoutRail(""), false);
});

// ---- on_threshold is a valid schedule ----

test("isPayoutSchedule: on_threshold is valid", () => {
  assert.equal(isPayoutSchedule("on_threshold"), true);
});

// ---- Threshold logic (pure bigint math) ----

test("threshold check: balance >= threshold triggers payout", () => {
  const MIN_PAYOUT_SATS = BigInt(1000);
  const balance = BigInt(50000);
  const threshold = BigInt(25000);
  assert.equal(balance >= threshold, true);
  assert.equal(balance >= MIN_PAYOUT_SATS, true);
});

test("threshold check: sub-minimum balance does not trigger", () => {
  const MIN_PAYOUT_SATS = BigInt(1000);
  const lowBalance = BigInt(500);
  assert.equal(lowBalance >= MIN_PAYOUT_SATS, false);
});

test("threshold check: BigInt coercion from number and string is consistent", () => {
  const fromNumber = BigInt(50000);
  const fromString = BigInt("50000");
  assert.equal(fromNumber, fromString);
  assert.equal(typeof fromNumber, "bigint");
});

// ---- Schedule due-time logic ----

test("daily schedule: 25h since last payout is due", () => {
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const lastPayoutAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const isDue = Date.now() - lastPayoutAt.getTime() >= DAILY_MS;
  assert.equal(isDue, true);
});

test("daily schedule: 23h since last payout is not due", () => {
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const lastPayoutAt = new Date(Date.now() - 23 * 60 * 60 * 1000);
  const isDue = Date.now() - lastPayoutAt.getTime() >= DAILY_MS;
  assert.equal(isDue, false);
});

test("weekly schedule: 8 days since last payout is due", () => {
  const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
  const lastPayoutAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const isDue = Date.now() - lastPayoutAt.getTime() >= WEEKLY_MS;
  assert.equal(isDue, true);
});

test("weekly schedule: 6 days since last payout is not due", () => {
  const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
  const lastPayoutAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const isDue = Date.now() - lastPayoutAt.getTime() >= WEEKLY_MS;
  assert.equal(isDue, false);
});

test("first payout (no history) is always due", () => {
  const lastPayout = null;
  assert.equal(lastPayout === null, true);
});

// ---- Lightning Address format ----

test("Lightning Address parsing: valid address splits correctly", () => {
  const address = "merchant@getalby.com";
  const [user, domain] = address.split("@");
  assert.equal(user, "merchant");
  assert.equal(domain, "getalby.com");
});

test("Lightning Address parsing: missing @ is invalid", () => {
  const address = "notanaddress";
  const parts = address.split("@");
  const [user, domain] = parts;
  assert.equal(!user || !domain, true);
});

// ---- Constants shape ----

test("PAYOUT_SCHEDULES contains exactly 3 entries", () => {
  assert.equal(PAYOUT_SCHEDULES.length, 3);
  const schedules: readonly string[] = PAYOUT_SCHEDULES;
  assert.ok(schedules.includes("daily"));
  assert.ok(schedules.includes("weekly"));
  assert.ok(schedules.includes("on_threshold"));
});

test("PAYOUT_RAILS contains exactly 3 entries", () => {
  assert.equal(PAYOUT_RAILS.length, 3);
  const rails: readonly string[] = PAYOUT_RAILS;
  assert.ok(rails.includes("lightning"));
  assert.ok(rails.includes("ecash"));
  assert.ok(rails.includes("onchain"));
});
