# LAST_MILE_TEST — Evidence-Based Verdict

You are a QA engineer reviewing browser test evidence collected via CDP.
Your job: analyze the evidence and produce a definitive go/no-go verdict.

**Testing focus:** auth_flow (filtered by CONDUCTOR)

## Target Application
**URL:** http://localhost:3000

## Evidence File

Read the evidence file at: `C:/code/arxmint/.overnight/last_mile_test_evidence.json`

This file contains real browser evidence collected via Chrome DevTools Protocol:
- **page_url** / **page_title** — What page was loaded
- **page_text_snippet** — First 500 chars of visible text
- **console_errors** — JavaScript errors captured during testing
- **network_failures** — Failed fetch/XHR requests (4xx, 5xx, network errors)
- **elements_found** — Which common UI elements exist on the page
- **steps_executed** — What automation steps were performed and their results
- **error** — If the scenario itself failed to execute

## Evaluation Instructions

For EACH scenario in the evidence:

1. **Check steps_executed** — Did the automated steps succeed?
2. **Check console_errors** — Any JavaScript errors? (critical for "critical" priority scenarios)
3. **Check network_failures** — Any failed API calls or resources?
4. **Check elements_found** — Are expected UI elements present?
5. **Check page_text_snippet** — Does the page content look right?
6. **Check error field** — Did the scenario fail entirely?

If `collection_error` is set at the top level, the CDP collector failed.
Mark all scenarios as SKIP with reason "evidence_collection_failed".

## SKIP Rules (STRICT)

SKIP is ONLY valid in these cases:
1. The top-level `collection_error` is set (CDP crashed — not your fault)
2. The scenario is a duplicate of another scenario already evaluated
3. The scenario is genuinely not applicable to this project type (e.g., testing e-commerce checkout on a blog)

**Everything else must be PASS or FAIL. Specifically:**
- Auth-gated pages that correctly show a login page or redirect → **PASS** (auth-gating works as designed)
- Pages that load but show errors, missing data, broken elements → **FAIL** with specific issues
- URLs that return 4xx/5xx or have network failures → **FAIL**, not SKIP
- "Stale evidence" or "needs re-run" → NOT a valid SKIP reason — judge what you have
- "Cannot fully verify" → Judge what the evidence shows. Partial evidence still produces a verdict.
- "Insufficient data" → If you have page_text_snippet, console_errors, or network_failures, you have data. Use it.

When in doubt between SKIP and FAIL, choose **FAIL**. False negatives (missing real issues) are far worse than false positives.

## Scenarios (1 total)

   1. [CRITICAL] auth_flow — Test authentication flow
      Steps:
      1. Navigate to http://localhost:3000/login
      2. Try logging in with test credentials
      3. Verify redirect after login
      Expected: Login works, user is redirected appropriately

## Output

Write a JSON file to: `C:/code/arxmint/.overnight/last_mile_test_output.json`

The JSON MUST have this exact structure:
```json
{
  "success": true,
  "next_box": "CONDUCTOR or WORKER",
  "verdict": "GO or NO_GO or PARTIAL",
  "summary": "One-line summary of test results",
  "total": 1,
  "passed": 0,
  "failed": 0,
  "results": [
    {
      "scenario": "scenario_name",
      "priority": "critical|high|medium|low",
      "status": "PASS|FAIL|SKIP",
      "actual": "what the evidence shows",
      "issues": [],
      "fix_actions": ["Specific action to fix this issue, e.g. 'Check route handler at /api/health'"],
      "evidence": "key evidence snippet"
    }
  ],
  "critical_failures": [],
  "recommendations": []
}
```

## Verdict Logic

- **GO**: All critical and high priority scenarios PASS -> set `next_box: "CONDUCTOR"`
- **NO_GO**: ANY critical priority scenario FAILS -> set `next_box: "WORKER"`
- **PARTIAL**: All critical pass but some medium/low fail -> set `next_box: "CONDUCTOR"`

## fix_actions (Required for FAIL results)

For every scenario with status FAIL, you MUST include `fix_actions` — a list of specific,
actionable steps a developer can take to fix the issue. Examples:
- "Check route handler for /api/health — returning 500"
- "Verify Railway deployment has DATABASE_URL env var set"
- "Fix the React component at src/components/Dashboard.tsx — rendering blank"
- "Add CORS headers for API requests from the frontend domain"

Generic advice like "fix the bug" or "investigate the issue" is NOT acceptable.
Each fix_action should point to a specific file, route, config, or component when possible.

## After Writing Output

After writing the JSON file, write `DONE` to: `C:/code/arxmint/.overnight/last_mile_test_COMPLETE`

Be thorough in your analysis. The evidence is real browser data — trust it.
