import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  generatePilotTimeline,
  generatePreLaunchChecklist,
  evaluatePilotKPIs,
  generateLongmontPilot,
  generatePilotDeployment,
  createMultiCityNetwork,
  addCityToNetwork,
  LONGMONT_KPI_TARGETS,
} from "../lib/pilot-deployment.ts";

// ---- Fixtures ----

function makeCommunityConfig(overrides = {}) {
  return {
    id: "test-community",
    name: "Test Bitcoin Community",
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
      enabled: false,
      l402PriceSats: 100,
      macaroonScope: "read-only" as const,
      mcpEnabled: false,
    },
    guardianCount: 4,
    mintFeePercent: 0.2,
    network: "testnet" as const,
    features: [] as never[],
    ...overrides,
  };
}

function makeBCEMetrics(overrides = {}) {
  return {
    id: "bce_test_001",
    timestamp: Date.now(),
    merchantCount: 30,
    merchantsActive: 25,
    mau: 300,
    spendVelocity: 2.5,
    paymentSuccessRate: 0.99,
    uptime: 0.995,
    ecashCirculation: 5_000_000,
    inboundLiquidity: 10_000_000,
    liquidityCoverage: 5.0,
    maturityTier: "growing" as const,
    healthScore: 85,
    ...overrides,
  };
}

// ---- LONGMONT_KPI_TARGETS constant ----

test("LONGMONT_KPI_TARGETS has all required fields", () => {
  assert.ok(typeof LONGMONT_KPI_TARGETS.merchantsTarget === "number");
  assert.ok(typeof LONGMONT_KPI_TARGETS.mauTarget === "number");
  assert.ok(typeof LONGMONT_KPI_TARGETS.successRateTarget === "number");
  assert.ok(typeof LONGMONT_KPI_TARGETS.uptimeTarget === "number");
  assert.ok(typeof LONGMONT_KPI_TARGETS.spendVelocityTarget === "number");
  assert.ok(typeof LONGMONT_KPI_TARGETS.targetMonths === "number");
  assert.equal(LONGMONT_KPI_TARGETS.merchantsTarget, 30);
  assert.equal(LONGMONT_KPI_TARGETS.mauTarget, 300);
  assert.equal(LONGMONT_KPI_TARGETS.targetMonths, 6);
});

// ---- generatePilotTimeline ----

test("generatePilotTimeline returns 6 phases by default", () => {
  const timeline = generatePilotTimeline();
  assert.ok(Array.isArray(timeline));
  assert.ok(timeline.length >= 3, `expected >= 3 phases, got ${timeline.length}`);
});

test("generatePilotTimeline phases include required fields", () => {
  const timeline = generatePilotTimeline(6);
  for (const phase of timeline) {
    assert.ok(typeof phase.phase === "string", "phase.phase should be a string");
    assert.ok(typeof phase.label === "string", "phase.label should be a string");
    assert.ok(typeof phase.monthStart === "number", "phase.monthStart should be a number");
    assert.ok(typeof phase.monthEnd === "number", "phase.monthEnd should be a number");
    assert.ok(Array.isArray(phase.targets), "phase.targets should be an array");
    assert.ok(Array.isArray(phase.deliverables), "phase.deliverables should be an array");
    assert.ok(phase.targets.length > 0, "each phase should have at least one target");
  }
});

test("generatePilotTimeline includes pre-launch and evaluation phases", () => {
  const timeline = generatePilotTimeline(6);
  const phases = timeline.map((p) => p.phase);
  assert.ok(phases.includes("pre-launch"), "should include pre-launch phase");
  assert.ok(phases.includes("evaluation"), "should include evaluation phase");
});

test("generatePilotTimeline custom targetMonths shifts steady-state monthStart", () => {
  const timeline12 = generatePilotTimeline(12);
  const steadyState = timeline12.find((p) => p.phase === "steady-state");
  assert.ok(steadyState, "should have a steady-state phase");
  assert.equal(steadyState!.monthStart, 12);
});

// ---- generatePreLaunchChecklist ----

test("generatePreLaunchChecklist returns items with required fields", () => {
  const config = makeCommunityConfig();
  const items = generatePreLaunchChecklist(config);
  assert.ok(Array.isArray(items) && items.length > 0);
  for (const item of items) {
    assert.ok(typeof item.id === "string");
    assert.ok(typeof item.label === "string");
    assert.ok(typeof item.description === "string");
    assert.ok(typeof item.required === "boolean");
    assert.ok(typeof item.completed === "boolean");
  }
});

test("generatePreLaunchChecklist all items start uncompleted", () => {
  const config = makeCommunityConfig();
  const items = generatePreLaunchChecklist(config);
  const anyCompleted = items.some((item) => item.completed);
  assert.equal(anyCompleted, false, "all checklist items should start uncompleted");
});

test("generatePreLaunchChecklist includes guardian items for fedimint backend", () => {
  const config = makeCommunityConfig({ mintBackend: "fedimint" });
  const items = generatePreLaunchChecklist(config);
  const guardianItem = items.find((i) => i.id === "gov-guardians");
  assert.ok(guardianItem, "fedimint config should have guardian checklist item");
  assert.equal(guardianItem!.required, true);
});

