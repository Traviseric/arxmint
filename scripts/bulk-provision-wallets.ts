#!/usr/bin/env node
// ============================================================
// ArxMint — Bulk LNbits Wallet Provisioner
// Usage: node --experimental-strip-types scripts/bulk-provision-wallets.ts [--dry-run]
//
// Queries merchant_pledges for records without a provisioned
// wallet and creates one via LNbits for each.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LNBITS_URL = process.env.LNBITS_URL;
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌  Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!LNBITS_URL || !LNBITS_ADMIN_KEY) {
  console.error("❌  Missing LNBITS_URL / LNBITS_ADMIN_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MerchantRow {
  id: string;
  business_name: string;
  onboarding_status: string;
}

async function provisionWallet(merchant: MerchantRow): Promise<boolean> {
  try {
    const res = await fetch(`${LNBITS_URL}/api/v1/wallet`, {
      method: "POST",
      headers: {
        "X-Api-Key": LNBITS_ADMIN_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `ArxMint - ${merchant.business_name}` }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`  ❌  LNbits error ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();

    // Insert wallet record
    const { error: walletError } = await supabase.from("merchant_wallets").insert({
      merchant_id: merchant.id,
      lnbits_wallet_id: data.id,
      lnbits_invoice_key: data.inkey,
      lnbits_admin_key: data.adminkey,
    });

    if (walletError) {
      console.error(`  ❌  DB wallet insert: ${walletError.message}`);
      return false;
    }

    // Update onboarding status
    const { error: statusError } = await supabase
      .from("merchant_pledges")
      .update({
        onboarding_status: "wallet_ready",
        wallet_provisioned_at: new Date().toISOString(),
      })
      .eq("id", merchant.id);

    if (statusError) {
      console.error(`  ⚠️   Status update failed: ${statusError.message}`);
      // Non-fatal — wallet was created
    }

    return true;
  } catch (err) {
    console.error(`  ❌  Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function main() {
  console.log(`\n🔑  ArxMint Bulk Wallet Provisioner${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  // Find merchants with no wallet in merchant_wallets
  const { data: merchants, error } = await supabase
    .from("merchant_pledges")
    .select("id, business_name, onboarding_status")
    .not("id", "in",
      // Sub-select merchants that already have a wallet
      supabase.from("merchant_wallets").select("merchant_id")
    );

  if (error) {
    // Fallback: query all merchants then filter
    const { data: allMerchants, error: allError } = await supabase
      .from("merchant_pledges")
      .select("id, business_name, onboarding_status")
      .eq("onboarding_status", "pending");

    if (allError) {
      console.error("❌  Failed to fetch merchants:", allError.message);
      process.exit(1);
    }

    if (!allMerchants || allMerchants.length === 0) {
      console.log("✅  No merchants need provisioning.\n");
      return;
    }

    await processMerchants(allMerchants as MerchantRow[]);
    return;
  }

  const pending = (merchants ?? []) as MerchantRow[];
  if (pending.length === 0) {
    console.log("✅  No merchants need provisioning.\n");
    return;
  }

  await processMerchants(pending);
}

async function processMerchants(merchants: MerchantRow[]) {
  console.log(`Found ${merchants.length} merchant(s) without a wallet:\n`);

  let provisioned = 0;
  let failed = 0;

  for (const merchant of merchants) {
    console.log(`  → ${merchant.business_name} (${merchant.id})`);
    if (DRY_RUN) {
      console.log("     [dry-run] would provision wallet");
      provisioned++;
      continue;
    }

    const ok = await provisionWallet(merchant);
    if (ok) {
      console.log("     ✅  Wallet provisioned");
      provisioned++;
    } else {
      failed++;
    }
  }

  console.log(`\nDone: ${provisioned} provisioned, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
