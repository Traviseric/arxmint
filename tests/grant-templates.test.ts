import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  generateFBCEApplication,
  generateOpenSatsApplication,
  generateFediApplication,
  exportGrantMarkdown,
  exportGrantJSON,
} from "../lib/grant-templates.ts";

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

function makeKPITargets(overrides = {}) {
  return {
    merchantsTarget: 30,
    mauTarget: 300,
    successRateTarget: 0.98,
    uptimeTarget: 0.995,
    spendVelocityTarget: 2,
    targetMonths: 6,
    ...overrides,
  };
}

// ---- generateFBCEApplication ----

test("generateFBCEApplication returns a valid GrantApplication", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets();
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "ArxMint Team", 50_000);

  assert.equal(app.program, "fbce");
  assert.equal(app.status, "draft");
  assert.ok(typeof app.title === "string" && app.title.length > 0);
  assert.ok(typeof app.summary === "string" && app.summary.length > 0);
  assert.ok(typeof app.totalBudgetUSD === "number" && app.totalBudgetUSD === 50_000);
  assert.ok(typeof app.generatedAt === "number" && app.generatedAt > 0);
});

test("generateFBCEApplication title includes community name and location", () => {
  const community = makeCommunityConfig({ name: "Boulder Bitcoin" });
  const kpis = makeKPITargets();
  const app = generateFBCEApplication(community, null, kpis, "Boulder, CO", "Test Team", 30_000);

  assert.ok(app.title.includes("Boulder Bitcoin"), "title should include community name");
  assert.ok(app.title.includes("Boulder, CO"), "title should include location");
});

test("generateFBCEApplication milestones are non-empty and have correct structure", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets();
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "Test Team", 50_000);

  assert.ok(Array.isArray(app.milestones) && app.milestones.length >= 3);
  for (const m of app.milestones) {
    assert.ok(typeof m.id === "number");
    assert.ok(typeof m.title === "string" && m.title.length > 0);
    assert.ok(Array.isArray(m.deliverables) && m.deliverables.length > 0);
    assert.ok(typeof m.budgetPercent === "number" && m.budgetPercent > 0);
    assert.ok(typeof m.targetMonth === "number" && m.targetMonth >= 1);
  }
});

test("generateFBCEApplication budget line items sum to total budget", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets();
  const totalBudget = 100_000;
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "Test Team", totalBudget);

  const budgetSum = app.budget.reduce((sum, b) => sum + b.amountUSD, 0);
  // Budget items are rounded, so allow slight deviation
  assert.ok(
    Math.abs(budgetSum - totalBudget) < totalBudget * 0.02,
    `budget sum (${budgetSum}) should be within 2% of total (${totalBudget})`
  );
  assert.equal(app.totalBudgetUSD, totalBudget);
});

test("generateFBCEApplication kpiTargets array reflects PilotKPITargets values", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets({ merchantsTarget: 25, mauTarget: 200 });
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "Test Team", 40_000);

  const kpiStr = app.kpiTargets.join(" ");
  assert.ok(kpiStr.includes("25"), "kpi targets should mention merchant count");
  assert.ok(kpiStr.includes("200"), "kpi targets should mention MAU target");
});

// ---- generateOpenSatsApplication ----

test("generateOpenSatsApplication returns a valid GrantApplication", () => {
  const community = makeCommunityConfig();
  const app = generateOpenSatsApplication(community, null, "ArxMint Dev", 75_000);

  assert.equal(app.program, "opensats");
  assert.equal(app.status, "draft");
  assert.ok(typeof app.title === "string" && app.title.length > 0);
  assert.ok(typeof app.totalBudgetUSD === "number" && app.totalBudgetUSD === 75_000);
  assert.ok(Array.isArray(app.milestones) && app.milestones.length >= 2);
});

