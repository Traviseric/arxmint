# ADR-20260302-csp-unsafe-inline-transition

## Status
Accepted

## Context

The production audit flagged CSP as too permissive because enforced policy includes:

- `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`
- `style-src 'self' 'unsafe-inline'`

ArxMint currently runs Next.js 15 App Router with runtime behavior that still relies on inline script/style output in production pages.

## Decision

1. Keep current enforced CSP in production for compatibility now.
2. Add a strict CSP in `Content-Security-Policy-Report-Only` mode immediately to collect violations without breaking runtime.
3. Remove `unsafe-inline` from enforced policy only after nonce/hash migration is validated in staging.

## Timeline

- 2026-03-02: ADR accepted, strict report-only policy enabled.
- 2026-03-16: Review two weeks of CSP violation reports and finalize nonce/hash migration plan.
- 2026-04-13: Enforce tightened CSP on staging (`unsafe-inline` removed from enforced `script-src` and `style-src`).
- 2026-04-27: Promote tightened CSP to production if staging remains stable.

## Consequences

- Short-term residual risk remains due enforced `unsafe-inline`.
- Compatibility risk is reduced because migration is staged with report-only telemetry first.
- Audit item PE-013 remains open until the production enforcement cutover is complete.

## Follow-up

- Implement CSP report endpoint and retention policy.
- Add staging checklist entry: CSP regression test on `/`, `/dashboard`, `/community/[id]`, and API auth/payment flows.
- Update `docs/audits/production-engineering-audit-2026-03-02.md` PE-013 status after production cutover.
