"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Shield,
  Cpu,
  Users,
  Zap,
  ArrowRight,
  Globe,
  Eye,
  Activity,
  Box,
  Github,
  Store,
  ExternalLink,
  CheckCircle,
  XCircle,
  MessageSquare,
  Terminal,
  QrCode,
  Wallet,
  Code,
  Server,
  BookOpen,
} from "lucide-react";
import TerminalDemo from "@/components/terminal-demo";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Stripe vs ArxMint comparison data ── */
const COMPARISON_ROWS = [
  { feature: "Transaction Fees", stripe: "2.9% + 30¢", arxmint: "~0% (network only)" },
  { feature: "Settlement", stripe: "2–7 business days", arxmint: "Instant — direct to your wallet" },
  { feature: "Chargebacks", stripe: "Yes — merchant liable", arxmint: "Impossible — payments are final" },
  { feature: "KYC Required", stripe: "Full identity verification", arxmint: "Zero" },
  { feature: "Custody", stripe: "Stripe holds your funds", arxmint: "Self-custody — your keys, your node" },
  { feature: "Censorship", stripe: "Account freezes possible", arxmint: "Uncensorable — you run the infra" },
  { feature: "Privacy", stripe: "Stripe sees all transaction data", arxmint: "Ecash blinding — zero visibility" },
];

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);

  // GSAP Scroll Arc Pattern
  useEffect(() => {
    if (!heroBgRef.current || !heroRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.to(heroBgRef.current, {
      scale: 1,
      filter: "blur(12px)",
      opacity: 0.6,
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div
        ref={heroBgRef}
        className="fixed top-0 left-0 w-full h-[120vh] z-0 pointer-events-none origin-top overflow-hidden bg-bg-base"
        style={{ transform: "scale(1.1)" }}
      >
        <Image
          src="/images/hero_ambience.png"
          alt=""
          role="presentation"
          fill
          className="object-cover opacity-[0.15] mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-bg-base/50 to-transparent opacity-90 z-10" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/10 blur-[150px] mix-blend-screen z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px] mix-blend-screen z-10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03] z-10" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-base via-bg-base/80 to-transparent z-10" />
      </div>

      <div className="relative z-10 w-full">

        {/* ===== SECTION 1: HERO — MERCHANT-FIRST ===== */}
        <section ref={heroRef} className="relative min-h-[90vh] flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left: Copy & Actions */}
            <div className="lg:col-span-6 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                  Open Source — MIT Licensed — Self-Hosted
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-6">
                  Accept Bitcoin<br />Payments.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                    Zero Fees.
                  </span>
                </h1>

                <p className="text-xl sm:text-2xl text-text-primary font-medium max-w-lg leading-relaxed drop-shadow-md">
                  No middleman. No chargebacks. Instant settlement.
                </p>
                <p className="text-text-secondary max-w-lg mt-4 leading-relaxed font-mono text-sm drop-shadow">
                  Self-hosted Bitcoin payment infrastructure. Near-zero transaction fees, instant settlement, no chargebacks. The open-source Stripe alternative.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center gap-4 pt-4"
              >
                <a href="/create" className="antigravity-btn w-full sm:w-auto !py-4">
                  Start Accepting Bitcoin
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70" aria-hidden="true" />
                </a>
                <a href="#how-it-works" className="antigravity-btn-outline w-full sm:w-auto !py-4 text-text-secondary">
                  See How It Works
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70" aria-hidden="true" />
                </a>
              </motion.div>

              {/* Stats Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-border-subtle"
              >
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">TRANSACTION_FEE</div>
                  <div className="text-xl font-mono text-green-400 font-semibold">~0%</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">SETTLEMENT</div>
                  <div className="text-xl font-mono text-green-400 font-semibold">INSTANT</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">KYC_REQUIRED</div>
                  <div className="text-xl font-mono text-green-400 font-semibold">ZERO</div>
                </div>
              </motion.div>
            </div>

            {/* Right: Terminal Feed */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative z-10"
            >
              <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
              <TerminalDemo variant="merchant" />
            </motion.div>

          </div>
        </section>

        {/* ===== SECTION 2: STRIPE COMPARISON TABLE ===== */}
        <section className="relative w-full border-y border-border-subtle bg-bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">

            <ScrollReveal className="mb-16 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-semibold tracking-tight mb-4 text-text-primary">
                Why Merchants Switch
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                Side-by-side: legacy payment processing vs. self-hosted Bitcoin infrastructure.
              </p>
            </ScrollReveal>

            {/* Desktop Table */}
            <ScrollReveal className="hidden md:block">
              <div className="glass-heavy border border-border-default rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="text-left px-4 py-3 font-mono text-xs text-text-muted uppercase tracking-wider w-1/3">Feature</th>
                      <th className="text-left px-4 py-3 font-mono text-xs text-text-muted uppercase tracking-wider w-1/3">Stripe</th>
                      <th className="text-left px-4 py-3 font-mono text-xs text-accent uppercase tracking-wider w-1/3">ArxMint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.feature} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition-colors">
                        <td className="px-4 py-2.5 text-text-primary font-medium">{row.feature}</td>
                        <td className="px-4 py-2.5 text-text-muted">
                          <span className="flex items-center gap-2">
                            <XCircle className="w-3.5 h-3.5 text-red-500/60 shrink-0" />
                            {row.stripe}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-green-400 font-medium">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            {row.arxmint}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {COMPARISON_ROWS.map((row) => (
                <ScrollReveal key={row.feature}>
                  <div className="glass border border-border-default rounded-lg p-4">
                    <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">{row.feature}</div>
                    <div className="flex items-start gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500/60 shrink-0 mt-0.5" />
                      <span className="text-sm text-text-muted">{row.stripe}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-green-400 font-medium">{row.arxmint}</span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Savings Callout */}
            <ScrollReveal className="mt-8">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 text-center">
                <p className="font-mono text-sm text-accent">
                  A <span className="font-semibold text-lg">$10K/month</span> merchant saves{" "}
                  <span className="font-semibold text-lg text-green-400">~$320/month</span> in fees alone.
                </p>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* ===== SECTION 3: HOW IT WORKS ===== */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight text-text-primary mb-4">
              Live in 15 Minutes
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Three steps from zero to accepting Bitcoin payments. No DevOps required.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.15}>
            {/* Step 1 */}
            <StaggerItem>
              <div className="glass-heavy border border-border-default rounded-xl p-8 glow-card h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono font-bold text-sm">1</div>
                  <MessageSquare className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">Answer Three Questions</h3>
                <p className="text-text-secondary text-sm leading-relaxed flex-grow">
                  Store name, payment methods (Lightning + Ecash), and your domain. The wizard handles everything else.
                </p>
                <div className="mt-6 bg-bg-base/80 border border-border-strong rounded-lg p-4 font-mono text-xs text-text-muted">
                  <div>Store?&nbsp;&nbsp;<span className="text-accent">Longmont Coffee Co</span></div>
                  <div>Accept?&nbsp;<span className="text-accent">Lightning + Ecash</span></div>
                  <div>Domain?&nbsp;<span className="text-accent">pay.longmontcoffee.com</span></div>
                </div>
              </div>
            </StaggerItem>

            {/* Step 2 */}
            <StaggerItem>
              <div className="glass-heavy border border-border-default rounded-xl p-8 glow-card h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono font-bold text-sm">2</div>
                  <Terminal className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">One Command Deploys</h3>
                <p className="text-text-secondary text-sm leading-relaxed flex-grow">
                  LND node, Cashu mint, hosted checkout page, auto-HTTPS, and LSP liquidity — all from a single Docker command.
                </p>
                <div className="mt-6 bg-bg-base/80 border border-border-strong rounded-lg p-4 font-mono text-xs">
                  <span className="text-accent">$</span> <span className="text-text-primary">docker compose up -d</span>
                  <div className="text-green-400 mt-2">✓ lnd ✓ cashu-mint ✓ checkout</div>
                </div>
              </div>
            </StaggerItem>

            {/* Step 3 */}
            <StaggerItem>
              <div className="glass-heavy border border-border-default rounded-xl p-8 glow-card h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono font-bold text-sm">3</div>
                  <QrCode className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">Customers Pay, You Receive</h3>
                <p className="text-text-secondary text-sm leading-relaxed flex-grow">
                  Customer scans a QR code, sats land in your wallet instantly, webhook fires to your backend. No intermediary.
                </p>
                <div className="mt-6 bg-bg-base/80 border border-border-strong rounded-lg p-4 font-mono text-xs text-text-muted">
                  <div><span className="text-green-400">PAID</span> 45,000 sats</div>
                  <div className="text-text-muted">→ webhook: POST /api/payments</div>
                  <div className="text-text-muted">→ status: <span className="text-green-400">confirmed</span></div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* ===== SECTION 4: TRUST SIGNALS ===== */}
        <section className="border-y border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary mb-2">
                Built on Proven Infrastructure
              </h2>
            </ScrollReveal>

            <ScrollReveal>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-12">
                {[
                  { name: "Fedimint", icon: Shield },
                  { name: "Cashu", icon: Eye },
                  { name: "Lightning Labs", icon: Zap },
                  { name: "Docker", icon: Box },
                ].map((tech) => (
                  <div key={tech.name} className="flex items-center gap-2 px-4 py-2 glass border border-border-default rounded-lg">
                    <tech.icon className="w-4 h-4 text-accent" />
                    <span className="text-sm font-mono text-text-secondary">{tech.name}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto" staggerDelay={0.1}>
              {[
                { label: "MIT Licensed", sublabel: "Fully open source" },
                { label: "Self-Hosted", sublabel: "Your server, your keys" },
                { label: "Longmont Pilot", sublabel: "Real-world deployment" },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="text-center">
                    <div className="text-xl font-mono text-accent font-semibold">{stat.label}</div>
                    <div className="text-xs text-text-muted font-mono mt-1">{stat.sublabel}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ===== SECTION 5: AUDIENCE SEGMENTS ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <ScrollReveal className="text-center mb-20">
            <h2 className="text-4xl font-semibold tracking-tight text-text-primary mb-4">
              One Infrastructure. Four Audiences.
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Not another wallet. Private payment rails where merchants, humans, and AI agents share the same infrastructure.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
            {/* Merchants (accent) */}
            <StaggerItem>
              <div className="bg-bg-elevated border border-accent/20 rounded-xl p-8 glow-card group relative overflow-hidden h-full">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl transition-colors" />
                <div className="w-12 h-12 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center mb-8">
                  <Store className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">For Merchants</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Accept Bitcoin payments with near-zero fees. Self-hosted, non-custodial — you run the node, you keep 100%. Three-question wizard, live in under 15 minutes.
                </p>
                <ul className="space-y-3 font-mono text-xs text-text-muted">
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    ~0% fees vs Stripe 2.9%
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Self-hosted checkout on your domain
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Lightning Address + QR for POS
                  </li>
                </ul>
              </div>
            </StaggerItem>

            {/* Communities */}
            <StaggerItem>
              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card group relative overflow-hidden h-full">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
                <div className="w-12 h-12 rounded-md bg-bg-surface border border-border-strong flex items-center justify-center mb-8">
                  <Globe className="w-5 h-5 text-text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">For Communities</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Spin a full private economy for your town. One-click Fedimint federation with merchant directory.
                </p>
                <ul className="space-y-3 font-mono text-xs text-text-muted">
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Prompt-driven creation
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Three-question wizard deploy
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    0.2% mint fee community income
                  </li>
                </ul>
              </div>
            </StaggerItem>

            {/* AI Agents */}
            <StaggerItem>
              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card group relative overflow-hidden h-full">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
                <div className="w-12 h-12 rounded-md bg-bg-surface border border-border-strong flex items-center justify-center mb-8">
                  <Cpu className="w-5 h-5 text-text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">For AI Agents</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Native Lightning rails via MCP. Agents sell data, buy compute, and transact in sats — no identity, no banks.
                </p>
                <ul className="space-y-3 font-mono text-xs text-text-muted">
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Lightning Agent Kit
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    L402 paywalls (pay-per-request)
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    MCP server framework
                  </li>
                </ul>
              </div>
            </StaggerItem>

            {/* Humans */}
            <StaggerItem>
              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card group relative overflow-hidden h-full">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
                <div className="w-12 h-12 rounded-md bg-bg-surface border border-border-strong flex items-center justify-center mb-8">
                  <Shield className="w-5 h-5 text-text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">For Humans</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">
                  Self-custody ecash backed by real BTC. Private transactions inside your community. No surveillance, no KYC, no banks.
                </p>
                <ul className="space-y-3 font-mono text-xs text-text-muted">
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Silent Payments + CoinJoin
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Federated e-cash privacy
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    Local merchant directory
                  </li>
                </ul>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* ===== SECTION 6: CIRCULAR ECONOMY STORY ===== */}
        <section className="border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

              {/* Left: Narrative */}
              <ScrollReveal>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                    Beyond Payments
                  </h2>
                  <div className="space-y-6 text-text-secondary text-lg leading-relaxed font-light">
                    <p>
                      Wallets aren&apos;t economies. Cold storage is step one, not the endgame. Without spending, earning, and trading in Bitcoin, there&apos;s no economy — just a savings account reliant on fiat rails.
                    </p>
                    <p>
                      ArxMint lets you build the next step: a spending layer on top of your savings. Move a fraction of your sats into a federation, pay local merchants in ecash, check cycle dashboards before stacking — while AI agents earn sats overnight selling data via L402 paywalls.
                    </p>
                    <p className="text-text-primary font-medium">
                      Monday you get paid in sats. Tuesday you buy coffee. Friday you pay the barber in ecash. The loop closes.
                    </p>
                  </div>
                  <div className="mt-8">
                    <a href="/create" className="antigravity-btn-outline !py-3 inline-flex items-center gap-2">
                      Create a Community Economy
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right: Sovereign Loop Card */}
              <ScrollReveal delay={0.1}>
                <div className="glass-heavy border border-border-default rounded-xl p-6 sm:p-8 relative overflow-hidden glow-card">
                  <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                  <h3 className="text-sm font-mono tracking-widest text-accent uppercase mb-8 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> The Sovereign Loop
                  </h3>
                  <div className="space-y-6">
                    {[
                      { icon: Shield, title: "Cold storage stays cold", desc: "Your hardware wallet, your keys, untouched" },
                      { icon: Zap, title: "Peg in spending sats", desc: "Move a small amount into the federation — like cash from a safe" },
                      { icon: Eye, title: "Sats become ecash", desc: "Private, instant, untraceable tokens inside your community" },
                      { icon: Users, title: "Spend locally", desc: "Coffee, haircuts, workshops — sats circulate, economy grows" },
                    ].map((step, i) => (
                      <div key={step.title}>
                        <div className="flex gap-4 items-start">
                          <step.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-text-primary font-medium">{step.title}</p>
                            <p className="text-xs text-text-secondary mt-1">{step.desc}</p>
                          </div>
                        </div>
                        {i < 3 && <div className="pl-2 border-l border-accent/30 ml-2 h-4 mt-2" />}
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-border-default font-mono text-xs text-accent/70">
                    STATUS: CIRCULAR ECONOMY ESTABLISHED
                  </div>
                </div>
              </ScrollReveal>

            </div>
          </div>
        </section>

        {/* ===== SECTION 7: AGENT COMMERCE ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight text-text-primary mb-4">
              Native Payment Rails for AI Agents
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Agents buy and sell via Lightning. No identity. No API keys from a bank. Just sats.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Large L402 code block card */}
            <ScrollReveal className="lg:col-span-7">
              <div className="glass border border-border-default rounded-2xl p-8 lg:p-10 relative overflow-hidden glow-card group h-full">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-accent/10 transition-all duration-700" />
                <Code className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-2xl font-semibold text-text-primary mb-4">L402 Protocol Flow</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-md">
                  HTTP 402 Payment Required — the missing status code. Agents pay Lightning invoices to access any API endpoint. No accounts, no OAuth — just cryptographic proof of payment.
                </p>
                <div className="bg-bg-base/80 border border-border-strong rounded-lg p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                  <div className="text-text-muted">{"// Agent requests paid endpoint"}</div>
                  <div><span className="text-accent">GET</span> <span className="text-text-primary">/api/data/weather</span></div>
                  <div className="text-text-muted mt-2">{"// Server returns 402 + invoice"}</div>
                  <div><span className="text-red-400">402</span> <span className="text-text-primary">Payment Required</span></div>
                  <div className="text-text-muted">WWW-Authenticate: L402 macaroon=&quot;...&quot;, invoice=&quot;lnbc...&quot;</div>
                  <div className="text-text-muted mt-2">{"// Agent pays invoice → gets preimage"}</div>
                  <div><span className="text-green-400">{"// Retries with proof of payment"}</span></div>
                  <div><span className="text-accent">GET</span> <span className="text-text-primary">/api/data/weather</span></div>
                  <div className="text-text-muted">Authorization: L402 &lt;macaroon&gt;:&lt;preimage&gt;</div>
                  <div className="mt-2"><span className="text-green-400">200</span> <span className="text-text-primary">{"{ data: { ... } }"}</span></div>
                </div>
              </div>
            </ScrollReveal>

            {/* Two small feature cards */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <ScrollReveal delay={0.1}>
                <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                  <Server className="w-6 h-6 text-text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Lightning MCP Server</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Model Context Protocol server for Lightning. Any AI framework — Claude, GPT, local models — can send and receive sats natively.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                  <Wallet className="w-6 h-6 text-text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Ephemeral Agent Wallets</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Agents spin up disposable Cashu wallets for each task. Earned ecash flows back to the federation. No persistent identity needed.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== SECTION 8: INFRASTRUCTURE FEATURES ===== */}
        <section className="border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <ScrollReveal className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-text-primary">
                Batteries Included
              </h2>
            </ScrollReveal>

            <StaggerContainer className="grid lg:grid-cols-12 gap-8" staggerDelay={0.1}>
              {/* Large Feature Card */}
              <StaggerItem className="lg:col-span-7">
                <div className="glass border border-border-default rounded-2xl p-8 lg:p-12 relative overflow-hidden glow-card group h-full">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-accent/10 transition-all duration-700" />
                  <Eye className="w-8 h-8 text-accent mb-6" />
                  <h3 className="text-2xl font-semibold text-text-primary mb-4">Privacy by Default</h3>
                  <p className="text-text-secondary leading-relaxed mb-8 max-w-md">
                    We don&apos;t just offer privacy as an option. Ecash blinding, silent payment addresses, and spend-path routing are built in from day one.
                  </p>
                  <div className="bg-bg-base/80 border border-border-strong rounded-lg p-6 font-mono text-xs">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-text-muted">PRIVACY</span>
                      <span className="text-green-400 font-semibold">[ECASH: BLINDED]</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">ROUTING</span>
                      <span className="text-accent font-semibold">[SILENT PAYMENTS: ON]</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* Stacked Small Cards */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <StaggerItem>
                  <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                    <Activity className="w-6 h-6 text-text-primary mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">Cycle Intelligence</h3>
                    <p className="text-text-secondary text-sm">
                      MVRV, NUPL, and supply-in-profit alerts built into the operator dashboard (price-based approximations via CoinGecko).
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                    <Box className="w-6 h-6 text-text-primary mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">One-Wizard Deploy</h3>
                    <p className="text-text-secondary text-sm">
                      Three questions. Managed DNS. Auto-HTTPS. LSP liquidity. Your merchant node or community stack — live in under 15 minutes.
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </div>
        </section>

        {/* ===== SECTION 9: CTA — BUILD THE CITADEL ===== */}
        <section className="relative py-24 sm:py-32 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base to-bg-surface z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-[100%] z-0" />

          <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
            <ScrollReveal>
              <h2 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6 tracking-tight">
                Build the{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                  Citadel.
                </span>
              </h2>
              <p className="text-text-secondary text-lg mb-12">
                Sound money infrastructure for a parallel voluntary economy. Self-hosted. Non-custodial. Unstoppable.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <a href="/create" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto">
                  Start Accepting Bitcoin
                </a>
                <a
                  href="/roadmap"
                  className="antigravity-btn-outline !px-8 !py-4 w-full sm:w-auto text-text-secondary inline-flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Read the Roadmap
                </a>
                <a
                  href="https://github.com/Traviseric/arxmint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="antigravity-btn-outline !px-8 !py-4 w-full sm:w-auto text-text-secondary inline-flex items-center justify-center gap-2"
                  aria-label="View Source on GitHub (opens in new window)"
                >
                  <Github className="w-4 h-4" />
                  View Source
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-xs font-mono text-text-muted">
                Piloting in Longmont, CO. Grant-eligible: OpenSats, HRF, FBCE.
              </p>
            </ScrollReveal>
          </div>
        </section>

      </div>
    </div>
  );
}
