// ============================================================
// @arxmint/js — IdentityClient
// Typed client for the ArxMint Identity API.
//
// Agent-scope model:
//   identity:read  → resolve(), getAliases()
//   identity:write → link(), unlink(), createRoot()
//
// See docs/openapi/identity.yaml for the full OpenAPI 3.1 spec.
// ============================================================

import type {
  ArxMintConfig,
  IdentityAlias,
  IdentityLinkRequest,
  IdentityLinkResult,
  IdentityRoot,
  ResolvedIdentity,
} from "./types.js";

export class IdentityClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ArxMintConfig) {
    if (!config.apiKey) {
      throw new Error("IdentityClient: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://arxmint.com").replace(/\/$/, "");
  }

  /**
   * Link an external identity to an ArxMint user root.
   *
   * @agent-scope identity:write
   * @l402-scope  identity:write
   *
   * Idempotent: returns `{ created: false }` if the link already exists for
   * the same root. Returns an error if the externalId is linked to a *different* root.
   */
  async link(request: IdentityLinkRequest): Promise<IdentityLinkResult> {
    const res = await this.fetch("/api/identity/link", {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`ArxMint identity link error ${res.status}: ${text}`);
    }

    return res.json() as Promise<IdentityLinkResult>;
  }

  /**
   * Resolve an external identifier to a root identity and all its aliases.
   *
   * @agent-scope identity:read
   * @l402-scope  identity:read
   *
   * Pass `namespace` to narrow the search to a single auth method.
   */
  async resolve(externalId: string, namespace?: string): Promise<ResolvedIdentity | null> {
    const params = new URLSearchParams({ id: externalId });
    if (namespace) params.set("namespace", namespace);

    const res = await this.fetch(`/api/identity/resolve?${params}`, { method: "GET" });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`ArxMint identity resolve error ${res.status}: ${text}`);
    }

    const data = await res.json() as { ok: boolean } & ResolvedIdentity;
    return { rootId: data.rootId, aliases: data.aliases };
  }

  /**
   * Return all aliases for a known ArxMint User.id (root lookup).
   *
   * @agent-scope identity:read
   * @l402-scope  identity:read
   */
  async getAliases(rootId: string): Promise<IdentityAlias[] | null> {
    const params = new URLSearchParams({ rootId });
    const res = await this.fetch(`/api/identity/resolve?${params}`, { method: "GET" });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`ArxMint identity getAliases error ${res.status}: ${text}`);
    }

    const data = await res.json() as { ok: boolean } & ResolvedIdentity;
    return data.aliases;
  }

  /**
   * Remove an identity alias link.
   *
   * @agent-scope identity:write
   * @l402-scope  identity:write
   */
  async unlink(namespace: string, externalId: string): Promise<boolean> {
    const res = await this.fetch("/api/identity/unlink", {
      method: "DELETE",
      body: JSON.stringify({ namespace, externalId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`ArxMint identity unlink error ${res.status}: ${text}`);
    }

    return true;
  }

  /**
   * Create a minimal ArxMint identity root for use by ecosystem services.
   * Use the returned `id` as `rootId` in subsequent `link()` calls.
   *
   * @agent-scope identity:write
   * @l402-scope  identity:write
   *
   * Requires a live API key (`arx_live_*`) or `X-Marketplace-Secret` credentials.
   */
  async createRoot(
    linkedBy: string,
    metadata?: Record<string, unknown>
  ): Promise<IdentityRoot> {
    const res = await this.fetch("/api/identity/create-root", {
      method: "POST",
      body: JSON.stringify({ linkedBy, ...(metadata && { metadata }) }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`ArxMint identity createRoot error ${res.status}: ${text}`);
    }

    return res.json() as Promise<IdentityRoot>;
  }

  private fetch(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }
}
