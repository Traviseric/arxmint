---
id: 101
title: "Add input validation + structured error responses across API routes"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_29
file: lib/validation.ts
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: long_running
context_group: api_security
group_reason: "API security layer: touches same API routes as tasks 100, 102, 103"
---

# Add input validation + structured error responses across API routes

**Priority:** P1
**Source:** OVERNIGHT_TASKS.md ID 29 — Production Readiness Gate
**Location:** new `lib/validation.ts`, update API route handlers

## Problem

ArxMint's API endpoints accept user input without server-side validation:
- Community names could be empty, too long, or contain HTML/script injection
- Merchant data has no required field enforcement
- Payment amounts aren't validated as positive integers within value caps
- Cashu tokens passed to the SDK aren't pre-validated for basic format
- Error responses leak implementation details (stack traces, raw Prisma errors)

Example of current unprotected route (approximate):
```typescript
// No validation — accepts anything
const { name, prompt } = await request.json();
await db.community.create({ data: { name, prompt } });
```

Before the Longmont pilot accepts real money, all user input MUST be validated server-side.

## How to Fix

### Step 1: Create `lib/validation.ts`

```typescript
export class ValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCommunityName(name: unknown): string {
  if (typeof name !== 'string') throw new ValidationError('name', 'Name must be a string');
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new ValidationError('name', 'Name is required');
  if (trimmed.length > 100) throw new ValidationError('name', 'Name must be 100 characters or less');
  // Next.js auto-escapes HTML in JSX; this prevents stored XSS in DB
  if (/<script/i.test(trimmed)) throw new ValidationError('name', 'Invalid characters in name');
  return trimmed;
}

export function validatePrompt(prompt: unknown): string {
  if (typeof prompt !== 'string') throw new ValidationError('prompt', 'Prompt must be a string');
  const trimmed = prompt.trim();
  if (trimmed.length === 0) throw new ValidationError('prompt', 'Prompt is required');
  if (trimmed.length > 2000) throw new ValidationError('prompt', 'Prompt must be 2000 characters or less');
  return trimmed;
}

export function validateAmount(amount: unknown): number {
  const n = Number(amount);
  if (!Number.isInteger(n)) throw new ValidationError('amount', 'Amount must be an integer');
  if (n <= 0) throw new ValidationError('amount', 'Amount must be positive');
  if (n > 1_000_000) throw new ValidationError('amount', 'Amount exceeds maximum (1,000,000 sats)');
  return n;
}

export function validateCashuToken(token: unknown): string {
  if (typeof token !== 'string') throw new ValidationError('token', 'Token must be a string');
  // Cashu tokens start with 'cashu' prefix (TokenV3/V4)
  if (!token.startsWith('cashu')) throw new ValidationError('token', 'Invalid Cashu token format');
  if (token.length > 100_000) throw new ValidationError('token', 'Token too large');
  return token;
}

export function validateMerchantData(data: unknown): { name: string; description?: string; category?: string } {
  if (typeof data !== 'object' || data === null) throw new ValidationError('body', 'Request body must be an object');
  const d = data as Record<string, unknown>;
  const name = validateCommunityName(d.name);
  const description = d.description !== undefined ? String(d.description).slice(0, 500) : undefined;
  const category = d.category !== undefined ? String(d.category).slice(0, 50) : undefined;
  return { name, description, category };
}

// Standard error response format — never return stack traces
export function errorResponse(error: unknown, status = 400): { error: string; code: string } {
  if (error instanceof ValidationError) {
    return { error: error.message, code: `VALIDATION_${error.field.toUpperCase()}` };
  }
  if (error instanceof Error) {
    // Don't leak internal error messages in production
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      error: isProduction ? 'Request failed' : error.message,
      code: 'INTERNAL_ERROR',
    };
  }
  return { error: 'Unknown error', code: 'UNKNOWN' };
}
```

### Step 2: Update API routes to use validation

In each API route handler, wrap user input in validation calls:

```typescript
// Example: app/api/community/route.ts
import { validateCommunityName, validatePrompt, errorResponse } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = validateCommunityName(body.name);
    const prompt = validatePrompt(body.prompt);
    // ... proceed with validated data
  } catch (e: unknown) {
    const errBody = errorResponse(e);
    const status = e instanceof ValidationError ? 400 : 500;
    return NextResponse.json(errBody, { status });
  }
}
```

**Routes to update:**
- `app/api/community/route.ts` — validate `name`, `prompt`
- `app/api/merchants/route.ts` — validate merchant data fields
- `app/api/transactions/route.ts` — validate `amount`, `type`, `backend`
- `app/api/payment/route.ts` — validate `amount`, `type`
- `app/api/payment/verify/route.ts` — validate Cashu token format
- `app/api/l402/route.ts` — validate request format
- `app/api/agent/route.ts` — validate action parameters

## Acceptance Criteria

- [ ] `lib/validation.ts` created with validators for: community name, prompt, amount, Cashu token, merchant data
- [ ] `errorResponse()` helper never returns stack traces in production
- [ ] All user-facing API routes use validation before accessing DB or calling SDKs
- [ ] Validation failures return HTTP 400 with `{ error: string, code: string }` format
- [ ] Internal errors in production return `{ error: "Request failed", code: "INTERNAL_ERROR" }` (no stack traces)
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 29. Next.js JSX auto-escapes HTML, so the script injection check is defense-in-depth for stored content. The error format `{ error, code }` is the standard used by payment endpoints — extend to all routes for consistency._
