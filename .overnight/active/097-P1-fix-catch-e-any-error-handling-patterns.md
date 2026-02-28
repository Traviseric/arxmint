---
id: 97
title: "Fix catch(e:any) error handling patterns → catch(e:unknown) across 7 files"
priority: P1
severity: medium
status: completed
source: code_quality_audit
file: components/wallet-panel.tsx
line: 267
created: "2026-02-28T08:00:00Z"
execution_hint: long_running
context_group: error_handling
group_reason: "Same root cause and identical fix across 7 files. Same file overlap as task 098."
---

# Fix catch(e:any) error handling patterns → catch(e:unknown) across 7 files

**Priority:** P1 (medium × 16 instances)
**Source:** code_quality_audit
**Locations:** 7 files, 16 total instances

## Problem

Throughout the codebase, catch blocks use the pattern `catch (e: any)` which bypasses TypeScript's type system. When `e` is typed as `any`, accessing `e.message` will compile even if the thrown value is not an Error object, potentially causing `undefined` access at runtime.

The correct pattern is `catch (e: unknown)` with an `instanceof Error` guard before accessing `.message`.

**Files and instances to fix:**

1. **`components/wallet-panel.tsx`** — 9 instances at lines: 267, 509, 671, 710, 955, 978, 1046, 1088, 1175
2. **`lib/cashu-sdk.ts`** — 1 instance at line 1562
3. **`lib/cashu-paywall.ts`** — 1 instance at line 137
4. **`lib/community-generator.ts`** — 1 instance at line 1048
5. **`app/api/l402/route.ts`** — 2 instances at lines 129, 170
6. **`app/community/[id]/page.tsx`** — 1 instance at line 368
7. **`components/cycle-alerts.tsx`** — 1 instance at line 26

**Example of the pattern to fix:**
```typescript
// BEFORE (unsafe):
} catch (e: any) {
  setError(e.message);
}

// AFTER (safe):
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  setError(msg);
}
```

## How to Fix

For each `catch (e: any)` block:

1. Change `catch (e: any)` to `catch (e: unknown)`
2. Before any property access on `e`, add a type guard:
   ```typescript
   const msg = e instanceof Error ? e.message : String(e);
   ```
3. Replace all `e.message` accesses with `msg` (or the equivalent extracted string)
4. For cases where the full Error object is passed somewhere, wrap it:
   ```typescript
   const error = e instanceof Error ? e : new Error(String(e));
   ```

**For API route handlers (`app/api/l402/route.ts`):**
```typescript
// BEFORE:
} catch (e: any) {
  return NextResponse.json({ error: e.message }, { status: 500 });
}

// AFTER:
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : 'Internal server error';
  return NextResponse.json({ error: msg }, { status: 500 });
}
```

**For component state setters (`components/wallet-panel.tsx`):**
```typescript
// BEFORE:
} catch (e: any) {
  setError(e.message);
}

// AFTER:
} catch (e: unknown) {
  setError(e instanceof Error ? e.message : String(e));
}
```

## Acceptance Criteria

- [ ] All 16 `catch (e: any)` instances changed to `catch (e: unknown)` in the 7 files
- [ ] All `.message` property accesses on caught errors use `instanceof Error` guard
- [ ] No new TypeScript errors introduced
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from code_quality_audit round 6. 16 instances across 7 files. Do NOT touch `lib/nostr-auth.ts` catch blocks (intentional security behavior, in lessons.json rejected). Do NOT touch `lib/store.ts` catch blocks (intentional graceful degradation, in lessons.json rejected)._
