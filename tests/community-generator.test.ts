import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { parsePrompt, generateDeployment } from "../lib/community-generator.ts";

// ---------------------------------------------------------------------------
// parsePrompt() — name extraction
// ---------------------------------------------------------------------------

test("parsePrompt() extracts community name from quoted string", () => {
  const parsed = parsePrompt('Build a Bitcoin community called "Sunset Village" for 10 people');
  assert.equal(parsed.communityName, "Sunset Village");
});

test("parsePrompt() extracts name via 'named X' pattern", () => {
  const parsed = parsePrompt("I want a community named CryptoCircle for merchants");
  assert.equal(parsed.communityName, "CryptoCircle");
});

test("parsePrompt() defaults to 'ArxMint Community' when no name found", () => {
  const parsed = parsePrompt("I need a small Bitcoin group for 5 people");
  assert.equal(parsed.communityName, "ArxMint Community");
});

// ---------------------------------------------------------------------------
// parsePrompt() — member count
// ---------------------------------------------------------------------------

test("parsePrompt() extracts member count from '50 people'", () => {
  const parsed = parsePrompt("Create a Bitcoin group for 50 people");
  assert.equal(parsed.memberCount, 50);
});

test("parsePrompt() extracts member count from '100 members'", () => {
  const parsed = parsePrompt("100 members need a federation");
  assert.equal(parsed.memberCount, 100);
});

test("parsePrompt() defaults memberCount to 20 when not specified", () => {
  const parsed = parsePrompt("simple Bitcoin community");
  assert.equal(parsed.memberCount, 20);
});

// ---------------------------------------------------------------------------
// parsePrompt() — feature detection
// ---------------------------------------------------------------------------

test("parsePrompt() detects 'chat' feature from keyword", () => {
  const parsed = parsePrompt("I want a Bitcoin community with a chat for 10 people");
  assert.ok(parsed.features.includes("chat"), "should detect chat feature");
});

test("parsePrompt() detects 'agent-marketplace' from 'AI bot' keyword", () => {
  const parsed = parsePrompt("Create a community with AI agents and automation");
  assert.ok(parsed.features.includes("agent-marketplace"), "should detect agent feature");
});

test("parsePrompt() detects 'merchant-directory' from 'shop' keyword", () => {
  const parsed = parsePrompt("Build a shop directory for local merchants");
  assert.ok(parsed.features.includes("merchant-directory"), "should detect merchant feature");
});

test("parsePrompt() defaults to 3 features when no keywords match", () => {
  const parsed = parsePrompt("vague prompt with no specific keywords");
  assert.equal(parsed.features.length, 3, "should default to chat + privacy-dashboard + cycle-alerts");
  assert.ok(parsed.features.includes("chat"));
  assert.ok(parsed.features.includes("privacy-dashboard"));
  assert.ok(parsed.features.includes("cycle-alerts"));
});

// ---------------------------------------------------------------------------
// parsePrompt() — mint backend selection
// ---------------------------------------------------------------------------

test("parsePrompt() defaults to cashu for small communities", () => {
  const parsed = parsePrompt("small community for 5 bitcoiners");
  assert.equal(parsed.mintBackend, "cashu");
});

test("parsePrompt() selects fedimint for communities over 50 members", () => {
  const parsed = parsePrompt("Build a Bitcoin economy for 100 people");
  assert.equal(parsed.mintBackend, "fedimint");
});

test("parsePrompt() selects fedimint from 'fedimint' keyword", () => {
  const parsed = parsePrompt("Set up a Fedimint federation for 10 people");
  assert.equal(parsed.mintBackend, "fedimint");
});

// ---------------------------------------------------------------------------
// parsePrompt() — privacy level detection
// ---------------------------------------------------------------------------

test("parsePrompt() defaults to 'standard' privacy level", () => {
  const parsed = parsePrompt("simple Bitcoin group");
  assert.equal(parsed.privacyLevel, "standard");
});

test("parsePrompt() detects 'high' privacy from 'strong privacy' keyword", () => {
  const parsed = parsePrompt("I need strong privacy for my group");
  assert.equal(parsed.privacyLevel, "high");
});

test("parsePrompt() detects 'maximum' privacy from 'maximum' keyword", () => {
  const parsed = parsePrompt("maximum privacy Bitcoin community");
  assert.equal(parsed.privacyLevel, "maximum");
});

// ---------------------------------------------------------------------------
// parsePrompt() — agentsEnabled flag
// ---------------------------------------------------------------------------

test("parsePrompt() sets agentsEnabled when agent keyword present", () => {
  const parsed = parsePrompt("AI agent marketplace with l402 paywalls");
  assert.equal(parsed.agentsEnabled, true);
});

test("parsePrompt() agentsEnabled is false for simple community with no agent keywords", () => {
  const parsed = parsePrompt("small quiet Bitcoin savings group for 5 people");
  assert.equal(parsed.agentsEnabled, false);
});

// ---------------------------------------------------------------------------
// generateDeployment() — structure and content
// ---------------------------------------------------------------------------

test("generateDeployment() returns an object with community, dockerCompose, instructions, l402Endpoints", () => {
  const deployment = generateDeployment("Build a community for 10 people");
  assert.ok(deployment.community, "should have community config");
  assert.ok(typeof deployment.dockerCompose === "string", "dockerCompose should be a string");
  assert.ok(Array.isArray(deployment.instructions), "instructions should be an array");
  assert.ok(Array.isArray(deployment.l402Endpoints), "l402Endpoints should be an array");
});

test("generateDeployment() dockerCompose includes LND service", () => {
  const deployment = generateDeployment("Build a Bitcoin community for 10 people");
  assert.ok(
    deployment.dockerCompose.includes("lnd:"),
    "dockerCompose should include LND service"
  );
});

test("generateDeployment() dockerCompose includes a Cashu mint service for small communities", () => {
  const deployment = generateDeployment("small Bitcoin community for 5 people");
  // Small community (5 members, cashu backend) should include a cashu/nutshell service
  assert.ok(
    deployment.dockerCompose.includes("cashu") ||
    deployment.dockerCompose.includes("nutshell") ||
    deployment.dockerCompose.includes("cdk"),
    "dockerCompose should include a Cashu mint service"
  );
});

test("generateDeployment() community.name matches prompt content", () => {
  const deployment = generateDeployment("Build a community called \"Alpine Node\" for 15 people");
  assert.equal(deployment.community.name, "Alpine Node");
});

test("generateDeployment() community network defaults to testnet", () => {
  const deployment = generateDeployment("simple Bitcoin group");
  assert.equal(deployment.community.network, "testnet");
});

test("generateDeployment() respects explicit mainnet network parameter", () => {
  const deployment = generateDeployment("small Bitcoin community", "bitcoin");
  assert.equal(deployment.community.network, "bitcoin");
});

test("generateDeployment() instructions is a non-empty array of strings", () => {
  const deployment = generateDeployment("Build a community for 10 people");
  assert.ok(deployment.instructions.length > 0, "should have at least one instruction");
  assert.ok(
    typeof deployment.instructions[0] === "string",
    "instructions should be strings"
  );
});

test("generateDeployment() community.id is a non-empty string", () => {
  const deployment = generateDeployment("simple group");
  assert.ok(typeof deployment.community.id === "string");
  assert.ok(deployment.community.id.length > 0, "id should be non-empty");
});
