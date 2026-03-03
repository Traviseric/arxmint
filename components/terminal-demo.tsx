"use client";

import { useEffect, useRef, useState } from "react";

/* ── Community flow (original) ── */
const COMMUNITY_PROMPT =
  'arxmint create "Private Bitcoin economy for 20 Longmont Bitcoiners — ecash payments, Lightning agents, cycle alerts"';

const COMMUNITY_OUTPUT = [
  "",
  "  Parsing community spec...",
  "",
  "  Community:    Longmont Bitcoin Collective",
  "  Members:      20 (invite-only)",
  "  Federation:   3-of-4 Fedimint guardians",
  "  Mint:         Cashu (0.2% fee → community fund)",
  "  Lightning:    LND + Aperture L402 proxy",
  "  Agents:       cycle-signals, privacy-audit",
  "  Privacy:      CoinJoin ON | Tor ON | 0 KYC",
  "",
  "  Generated: docker-compose.yml",
  "  Generated: aperture.yml",
  "  Generated: federation.json",
  "",
];

const COMMUNITY_DEPLOY_PROMPT = "docker compose up -d";
const COMMUNITY_DEPLOY_OUTPUT = [
  "",
  "  [+] Running 5/5",
  "  ✓ lnd         Started    0.8s",
  "  ✓ cashu-mint  Started    1.2s",
  "  ✓ guardian-1  Started    1.4s",
  "  ✓ guardian-2  Started    1.6s",
  "  ✓ aperture    Started    1.8s",
  "",
  "  Your sovereign economy is live.",
  "  Invite link: https://longmont.arxmint.local/join",
];

/* ── Merchant flow (new) ── */
const MERCHANT_PROMPT = "arxmint merchant init";

const MERCHANT_OUTPUT = [
  "",
  "  ┌─ ArxMint Merchant Setup ─────────────┐",
  "  │                                       │",
  "  │  Store name?  Longmont Coffee Co      │",
  "  │  Accept?      Lightning + Ecash       │",
  "  │  Domain?      pay.longmontcoffee.com  │",
  "  │                                       │",
  "  └───────────────────────────────────────┘",
  "",
  "  Generating merchant stack...",
  "",
  "  Node:       LND (autopilot + LSP liquidity)",
  "  Checkout:   Hosted page + embeddable widget",
  "  Payments:   Lightning Address + QR for POS",
  "  Webhooks:   POST → your-api/payments",
  "  Fees:       ~0% (network only)",
  "  HTTPS:      Auto via Let's Encrypt",
  "",
  "  Generated: docker-compose.yml",
  "  Generated: checkout-config.json",
  "",
];

const MERCHANT_DEPLOY_PROMPT = "docker compose up -d";
const MERCHANT_DEPLOY_OUTPUT = [
  "",
  "  [+] Running 3/3",
  "  ✓ lnd         Started    0.8s",
  "  ✓ cashu-mint  Started    1.2s",
  "  ✓ checkout    Started    1.4s",
  "",
  "  Your payment node is live.",
  "  Checkout: https://pay.longmontcoffee.com",
  "  Dashboard: https://pay.longmontcoffee.com/admin",
];

type Variant = "community" | "merchant";

interface TerminalDemoProps {
  variant?: Variant;
}

const FLOWS: Record<
  Variant,
  {
    prompt1: string;
    output1: string[];
    prompt2: string;
    output2: string[];
  }
> = {
  community: {
    prompt1: COMMUNITY_PROMPT,
    output1: COMMUNITY_OUTPUT,
    prompt2: COMMUNITY_DEPLOY_PROMPT,
    output2: COMMUNITY_DEPLOY_OUTPUT,
  },
  merchant: {
    prompt1: MERCHANT_PROMPT,
    output1: MERCHANT_OUTPUT,
    prompt2: MERCHANT_DEPLOY_PROMPT,
    output2: MERCHANT_DEPLOY_OUTPUT,
  },
};

export default function TerminalDemo({ variant = "community" }: TerminalDemoProps) {
  const flow = FLOWS[variant];
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "typing1" | "output1" | "typing2" | "output2" | "done"
  >("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setPhase("typing1");
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Typing phase 1
  useEffect(() => {
    if (phase !== "typing1") return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCurrentPrompt(flow.prompt1.slice(0, i));
      if (i >= flow.prompt1.length) {
        clearInterval(interval);
        setTimeout(() => {
          setVisibleLines(["$ " + flow.prompt1]);
          setCurrentPrompt("");
          setPhase("output1");
        }, 400);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [phase, flow.prompt1]);

  // Output phase 1
  useEffect(() => {
    if (phase !== "output1") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= flow.output1.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("typing2"), 600);
        return;
      }
      setVisibleLines((prev) => [...prev, flow.output1[i]]);
      i++;
    }, 80);
    return () => clearInterval(interval);
  }, [phase, flow.output1]);

  // Typing phase 2
  useEffect(() => {
    if (phase !== "typing2") return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCurrentPrompt(flow.prompt2.slice(0, i));
      if (i >= flow.prompt2.length) {
        clearInterval(interval);
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, "$ " + flow.prompt2]);
          setCurrentPrompt("");
          setPhase("output2");
        }, 400);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [phase, flow.prompt2]);

  // Output phase 2
  useEffect(() => {
    if (phase !== "output2") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= flow.output2.length) {
        clearInterval(interval);
        setPhase("done");
        return;
      }
      setVisibleLines((prev) => [...prev, flow.output2[i]]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [phase, flow.output2]);

  return (
    <div ref={containerRef} className="bg-bg-base border border-border-default rounded-xl font-mono overflow-hidden shadow-2xl glass-heavy">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default bg-bg-surface rounded-t-xl">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-text-secondary">arxmint-cli</span>
        <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      {/* Terminal body */}
      <div className="p-4 sm:p-6 min-h-[320px] max-h-[480px] overflow-y-auto text-xs sm:text-sm leading-relaxed">
        {visibleLines.filter((l): l is string => l != null).map((line, i) => (
          <div key={i} className={line.startsWith("$") ? "text-accent" : "text-text-primary"}>
            {line.includes("✓") ? (
              <span>
                <span className="text-green-400">{line.slice(0, line.indexOf("✓") + 1)}</span>
                <span className="text-text-primary">{line.slice(line.indexOf("✓") + 1)}</span>
              </span>
            ) : line.includes("Generated:") ? (
              <span className="text-accent">{line}</span>
            ) : line.includes("live.") || line.includes("Checkout:") || line.includes("Dashboard:") || line.includes("Invite link:") ? (
              <span className="text-green-400">{line}</span>
            ) : (
              line || "\u00A0"
            )}
          </div>
        ))}

        {/* Current typing line */}
        {(phase === "typing1" || phase === "typing2") && (
          <div className="text-accent">
            $ {currentPrompt}
            <span className="typing-cursor">_</span>
          </div>
        )}

        {/* Resting cursor */}
        {phase === "idle" && (
          <div className="text-accent">
            $ <span className="typing-cursor">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