test("generateOpenSatsApplication has open-source commitment", () => {
  const community = makeCommunityConfig();
  const app = generateOpenSatsApplication(community, null, "Test Team", 50_000);

  assert.ok(
    app.openSourceCommitment.length > 0,
    "open-source commitment should be non-empty"
  );
  assert.ok(
    app.openSourceCommitment.toLowerCase().includes("open-source") ||
    app.openSourceCommitment.toLowerCase().includes("open source") ||
    app.openSourceCommitment.toLowerCase().includes("mit"),
    "commitment should mention open-source or MIT license"
  );
});

test("generateOpenSatsApplication budget items are valid", () => {
  const community = makeCommunityConfig();
  const app = generateOpenSatsApplication(community, null, "Test Team", 60_000);

  assert.ok(Array.isArray(app.budget) && app.budget.length > 0);
  for (const item of app.budget) {
    assert.ok(typeof item.category === "string");
    assert.ok(typeof item.description === "string");
    assert.ok(typeof item.amountUSD === "number" && item.amountUSD >= 0);
    assert.ok(typeof item.justification === "string");
  }
});

test("generateOpenSatsApplication kpiTargets is a non-empty array", () => {
  const community = makeCommunityConfig();
  const app = generateOpenSatsApplication(community, null, "Test Team", 50_000);

  assert.ok(Array.isArray(app.kpiTargets) && app.kpiTargets.length > 0);
  assert.ok(Array.isArray(app.differentiators) && app.differentiators.length > 0);
});

// ---- generateFediApplication ----

test("generateFediApplication returns a valid Fedi grant application", () => {
  const community = makeCommunityConfig();
  const app = generateFediApplication(community, null, "ArxMint Dev", 40_000);

  assert.equal(app.program, "fedi");
  assert.equal(app.status, "draft");
  assert.ok(app.title.includes(community.name), "Fedi app title should include community name");
  assert.ok(typeof app.totalBudgetUSD === "number" && app.totalBudgetUSD === 40_000);
});

test("generateFediApplication milestones cover federation setup", () => {
  const community = makeCommunityConfig({ guardianCount: 5 });
  const app = generateFediApplication(community, null, "Test Team", 40_000);

  assert.ok(Array.isArray(app.milestones) && app.milestones.length >= 2);
  const allDeliverables = app.milestones.flatMap((m) => m.deliverables).join(" ").toLowerCase();
  assert.ok(
    allDeliverables.includes("guardian") || allDeliverables.includes("federation") || allDeliverables.includes("dkg"),
    "Fedi app deliverables should mention guardian or federation setup"
  );
});

// ---- exportGrantMarkdown ----

test("exportGrantMarkdown returns non-empty string", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets();
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "Test Team", 50_000);
  const md = exportGrantMarkdown(app);

  assert.ok(typeof md === "string" && md.length > 0);
});

test("exportGrantMarkdown includes key sections", () => {
  const community = makeCommunityConfig();
  const kpis = makeKPITargets();
  const app = generateFBCEApplication(community, null, kpis, "Longmont, CO", "Test Team", 50_000);
  const md = exportGrantMarkdown(app);

  assert.ok(md.includes("## Summary"), "markdown should have a Summary section");
  assert.ok(md.includes("## Milestones"), "markdown should have a Milestones section");
  assert.ok(md.includes("## Budget"), "markdown should have a Budget section");
  assert.ok(md.includes("## KPI Targets"), "markdown should have a KPI Targets section");
  assert.ok(md.includes(app.title), "markdown should include the grant title");
});

// ---- exportGrantJSON ----

test("exportGrantJSON returns valid JSON", () => {
  const community = makeCommunityConfig();
  const app = generateOpenSatsApplication(community, null, "Test Team", 50_000);
  const json = exportGrantJSON(app);

  assert.ok(typeof json === "string");
  const parsed = JSON.parse(json); // should not throw
  assert.equal(parsed.program, "opensats");
  assert.equal(parsed.status, "draft");
  assert.ok(typeof parsed.totalBudgetUSD === "number");
});
