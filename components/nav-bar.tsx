"use client";

// ============================================================
// ArxMint — Navigation Bar (Client Component)
// Extracted from layout.tsx to support Zustand-based Nostr login.
// ============================================================

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { NostrLogin } from "@/components/nostr-login";
import { hydrateNostrSession } from "@/lib/store";

const LEARN_LINKS = [
  { href: "/agents", label: "Agents" },
  { href: "/blog", label: "Blog" },
  { href: "/whitepaper", label: "Whitepaper" },
];

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);

  // Check if current route uses the light merchant theme
  const isLightTheme =
    pathname?.startsWith("/merchants") ||
    pathname?.startsWith("/bazaar") ||
    pathname?.startsWith("/store") ||
    pathname?.startsWith("/pay");

  // Hydrate Nostr session from localStorage on mount
  useEffect(() => {
    hydrateNostrSession();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (learnRef.current && !learnRef.current.contains(e.target as Node)) {
        setLearnOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border-default glass-heavy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/images/nav-logo-transparent.svg"
            alt="ArxMint Logo"
            className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
          />
          <img
            src={isLightTheme ? "/images/wordmark-b.png?v=5" : "/images/wordmark-w.png?v=5"}
            alt="ArxMint"
            className="h-3.5 sm:h-4 w-auto shrink-0 mt-0.5"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-6">
          <Link
            href="/why"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block font-medium"
          >
            Why
          </Link>
          <Link
            href="/roadmap"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
          >
            Roadmap
          </Link>
          <Link
            href="/merchants"
            className="text-xs sm:text-sm text-accent hover:text-accent/80 transition-colors font-medium hidden sm:block"
          >
            Merchants
          </Link>
          <Link
            href="/bazaar"
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors font-medium hidden sm:block"
          >
            Bazaar
          </Link>

          {/* Learn dropdown — desktop */}
          <div ref={learnRef} className="relative hidden sm:block">
            <button
              onClick={() => setLearnOpen(!learnOpen)}
              className="flex items-center gap-1 text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Learn
              <ChevronDown className={`w-3 h-3 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
            </button>
            {learnOpen && (
              <div className="absolute top-full right-0 mt-2 w-44 py-2 rounded-lg border border-border-default glass-heavy shadow-xl">
                {LEARN_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setLearnOpen(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface/50 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            <a
              href="https://github.com/Traviseric/arxmint"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors shrink-0"
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

            <Link
              href="/create"
              className="antigravity-btn !px-2 !py-1 sm:!px-3 sm:!py-1.5 lg:!px-4 lg:!py-2 text-[9px] sm:text-[10px] lg:!text-sm shrink-0 whitespace-nowrap"
            >
              Get Started
            </Link>

            {/* Mobile hamburger trigger */}
            <button
              className="block sm:hidden p-2 -mr-2 rounded-lg hover:bg-bg-surface transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown — all items flat */}
      {mobileOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-sovereign-panel border-b border-white/10 z-50">
          <div className="flex flex-col p-4 gap-3">
            <Link
              href="/why"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-sovereign-muted hover:text-sovereign-text transition-colors font-medium"
            >
              Why
            </Link>
            <Link
              href="/roadmap"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-sovereign-muted hover:text-sovereign-text transition-colors"
            >
              Roadmap
            </Link>
            <Link
              href="/merchants"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Merchants
            </Link>
            <Link
              href="/bazaar"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-sovereign-muted hover:text-sovereign-text transition-colors font-medium"
            >
              Bazaar
            </Link>
            {LEARN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-sovereign-muted hover:text-sovereign-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
