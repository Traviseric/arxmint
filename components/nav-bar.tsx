"use client";

// ============================================================
// ArxMint — Navigation Bar (Client Component)
// Extracted from layout.tsx to support Zustand-based Nostr login.
// ============================================================

import { useEffect } from "react";
import Image from "next/image";
import { NostrLogin } from "@/components/nostr-login";
import { hydrateNostrSession } from "@/lib/store";

export function NavBar() {
  // Hydrate Nostr session from localStorage on mount
  useEffect(() => {
    hydrateNostrSession();
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border-default glass-heavy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="ArxMint Logo"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg overflow-hidden"
          />
          <span className="text-lg font-bold text-text-primary">
            Arx<span className="text-accent">Mint</span>
          </span>
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/why"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
          >
            Why
          </a>
          <a
            href="/agents"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Agents
          </a>
          <a
            href="/roadmap"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Roadmap
          </a>
          <a
            href="/blog"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
          >
            Blog
          </a>
          <a
            href="/whitepaper"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
          >
            Whitepaper
          </a>
          <a
            href="https://github.com/Traviseric/arxmint"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="GitHub repository"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 sm:w-5 sm:h-5"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          <NostrLogin />

          <a
            href="/create"
            className="antigravity-btn !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-[10px] sm:!text-sm"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
