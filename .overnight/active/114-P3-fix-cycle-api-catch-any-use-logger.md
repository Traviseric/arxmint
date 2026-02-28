---
id: 114
title: "Fix catch(error:any) in cycle API route and use structured logger"
priority: P3
severity: low
status: completed
source: security_audit
file: app/api/cycle/route.ts
line: 29
created: "2026-02-28T00:00:00Z"
cwe: CWE-209
execution_hint: parallel
context_group: independent
group_reason: "INDEPENDENT — small isolated fix, no shared context with other tasks."
---

# Fix catch(error:any) in Cycle API Route and Use Structured Logger

**Priority:** P3 (low)
**Source:** security_audit
**Location:** app/api/cycle/route.ts:29
**CWE:** CWE-209 — Information Exposure Through an Error Message

## Problem

The cycle API catch block uses `catch (error: any)` and logs `error.stack` via `console.error`. While stack traces are not sent to the client, using `any` type bypasses TypeScript's error handling guarantees and `console.error` bypasses the structured logger (added in task 102). This is inconsistent with the rest of the codebase which was updated to `catch (e: unknown)` in tasks 096/097.

Note: This file was missed in the task 097 sweep (review_audit reported "catch_any_remaining: 0" for the files it checked, but `app/api/cycle/route.ts` was not in the code_quality_audit's file list).

**Code with issue:**
```typescript
} catch (error: any) {
  console.error("[ArxMint] GET /api/cycle error:", error.message, error.stack);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

## How to Fix

Change to `catch (error: unknown)` with proper instanceof guards, and use `logger.error()`:

```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ action: 'cycle_api_error', error: message });
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

Import `logger` from `@/lib/logger` at the top of the file.

## Acceptance Criteria

- [ ] `catch (error: any)` changed to `catch (error: unknown)` in `app/api/cycle/route.ts`
- [ ] `console.error` replaced with `logger.error()` using structured fields
- [ ] Error stack trace not logged (only message)
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-209. Quick one-file fix — missed in task 097 sweep. Consistent with project-wide error handling patterns._
