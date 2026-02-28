---
id: 99
title: "Add unit tests for grant-templates.ts, replication-playbook.ts, pilot-deployment.ts"
priority: P2
severity: low
status: completed
source: code_quality_audit
file: tests/
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: parallel
context_group: testing
group_reason: "Independent test additions. No overlap with other tasks."
---

# Add unit tests for grant-templates.ts, replication-playbook.ts, pilot-deployment.ts

**Priority:** P2 (low)
**Source:** code_quality_audit
**Location:** `tests/` — new files needed for `lib/grant-templates.ts`, `lib/replication-playbook.ts`, `lib/pilot-deployment.ts`

## Problem

Three substantial lib modules have no test coverage:
- `lib/grant-templates.ts` — 534 lines, generates grant applications (FBCE, OpenSats)
- `lib/replication-playbook.ts` — 553 lines, generates replication playbooks + markdown export
- `lib/pilot-deployment.ts` — 762 lines, generates pilot timelines + KPI targets + multi-city networks

These are pure transformation functions (in → out, no side effects, no external dependencies) making them ideal for unit tests. A bug in grant template generation would produce malformed applications without any signal.

## How to Fix

Create three test files using the existing `node:test` runner pattern (NOT vitest — check existing test files for the pattern):

### `tests/grant-templates.test.ts`
Test the main exports: `generateFBCEApplication()`, `generateOpenSatsApplication()`
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFBCEApplication, generateOpenSatsApplication } from '../lib/grant-templates.ts';

test('generateFBCEApplication returns required fields', () => {
  const result = generateFBCEApplication({ communityName: 'Test Community', location: 'Denver, CO' });
  assert.ok(result.title);
  assert.ok(result.narrative);
  assert.ok(typeof result.budget === 'number');
});

test('generateOpenSatsApplication returns required fields', () => {
  const result = generateOpenSatsApplication({ projectName: 'ArxMint Test' });
  assert.ok(result.title);
  assert.ok(result.description);
});
```

### `tests/replication-playbook.test.ts`
Test `generateReplicationPlaybook()` and `exportPlaybookMarkdown()`
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReplicationPlaybook, exportPlaybookMarkdown } from '../lib/replication-playbook.ts';

test('generateReplicationPlaybook returns structured playbook', () => {
  const playbook = generateReplicationPlaybook({ city: 'Test City', population: 50000 });
  assert.ok(playbook.phases);
  assert.ok(Array.isArray(playbook.phases));
  assert.ok(playbook.phases.length > 0);
});

test('exportPlaybookMarkdown returns non-empty string', () => {
  const playbook = generateReplicationPlaybook({ city: 'Test City', population: 50000 });
  const md = exportPlaybookMarkdown(playbook);
  assert.ok(typeof md === 'string');
  assert.ok(md.length > 0);
  assert.ok(md.includes('Test City'));
});
```

### `tests/pilot-deployment.test.ts`
Test `generatePilotTimeline()`, `PilotKPITargets`, `MultiCityNetwork`
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePilotTimeline, PilotKPITargets } from '../lib/pilot-deployment.ts';

test('generatePilotTimeline returns timeline with phases', () => {
  const timeline = generatePilotTimeline({ city: 'Longmont', startDate: new Date('2026-03-01') });
  assert.ok(Array.isArray(timeline.phases));
  assert.ok(timeline.phases.length >= 3);
});

test('PilotKPITargets has required target fields', () => {
  assert.ok(typeof PilotKPITargets.merchantCount === 'number');
  assert.ok(typeof PilotKPITargets.activeSpenders === 'number');
});
```

**Important:** Read the actual exported function signatures from each file before writing tests. The examples above are approximate — match the actual API.

Run tests with: `npm run test:e2e` or `node --experimental-strip-types --test tests/*.test.ts tests/e2e/*.test.ts`

## Acceptance Criteria

- [ ] `tests/grant-templates.test.ts` created with at least 4 meaningful tests
- [ ] `tests/replication-playbook.test.ts` created with at least 4 meaningful tests
- [ ] `tests/pilot-deployment.test.ts` created with at least 4 meaningful tests
- [ ] All new tests pass via `npm test`
- [ ] Tests use `node:test` runner (not vitest) — match the pattern in existing test files
- [ ] Tests cover happy path AND at least one edge case per module

## Notes

_Generated from code_quality_audit round 6. These are pure transformation functions — no mocking needed. Read each lib file carefully before writing tests to match the actual exported API signatures._
