import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  __lightningAgentTestUtils,
  SovereignLightningClient,
  validateRemoteSignerConfig,
  validateRemoteSignerEnv,
} from "../lib/lightning-agent.ts";
// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { getTierEscalationConfirmation } from "../lib/types.ts";

function createMockLNC() {
  return class MockLNC {
    lnd: any;

    constructor(_params: any) {
      this.lnd = {
        lightning: {
          getInfo: async () => ({
            alias: "mock-node",
            identity_pubkey: "02abc",
            version: "0.18.0",
            block_height: 850000,
            synced_to_chain: true,
            num_active_channels: 2,
          }),
          walletBalance: async () => ({ total_balance: "100000" }),
          channelBalance: async () => ({ balance: "50000" }),
          listChannels: async () => ({ channels: [] }),
          addInvoice: async ({ value }: { value: string }) => ({
            payment_request: `lnbc${value}mock`,
            r_hash: "deadbeef",
          }),
          sendPaymentSync: async () => ({
            payment_error: "",
            payment_preimage: Buffer.from("cafebabe", "hex").toString("base64"),
            payment_route: { total_fees: "2" },
          }),
          bakeMacaroon: async () => ({ macaroon: "00ff" }),
        },
      };
    }

    async connect(): Promise<void> {}

    disconnect(): void {}
  };
}

test.beforeEach(() => {
  __lightningAgentTestUtils.resetSingleton();
  __lightningAgentTestUtils.resetLNCMock();
  __lightningAgentTestUtils.setLNCMock(createMockLNC());
});

test("validateRemoteSignerConfig requires full signer fields", () => {
  const missing = validateRemoteSignerConfig();
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some((e) => e.includes("signerUrl")));
  assert.ok(missing.errors.some((e) => e.includes("tlsCert")));
  assert.ok(missing.errors.some((e) => e.includes("macaroon")));

  const invalidUrl = validateRemoteSignerConfig({
    signerUrl: "signer.local:8443",
    tlsCert: "cert",
    macaroon: "abc123",
  });
  assert.equal(invalidUrl.valid, false);
  assert.ok(
    invalidUrl.errors.some(
      (e) => e.includes("valid URL") || e.includes("start with http:// or https://")
    )
  );
});

test("validateRemoteSignerEnv requires signer vars only when pay-only is enabled", () => {
  const watchOnly = validateRemoteSignerEnv({
    LNC_SECURITY_TIER: "watch-only",
  });
  assert.equal(watchOnly.valid, true);

  const payOnlyMissing = validateRemoteSignerEnv({
    LNC_SECURITY_TIER: "pay-only",
  });
  assert.equal(payOnlyMissing.valid, false);
  assert.ok(payOnlyMissing.errors.some((e) => e.includes("signerUrl")));

  const payOnlyValid = validateRemoteSignerEnv({
    LNC_SECURITY_TIER: "pay-only",
    REMOTE_SIGNER_URL: "https://signer.local:8443",
    REMOTE_SIGNER_TLS_CERT: "base64cert",
    REMOTE_SIGNER_MACAROON: "00aa11bb",
  });
  assert.equal(payOnlyValid.valid, true);
});

test("watch-only tier blocks invoice and payment operations", async () => {
  const client = new SovereignLightningClient();
  await client.connect("pairing phrase words", "pw");
  assert.equal(client.securityTier, "watch-only");

  await assert.rejects(
    async () => client.createInvoice(1000),
    /requires "pay-only" tier or higher/i
  );
  await assert.rejects(
    async () => client.payInvoice("lnbc1pwatchonly"),
    /requires "pay-only" tier or higher/i
  );
});

test("pay-only tier requires remote signer config and allows payment operations", async () => {
  const client = new SovereignLightningClient();

  await assert.rejects(
    async () => client.connect("pairing phrase words", "pw", "pay-only"),
    /requires a complete remote signer configuration/i
  );

  await assert.rejects(
    async () =>
      client.connect("pairing phrase words", "pw", "pay-only", {
        signerUrl: "https://signer.local:8443",
      }),
    /tlsCert is required/i
  );

  await client.connect("pairing phrase words", "pw", "pay-only", {
    signerUrl: "https://signer.local:8443",
    tlsCert: "base64cert",
    macaroon: "00aa11bb",
  });

  const invoice = await client.createInvoice(42, "test");
  assert.match(invoice.paymentRequest, /^lnbc42mock$/);

  const payment = await client.payInvoice("lnbc42mock");
  assert.equal(payment.feeSats, 2);
  assert.equal(payment.preimage, "cafebabe");
});

test("admin tier is required for bakeMacaroon", async () => {
  const payOnlyClient = new SovereignLightningClient();
  await payOnlyClient.connect("pairing phrase words", "pw", "pay-only", {
    signerUrl: "https://signer.local:8443",
    tlsCert: "base64cert",
    macaroon: "00aa11bb",
  });

  await assert.rejects(
    async () => payOnlyClient.bakeMacaroon({ role: "read-only" }),
    /requires "admin" tier or higher/i
  );

  const adminClient = new SovereignLightningClient();
  await adminClient.connect("pairing phrase words", "pw", "admin");
  const baked = await adminClient.bakeMacaroon({
    role: "read-only",
    ttlSeconds: 60,
  });

  assert.equal(baked.role, "read-only");
  assert.ok(baked.permissions.includes("info:read"));
});

test("tier escalation helper prompts only on risk escalation", () => {
  assert.match(
    getTierEscalationConfirmation("watch-only", "pay-only") || "",
    /Escalate to "pay-only"/i
  );
  assert.match(
    getTierEscalationConfirmation("watch-only", "admin") || "",
    /Never grant admin access to autonomous agents/i
  );
  assert.equal(getTierEscalationConfirmation("pay-only", "watch-only"), null);
  assert.equal(getTierEscalationConfirmation("admin", "admin"), null);
});
