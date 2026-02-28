import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  generateReplicationPlaybook,
  exportPlaybookMarkdown,
} from "../lib/replication-playbook.ts";

// @ts-ignore
import {
  generatePilotDeployment,
} from "../lib/pilot-deployment.ts";

// ---- Fixtures ----

function makeCommunityConfig(overrides = {}) {
  return {
    id: "test-community",
    name: "Longmont Bitcoin Circle",
    description: "A test Bitcoin circular economy",
    memberCount: 100,
    mintBackend: "fedimint" as const,
    privacy: {
      silentPayments: false,
      coinJoin: false,
      payJoin: false,
      arkSpends: false,
    },
    agents: {
      enabled: true,
      l402PriceSats: 100,
      macaroonScope: "read-only" as const,
      mcpEnabled: false,
    },
    guardianCount: 4,
    mintFeePercent: 0.2,
    network: "bitcoin" as const,
    features: [] as never[],
    ...overrides,
  };
}

function makePilotDeployment(locationOverride = "Longmont, CO", configOverrides = {}) {
  const config = makeCommunityConfig(configOverrides);
  return generatePilotDeployment(config, locationOverride);
}

// ---- generateReplicationPlaybook ----

test("generateReplicationPlaybook returns a ReplicationPlaybook with required fields", () => {
  const pilot = makePilotDeployment();
  const playbook = generateReplicationPlaybook(pilot, null);

  assert.ok(typeof playbook.title === "string" && playbook.title.length > 0);
  assert.ok(typeof playbook.version === "string" && playbook.version.length > 0);
  assert.ok(typeof playbook.generatedAt === "number" && playbook.generatedAt > 0);
  assert.ok(typeof playbook.sourcePilot === "string");
  assert.ok(Array.isArray(playbook.sections) && playbook.sections.length > 0);
});

test("generateReplicationPlaybook sourcePilot matches pilot location", () => {
  const pilot = makePilotDeployment("Austin, TX");
  const playbook = generateReplicationPlaybook(pilot, null);

  assert.equal(playbook.sourcePilot, "Austin, TX");
  assert.ok(playbook.title.includes("Austin, TX"), "title should include the pilot location");
});

test("generateReplicationPlaybook sections include standard section IDs", () => {
  const pilot = makePilotDeployment();
  const playbook = generateReplicationPlaybook(pilot, null);

  const sectionIds = playbook.sections.map((s) => s.id);
  assert.ok(sectionIds.includes("overview"), "should have an overview section");
  assert.ok(sectionIds.includes("prerequisites"), "should have a prerequisites section");
  assert.ok(sectionIds.includes("infrastructure"), "should have an infrastructure section");
  assert.ok(sectionIds.includes("merchants"), "should have a merchants section");
  assert.ok(sectionIds.includes("monitoring"), "should have a monitoring section");
  assert.ok(sectionIds.includes("launch"), "should have a launch section");
  assert.ok(sectionIds.includes("growth"), "should have a growth section");
});

test("generateReplicationPlaybook sections have non-empty content", () => {
  const pilot = makePilotDeployment();
  const playbook = generateReplicationPlaybook(pilot, null);

  for (const section of playbook.sections) {
    assert.ok(typeof section.id === "string" && section.id.length > 0, `section.id should be non-empty`);
    assert.ok(typeof section.title === "string" && section.title.length > 0, `section.title should be non-empty`);
    assert.ok(typeof section.content === "string" && section.content.length > 0, `section.content for "${section.id}" should be non-empty`);
  }
});

test("generateReplicationPlaybook guardian section for fedimint includes DKG info", () => {
  const pilot = makePilotDeployment("Longmont, CO", { mintBackend: "fedimint", guardianCount: 4 });
  const playbook = generateReplicationPlaybook(pilot, null);

  const guardianSection = playbook.sections.find((s) => s.id === "guardians");
  assert.ok(guardianSection, "should have a guardians section");
  assert.ok(
    guardianSection!.content.toLowerCase().includes("dkg") ||
    guardianSection!.content.toLowerCase().includes("guardian"),
    "guardian section should mention DKG or guardian setup for fedimint"
  );
});

