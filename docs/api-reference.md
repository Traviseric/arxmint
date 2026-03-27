# ArxMint API Reference

> **Canonical location:** `docs/integration/api-reference.md`
>
> **Full OpenAPI specs:** `docs/openapi/` (machine-readable, for agent tool-calling)

This file is an index. Full API documentation lives at:

- **Integration guide:** [docs/integration/api-reference.md](integration/api-reference.md)
- **Identity OpenAPI spec:** [docs/openapi/identity.yaml](openapi/identity.yaml)
- **SDK reference:** [docs/integration/sdk-reference.md](integration/sdk-reference.md)
- **Auth guide:** [docs/integration/auth.md](integration/auth.md)
- **Webhooks:** [docs/integration/webhooks.md](integration/webhooks.md)

## Identity API Quick Reference

> Agent scopes: `identity:read` · `identity:write`

| Endpoint | Method | Scope |
|----------|--------|-------|
| `/api/identity/link` | POST | `identity:write` |
| `/api/identity/resolve` | GET | `identity:read` |
| `/api/identity/unlink` | DELETE | `identity:write` |
| `/api/identity/create-root` | POST | `identity:write` |

See [docs/openapi/identity.yaml](openapi/identity.yaml) for the full OpenAPI 3.1 spec
and [docs/integration/api-reference.md#identity](integration/api-reference.md) for
human-readable docs with examples.
