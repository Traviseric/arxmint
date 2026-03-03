"use client";

// ============================================================
// ArxMint — Nostr Login Component
// ============================================================

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Copy, LogOut, Check, Zap } from "lucide-react";
import { useSovereignStore } from "@/lib/store";
import { hasNostrExtension, waitForExtension, connectNostr, createNip98AuthEvent } from "@/lib/nostr-auth";

export function NostrLogin() {
  const { nostrUser, nostrConnected, setNostrUser, clearNostrUser, setAuthenticated } =
    useSovereignStore();

  const [open, setOpen] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Return focus to trigger button when dropdown closes
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Focus first focusable element when dropdown opens
  useEffect(() => {
    if (!open) return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
  }, [open]);

  // Check for extension when login dropdown opens
  useEffect(() => {
    if (!open || nostrConnected) return;

    // Quick sync check first
    if (hasNostrExtension()) {
      setExtensionReady(true);
      return;
    }

    // Poll for late-injecting extensions
    setChecking(true);
    waitForExtension(2000).then((found) => {
      setExtensionReady(found);
      setChecking(false);
    });
  }, [open, nostrConnected]);

  // Focus trap: cycle focus within dropdown, close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const user = await connectNostr();
      setNostrUser(user);

      // Create NIP-98 signed event and verify with the server to establish a session
      const authUrl = `${window.location.origin}/api/auth`;
      const signedEvent = await createNip98AuthEvent(authUrl, "POST");
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey: user.pubkey, signedEvent }),
      });

      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json().catch(() => ({}));
        // Session creation failed — still keep the NIP-07 connection but warn
        console.warn("Session creation failed:", data.error);
      }

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    // Clear server-side session
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearNostrUser();
    setExtensionReady(false);
    setOpen(false);
  }

  async function handleCopy() {
    if (!nostrUser) return;
    await navigator.clipboard.writeText(nostrUser.npub);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Connected state — show npub badge
  if (nostrConnected && nostrUser) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-default hover:border-accent/50 transition-colors text-xs sm:text-sm"
        >
          {nostrUser.picture ? (
            <Image
              src={nostrUser.picture}
              alt={nostrUser.displayName}
              width={16}
              height={16}
              unoptimized
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <Zap className="w-3.5 h-3.5 text-accent" />
          )}
          <span className="text-text-primary font-mono truncate max-w-[120px]">
            {nostrUser.displayName}
          </span>
        </button>

        {open && (
          <div
            ref={panelRef}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="User account"
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border-default bg-bg-surface p-3 shadow-xl z-50"
          >
            {nostrUser.name && (
              <p className="text-sm font-semibold text-text-primary mb-1">{nostrUser.name}</p>
            )}
            <p className="text-xs text-text-secondary mb-1">Connected as</p>
            <p className="text-xs font-mono text-text-primary break-all mb-3">
              {nostrUser.npub}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border-default hover:border-accent/50 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy npub"}
              </button>

              <button
                onClick={handleDisconnect}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-red-900/50 hover:border-red-500/50 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state — login button
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default hover:border-accent/50 transition-colors text-xs sm:text-sm text-text-secondary hover:text-text-primary"
      >
        <Zap className="w-3.5 h-3.5" />
        Login
      </button>

      {open && (
        <div
          ref={panelRef}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="nostr-login-title"
          className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border-default bg-bg-surface p-4 shadow-xl z-50"
        >
          <p className="text-sm font-semibold text-text-primary mb-1" id="nostr-login-title">
            Nostr Login
          </p>
          <p className="text-xs text-text-secondary mb-3">
            Sign in with your NIP-07 browser extension. Your keys never leave
            the extension.
          </p>

          {error && (
            <p className="text-xs text-red-400 mb-3 p-2 rounded bg-red-950/30 border border-red-900/30">
              {error}
            </p>
          )}

          {checking ? (
            <p className="text-xs text-text-secondary animate-pulse">
              Detecting extension...
            </p>
          ) : extensionReady ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full antigravity-btn !py-2 !text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {connecting ? "Connecting..." : "Connect with Extension"}
            </button>
          ) : (
            <div>
              <p className="text-xs text-text-secondary mb-2">
                No NIP-07 extension detected. Install one to continue:
              </p>
              <div className="flex flex-col gap-1.5">
                <a
                  href="https://getalby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  Alby — Lightning + Nostr extension
                </a>
                <a
                  href="https://github.com/nickyoku/nos2x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  nos2x — Lightweight Nostr signer
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