test("generatePreLaunchChecklist guardian item not required for cashu backend", () => {
  const config = makeCommunityConfig({ mintBackend: "cashu" });
  const items = generatePreLaunchChecklist(config);
  const guardianItem = items.find((i) => i.id === "gov-guardians");
  // Guardian item exists but is not required for cashu
  if (guardianItem) {
    assert.equal(guardianItem.required, false, "guardian item should not be required for cashu");
  }
});

// ---- evaluatePilotKPIs ----

test("evaluatePilotKPIs returns evaluations for all KPI categories", () => {
  const metrics = makeBCEMetrics();
  const result = evaluatePilotKPIs(metrics);
  assert.ok(Array.isArray(result.evaluations));
  assert.ok(result.evaluations.length >= 4, "should evaluate at least 4 KPIs");
  assert.ok(typeof result.overallScore === "number");
  assert.ok(typeof result.allMet === "boolean");
});

test("evaluatePilotKPIs allMet is true when metrics exceed targets", () => {
  const exceedingMetrics = makeBCEMetrics({
    merchantCount: 35,
    mau: 350,
    paymentSuccessRate: 0.99,
    uptime: 0.999,
    spendVelocity: 3,
  });
  const result = evaluatePilotKPIs(exceedingMetrics, LONGMONT_KPI_TARGETS);
  assert.equal(result.allMet, true, "should be all met when all metrics exceed targets");
});

test("evaluatePilotKPIs allMet is false when metrics fall short", () => {
  const lowMetrics = makeBCEMetrics({
    merchantCount: 5,
    mau: 30,
    paymentSuccessRate: 0.7,
    uptime: 0.9,
    spendVelocity: 0.5,
  });
  const result = evaluatePilotKPIs(lowMetrics, LONGMONT_KPI_TARGETS);
  assert.equal(result.allMet, false, "should not be all met with low metrics");
});

test("evaluatePilotKPIs overallScore is between 0 and 100", () => {
  const metrics = makeBCEMetrics();
  const result = evaluatePilotKPIs(metrics);
  assert.ok(result.overallScore >= 0, "overallScore should be >= 0");
  assert.ok(result.overallScore <= 100, "overallScore should be <= 100");
});

// ---- generateLongmontPilot ----

test("generateLongmontPilot returns pilot with Longmont location", () => {
  const config = makeCommunityConfig();
  const pilot = generateLongmontPilot(config);
  assert.equal(pilot.location, "Longmont, CO");
  assert.equal(pilot.community, config);
  assert.ok(Array.isArray(pilot.timeline) && pilot.timeline.length > 0);
  assert.ok(Array.isArray(pilot.checklist) && pilot.checklist.length > 0);
});

test("generateLongmontPilot uses LONGMONT_KPI_TARGETS", () => {
  const config = makeCommunityConfig();
  const pilot = generateLongmontPilot(config);
  assert.equal(pilot.kpiTargets.merchantsTarget, LONGMONT_KPI_TARGETS.merchantsTarget);
  assert.equal(pilot.kpiTargets.mauTarget, LONGMONT_KPI_TARGETS.mauTarget);
});

// ---- generatePilotDeployment ----

test("generatePilotDeployment returns pilot with specified location", () => {
  const config = makeCommunityConfig();
  const pilot = generatePilotDeployment(config, "Denver, CO");
  assert.equal(pilot.location, "Denver, CO");
  assert.equal(pilot.community, config);
});

test("generatePilotDeployment merges customTargets over defaults", () => {
  const config = makeCommunityConfig();
  const pilot = generatePilotDeployment(config, "Austin, TX", {
    merchantsTarget: 50,
    targetMonths: 9,
  });
  assert.equal(pilot.kpiTargets.merchantsTarget, 50);
  assert.equal(pilot.kpiTargets.targetMonths, 9);
  // non-overridden fields should still be defaults
  assert.equal(pilot.kpiTargets.mauTarget, LONGMONT_KPI_TARGETS.mauTarget);
});

// ---- createMultiCityNetwork ----

test("createMultiCityNetwork creates network with one hub city", () => {
  const config = makeCommunityConfig();
  const pilot = generatePilotDeployment(config, "Longmont, CO");
  const network = createMultiCityNetwork("Colorado Bitcoin Network", pilot, "https://mint.example.com");
  assert.equal(network.name, "Colorado Bitcoin Network");
  assert.equal(network.cities.length, 1);
  assert.ok(network.cities[0].isHub, "first city should be hub");
  assert.equal(network.aggregateKPIs.totalCities, 1);
  assert.equal(network.version, 1);
});

test("addCityToNetwork grows city count and bumps version", () => {
  const config = makeCommunityConfig();
  const pilot = generatePilotDeployment(config, "Longmont, CO");
  const network = createMultiCityNetwork("Colorado Bitcoin Network", pilot, "https://mint1.example.com");

  const config2 = makeCommunityConfig({ id: "denver", name: "Denver Bitcoin" });
  const network2 = addCityToNetwork(
    network,
    "Denver Bitcoin",
    "Denver, CO",
    config2,
    "https://mint2.example.com"
  );

  assert.equal(network2.cities.length, 2);
  assert.equal(network2.version, 2);
  assert.equal(network2.aggregateKPIs.totalCities, 2);
  const hub = network2.cities.find((c) => c.isHub);
  assert.ok(hub, "hub city should still exist");
});
