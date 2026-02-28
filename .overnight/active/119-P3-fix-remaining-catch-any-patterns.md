---
id: 119
title: "Fix remaining 9 catch(e:any) patterns in 7 files"
priority: P3
severity: low
status: completed
source: review_audit
file: app/api/health/route.ts
line: 26
created: "2026-02-28T10:00:00Z"
execution_hint: sequential
context_group: error_handling
group_reason: "Same pattern fix across 7 files — benefits from warm context, sequential ensures consistency"
---

# Fix remaining 9 catch(e:any) patterns in 7 files

**Priority:** P3 (low)
**Source:** review_audit (task 097 partial completion finding)
**Location:** 7 files listed below

## Problem

Task 097 fixed `catch(e:any)` patterns in 7 files (16 instances total). However, 9 additional instances were NOT in scope for that task and remain unfixed. These use `catch (e: any)` or `catch (err: any)`, which bypasses TypeScript's type system — `e.message` could fail at runtime if the thrown value is not an Error object.

**Files with remaining instances:**

| File | Line | Pattern |
|------|------|---------|
| `components/seed-restore.tsx` | 77 | `catch (err: any)` |
| `app/api/health/route.ts` | 26 | `catch (err: any)` |
| `app/api/health/route.ts` | 42 | `catch (err: any)` |
| `app/api/health/route.ts` | 67 | `catch (err: any)` |
| `app/api/transactions/route.ts` | 30 | `catch (error: any)` |
| `components/merchant-onboard.tsx` | 437 | `catch (err: any)` |
| `app/api/merchants/route.ts` | 27 | `catch (error: any)` |
| `app/api/community/route.ts` | 24 | `catch (error: any)` |
| `components/create-community-form.tsx` | 66 | `catch (err: any)` |

**Code with issue (health/route.ts example):**
```typescript
} catch (err: any) {
  return { ok: false, error: err.message ?? "database unreachable" };
}
```

## How to Fix

For each instance, apply the same pattern established by task 097:

```typescript
// BEFORE (unsafe):
} catch (err: any) {
  return { ok: false, error: err.message ?? "database unreachable" };
}

// AFTER (type-safe):
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { ok: false, error: msg ?? "database unreachable" };
}
```

**For component state setters** (`create-community-form.tsx`, `merchant-onboard.tsx`, `seed-restore.tsx`):
```typescript
// BEFORE:
} catch (err: any) {
  setGenerateError(err.message);
}

// AFTER:
} catch (err: unknown) {
  setGenerateError(err instanceof Error ? err.message : String(err));
}
```

**For API route handlers** (`community/route.ts`, `merchants/route.ts`, `transactions/route.ts`):
```typescript
// BEFORE:
} catch (error: any) {
  // DB not configured — return empty list so UI degrades gracefully
  return NextResponse.json({ communities: [] });
}

// AFTER:
} catch {
  // DB not configured — return empty list so UI degrades gracefully
  return NextResponse.json({ communities: [] });
}
// Note: if error value isn't used, TypeScript 5.x allows bare `catch {}` (no binding)
```

## Acceptance Criteria

- [ ] All 9 `catch (e: any)` / `catch (err: any)` instances converted to `catch (e: unknown)` or bare `catch {}`
- [ ] All `.message` property accesses on caught errors use `instanceof Error` guard or `String(e)` fallback
- [ ] `npm run build` passes with no errors
- [ ] `npm test` passes (260+ tests, 0 fail)

## Notes

_Generated from review_audit new_tasks finding: "Task 097 fixed its claimed 7 files correctly, but these 9 additional instances were not in scope." This is the final cleanup to eliminate all `catch(any)` patterns from the codebase._