test("generateReplicationPlaybook guardian section for cashu indicates N/A", () => {
  const pilot = makePilotDeployment("Denver, CO", { mintBackend: "cashu" });
  const playbook = generateReplicationPlaybook(pilot, null);

  const guardianSection = playbook.sections.find((s) => s.id === "guardians");
  assert.ok(guardianSection, "should have a guardians section even for cashu");
  assert.ok(
    guardianSection!.content.toLowerCase().includes("cashu") ||
    guardianSection!.content.toLowerCase().includes("n/a") ||
    guardianSection!.content.toLowerCase().includes("not required"),
    "guardian section for cashu should indicate guardians are not required"
  );
});

test("generateReplicationPlaybook with governance config adds governance section content", () => {
  const pilot = makePilotDeployment();
  const governance = {
    guardians: [],
    selectionCriteria: {
      minCommunityMonths: 3,
      requireVerifiedIdentity: true,
      requireTechnicalAbility: true,
      requireCommunityStake: true,
      preferGeographicDiversity: true,
      preferOrganizationalDiversity: true,
      maximumSingleOrgPercent: 0.5,
    },
    rotation: {
      maxTermMonths: 12,
      cooldownMonths: 3,
      handoverDays: 14,
      maxSimultaneousRotations: 1,
    },
    incidentResponse: {
      severityLevels: [
        { level: "critical", responseTimeHours: 1, quorumRequired: 4 },
        { level: "high", responseTimeHours: 4, quorumRequired: 3 },
      ],
    },
    quorum: {
      consensusThreshold: 3,
      emergencyThreshold: 4,
      treasuryThreshold: 3,
      totalGuardians: 4,
      fullQuorumCategories: ["rotation"],
    },
    treasury: {
      maxUnilateralSpendSats: 100_000,
      minReservePercent: 10,
      requireSpendJustification: true,
      publishSpends: true,
    },
  };
  const playbook = generateReplicationPlaybook(pilot, governance as any);
  const govSection = playbook.sections.find((s) => s.id === "governance");
  assert.ok(govSection, "should have a governance section");
  assert.ok(
    govSection!.content.includes("3") || govSection!.content.includes("Quorum"),
    "governance section should include quorum info when governance config is provided"
  );
});

// ---- exportPlaybookMarkdown ----

test("exportPlaybookMarkdown returns non-empty string", () => {
  const pilot = makePilotDeployment();
  const playbook = generateReplicationPlaybook(pilot, null);
  const md = exportPlaybookMarkdown(playbook);

  assert.ok(typeof md === "string" && md.length > 0);
});

test("exportPlaybookMarkdown includes the playbook title", () => {
  const pilot = makePilotDeployment("Seattle, WA");
  const playbook = generateReplicationPlaybook(pilot, null);
  const md = exportPlaybookMarkdown(playbook);

  assert.ok(md.includes(playbook.title), "markdown should include the playbook title");
});

test("exportPlaybookMarkdown includes Table of Contents", () => {
  const pilot = makePilotDeployment();
  const playbook = generateReplicationPlaybook(pilot, null);
  const md = exportPlaybookMarkdown(playbook);

  assert.ok(md.includes("Table of Contents"), "markdown should have a Table of Contents");
});

test("exportPlaybookMarkdown includes all section content", () => {
  const pilot = makePilotDeployment("Portland, OR");
  const playbook = generateReplicationPlaybook(pilot, null);
  const md = exportPlaybookMarkdown(playbook);

  for (const section of playbook.sections) {
    assert.ok(
      md.includes(section.title),
      `markdown should include section title "${section.title}"`
    );
  }
});

test("exportPlaybookMarkdown includes pilot location in content", () => {
  const pilot = makePilotDeployment("Nashville, TN");
  const playbook = generateReplicationPlaybook(pilot, null);
  const md = exportPlaybookMarkdown(playbook);

  assert.ok(md.includes("Nashville, TN"), "markdown should include the pilot location");
});
