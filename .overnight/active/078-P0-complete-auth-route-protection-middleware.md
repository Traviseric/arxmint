---
id: 78
title: "Complete auth: add session-based route protection for /wallet /merchant /admin"
priority: P0
severity: high
status: completed
source: overnight_tasks_id_6
file: middleware.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: auth_module
group_reason: "Auth-related. Tasks 085 (shared Nostr auth) depends on this."
---

# Complete auth: add session-based route protection for /wallet /merchant /admin

**Priority:** P0 (high)
**Source:** OVERNIGHT_TASKS.md ID 6
**Location:** middleware.ts, app/api/auth/route.ts

## Problem

The current `middleware.ts` only handles CORS — it does NOT protect any routes. Any user can access `/wallet`, `/merchant`, or `/admin` without authentication. The custom `app/api/auth/route.ts` creates httpOnly session cookies via `createSession()` from `lib/auth-middleware.ts`, but the middleware never checks for these cookies on page navigation.

This means:
- `/wallet` — accessible by anyone
- `/merchant` — accessible by anyone
- Any future `/admin` routes — accessible by anyone

Research #4 requires: Auth.js with Nostr NIP-98 credentials provider + Email magic link + Prisma adapter for session persistence. The current custom auth is a simpler stepping stone — but at minimum, the middleware must validate sessions.

## How to Fix

1. **Update `middleware.ts`** to check session cookies on protected routes:

```typescript
// middleware.ts — updated to add route protection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth-middleware';

const PROTECTED_ROUTES = ['/wallet', '/merchant', '/admin', '/dashboard'];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];
const SESSION_COOKIE = 'arxmint_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isProtectedPage = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));

  // Session gate for protected pages
  if (isProtectedPage) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken || !validateSession(sessionToken)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // CORS handling for API routes (existing logic preserved)
  if (isApiRoute) {
    const origin = request.headers.get('origin') ?? '';
    // ... (keep existing CORS logic)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/wallet/:path*', '/merchant/:path*', '/admin/:path*', '/dashboard/:path*', '/api/:path*'],
};
```

2. **Verify `lib/auth-middleware.ts` exports `validateSession()`**: Check that this function correctly validates the JWT/session token set by `/api/auth`. If not, implement it.

3. **Create `/app/login/page.tsx`** (if it doesn't exist): Simple login page with "Connect Nostr Wallet" button that triggers the NIP-98 auth flow. Redirect to `from` param on success.

4. **Update `.env.example`** with `NEXTAUTH_SECRET` and any auth configuration variables needed.

5. **Optional (if time allows)**: Add Auth.js `[...nextauth]` route at `app/api/auth/[...nextauth]/route.ts` with the Nostr credentials provider wrapping existing NIP-98 logic, and email magic link as fallback. Use Prisma adapter for session persistence with the Auth.js tables added in task 073.

## Acceptance Criteria

- [ ] `/wallet` redirects unauthenticated users to `/login`
- [ ] `/merchant` redirects unauthenticated users to `/login`
- [ ] `/dashboard` redirects unauthenticated users to `/login`
- [ ] Authenticated users can access protected routes without redirect
- [ ] `validateSession()` correctly validates the arxmint_session cookie
- [ ] Login page exists with Nostr connect flow
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 6. The existing custom auth (lib/auth-middleware.ts + app/api/auth/route.ts) provides a solid foundation. This task focuses on USING that auth in middleware to actually protect routes — the most critical missing piece._
