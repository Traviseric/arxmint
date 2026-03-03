"use client";

// ============================================================
// ArxMint — Login Page
// Nostr NIP-98 authentication flow
// ============================================================

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Zap, AlertCircle } from "lucide-react";
import { useSovereignStore } from "@/lib/store";
import { pubkeyToNpub, truncateNpub } from "@/lib/nostr-auth";
import { SeedRestore } from "@/components/seed-restore";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const { setAuthenticated, setNostrUser } = useSovereignStore();

  // Redirect if already authenticated (has valid session cookie)
  useEffect(() => {
    fetch("/api/agent")
      .then(() => {
        // If the agent route returns 200, we have a valid API session
        // (It's public, so this just confirms server is running)
      })
      .catch(() => {});
  }, []);

  const handleNostrConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Check for window.nostr (NIP-07 browser extension)
      const nostr = (window as unknown as { nostr?: { getPublicKey: () => Promise<string>; signEvent: (e: object) => Promise<object> } }).nostr;
      if (!nostr) {
        setError(
          "No Nostr extension found. Install Alby, nos2x, or another NIP-07 compatible extension."
        );
        setConnecting(false);
        return;
      }

      // Get the user's public key
      const pubkey = await nostr.getPublicKey();

      // Build a NIP-98 signed event for authentication
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
      const authUrl = `${baseUrl}/api/auth`;
      const now = Math.floor(Date.now() / 1000);

      const event = {
        kind: 27235,
        created_at: now,
        tags: [
          ["u", authUrl],
          ["method", "POST"],
        ],
        content: "",
        pubkey,
      };

      const signedEvent = await nostr.signEvent(event);

      // Send to auth endpoint
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey, signedEvent }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Authentication failed");
      }

      // Update Zustand store with properly-typed NostrUser
      const npub = pubkeyToNpub(pubkey);
      setNostrUser({ pubkey, npub, displayName: truncateNpub(npub), connectedAt: Date.now() });
      setAuthenticated(true);

      // Redirect to intended destination
      router.push(from);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-btc-orange/10 border border-btc-orange/20 mb-4">
            <Shield className="w-8 h-8 text-btc-orange" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-sovereign-white">ArxMint</h1>
          <p className="text-sovereign-muted text-sm mt-1">
            Sign in with your Nostr identity
          </p>
        </div>

        {/* Login Card */}
        <div className="sovereign-card !border-btc-orange/20">
          <h2 className="text-lg font-semibold text-sovereign-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-sm text-sovereign-muted mb-6">
            ArxMint uses your Nostr keypair for authentication. No passwords,
            no email — just a cryptographic signature.
          </p>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleNostrConnect}
            disabled={connecting}
            aria-busy={connecting}
            className="sovereign-btn w-full !py-3 text-base"
          >
            {connecting ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-sovereign-black/30 border-t-sovereign-black rounded-full animate-spin"
                  aria-hidden="true"
                />
                Connecting...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" aria-hidden="true" />
                Connect with Nostr
              </>
            )}
          </button>

          <div className="mt-6 space-y-3">
            <p className="text-xs text-sovereign-muted text-center">
              Requires a NIP-07 compatible browser extension:
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-sovereign-muted">
              <a
                href="https://getalby.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 rounded border border-sovereign-border hover:border-btc-orange/30 hover:text-btc-orange transition-colors"
              >
                Alby
              </a>
              <a
                href="https://github.com/fiatjaf/nos2x"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 rounded border border-sovereign-border hover:border-btc-orange/30 hover:text-btc-orange transition-colors"
              >
                nos2x
              </a>
              <a
                href="https://nsec.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 rounded border border-sovereign-border hover:border-btc-orange/30 hover:text-btc-orange transition-colors"
              >
                nsec.app
              </a>
            </div>
          </div>
        </div>

        {/* Seed restore panel */}
        {showRestore && (
          <div className="mt-4">
            <SeedRestore
              onRestored={() => {
                setShowRestore(false);
                router.push(from);
              }}
              onDismiss={() => setShowRestore(false)}
            />
          </div>
        )}

        {/* Links */}
        <div className="flex items-center justify-between mt-4 text-sm text-sovereign-muted">
          <Link href="/" className="text-btc-orange hover:underline">
            ← Back to home
          </Link>
          {!showRestore && (
            <button
              onClick={() => setShowRestore(true)}
              className="hover:text-btc-orange transition-colors"
            >
              Restore from seed phrase
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-btc-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
