import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  parsePrompt,
  generateDeployment,
  generateDockerCompose,
  generateCommunityConfig,
} from "../lib/community-generator.ts";

// ---- parsePrompt() ----

test("parsePrompt extracts community name from quoted string", () => {
  const parsed = parsePrompt('Create "Sunset Market" for 50 members');
  assert.equal(parsed.communityName, "Sunset Market");
});

test("parsePrompt extracts member count from prompt", () => {
  const parsed = parsePrompt("community for 200 members");
  assert.equal(parsed.memberCount, 200);
});

test("parsePrompt detects maximum privacy level", () => {
  const parsed = parsePrompt("maximum privacy circular economy");
  assert.equal(parsed.privacyLevel, "maximum");
});

test("parsePrompt detects high privacy from 'private' keyword", () => {
  const parsed = parsePrompt("private community for 20 members");
  assert.equal(parsed.privacyLevel, "high");
});

test("parsePrompt selects fedimint for large communities (>50 members)", () => {
  const parsed = parsePrompt("community for 500 members");
  assert.equal(parsed.mintBackend, "fedimint");
  assert.equal(parsed.memberCount, 500);
});

test("parsePrompt selects cashu for small communities (<=50 members)", () => {
  const parsed = parsePrompt("community for 10 members");
  assert.equal(parsed.mintBackend, "cashu");
});

test("parsePrompt handles empty prompt gracefully", () => {
  const parsed = parsePrompt("");
  assert.ok(parsed.communityName.length > 0, "should have a default name");
  assert.ok(parsed.memberCount > 0, "should have a positive default member count");
  assert.ok(Array.isArray(parsed.features), "features should be an array");
  assert.ok(parsed.features.length > 0, "should have default features");
});

test("parsePrompt handles special characters in name", () => {
  const parsed = parsePrompt("Create \"O'Brien's Market\" for 10 members");
  assert.ok(parsed.communityName.length > 0, "name should not be empty");
});

test("parsePrompt detects agent features from keywords", () => {
  const parsed = parsePrompt("AI agent marketplace for 20 members");
  assert.ok(parsed.agentsEnabled, "agents should be enabled");
  assert.ok(parsed.features.includes("agent-marketplace"));
});

test("parsePrompt detects merchant directory feature", () => {
  const parsed = parsePrompt("community with merchant directory");
  assert.ok(parsed.features.includes("merchant-directory"));
});

// ---- generateDeployment() ----

test("generateDeployment returns deployment config object", () => {
  const deployment = generateDeployment("simple community for 10 members");
  assert.ok(deployment, "should return a deployment config");
  assert.ok(deployment.community, "should include community config");
  assert.ok(typeof deployment.dockerCompose === "string", "dockerCompose should be a string");
  assert.ok(deployment.dockerCompose.length > 0, "dockerCompose should be non-empty");
});

test("generateDeployment returns community with ID", () => {
  const deployment = generateDeployment("community for 10 members");
  assert.ok(deployment.community.id, "community should have an ID");
  assert.ok(deployment.community.id.startsWith("sf_"), "ID should have sf_ prefix");
});

test("generateDeployment returns instructions array", () => {
  const deployment = generateDeployment("community for 10 members");
  assert.ok(Array.isArray(deployment.instructions), "should return instructions array");
  assert.ok(deployment.instructions.length > 0, "should have at least one instruction");
});

test("generateDeployment returns L402 endpoints", () => {
  const deployment = generateDeployment("community for 10 members with L402 paywall");
  assert.ok(Array.isArray(deployment.l402Endpoints), "should return l402Endpoints");
});

// ---- generateDockerCompose() ----

test("generateDockerCompose outputs services: and networks: keys", () => {
  const parsed = parsePrompt("simple community for 10 members");
  const config = generateCommunityConfig(parsed);
  const compose = generateDockerCompose(config);
  assert.ok(compose.includes("services:"), "should include services: key");
  assert.ok(compose.includes("networks:"), "should include networks: key");
});

test("generateDockerCompose includes LND service", () => {
  const parsed = parsePrompt("community for 10 members");
  const config = generateCommunityConfig(parsed);
  const compose = generateDockerCompose(config);
  assert.ok(compose.includes("lnd"), "should include LND service");
  assert.ok(compose.includes("lightninglabs/lnd"), "should reference LND Docker image");
});

test("generateDockerCompose includes Cashu mint for small community", () => {
  const parsed = parsePrompt("community for 5 members");
  const config = generateCommunityConfig(parsed);
  const compose = generateDockerCompose(config);
  assert.ok(
    compose.includes("cashu") || compose.includes("nutshell"),
    "should include Cashu mint service"
  );
});

test("generateDockerCompose uses CDK for large community", () => {
  const parsed = parsePrompt("community for 100 members");
  const config = generateCommunityConfig(parsed);
  const compose = generateDockerCompose(config);
  // >30 members uses CDK (cdk-mintd)
  assert.ok(compose.includes("cdk"), "large community should use CDK mint");
});

test("generateDockerCompose includes sovereign network bridge", () => {
  const parsed = parsePrompt("community for 10 members");
  const config = generateCommunityConfig(parsed);
  const compose = generateDockerCompose(config);
  assert.ok(compose.includes("sovereign"), "should define sovereign network");
  assert.ok(compose.includes("bridge"), "should use bridge driver");
});
