"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Shield,
  Cpu,
  Users,
  Zap,
  Lock,
  ArrowRight,
  Globe,
  Eye,
  Activity,
  Box,
  Github,
  ArrowDown,
  DollarSign,
  Ban,
  Radio
} from "lucide-react";
import TerminalDemo from "@/components/terminal-demo";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const [liveVolume, setLiveVolume] = useState(1284.45);
  const [activeNodes, setActiveNodes] = useState(312);

  // Auto-updating metric simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVolume(prev => prev + (Math.random() * 2.5));
      if (Math.random() > 0.7) {
        setActiveNodes(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      }
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // GSAP Scroll Arc Pattern
  useEffect(() => {
    if (!heroBgRef.current || !heroRef.current) return;

    // Smooth zoom out and blur on scroll
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
          alt="Cinematic abstract data node"
          fill
          className="object-cover opacity-[0.15] mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-bg-base/50 to-transparent opacity-90 z-10" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/10 blur-[150px] mix-blend-screen z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px] mix-blend-screen z-10" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03] z-10" />

        {/* Gradient Fade up */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-base via-bg-base/80 to-transparent z-10" />
      </div>

      <div className="relative z-10 w-full">

        {/* ===== SECTION 1: HERO OBSERVATORY ===== */}
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
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                  System Live — LND + Cashu + Fedimint
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-6">
                  Build the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                    Citadel.
                  </span>
                </h1>

                <p className="text-xl sm:text-2xl text-text-primary font-medium max-w-lg leading-relaxed drop-shadow-md">
                  Your Bitcoin economy, one prompt away.
                </p>
                <p className="text-text-secondary max-w-lg mt-4 leading-relaxed font-mono text-sm drop-shadow">
                  ArxMint generates private Fedimint federations, Cashu mints,
                  Lightning agent rails, and deploys them instantly. Humans and AI agents share the same sovereign infrastructure.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center gap-4 pt-4"
              >
                <a href="/create" className="antigravity-btn w-full sm:w-auto !py-4">
                  Initialize Environment
                  <ArrowRight className="w-4 h-4 ml-2 opacity-70" />
                </a>
                <a href="https://github.com/Traviseric/arxmint" target="_blank" rel="noopener noreferrer" className="antigravity-btn-outline w-full sm:w-auto !py-4 text-text-secondary">
                  <Github className="w-4 h-4 mr-2" />
                  View Source
                </a>
              </motion.div>

              {/* Telemetry Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-border-subtle"
              >
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">NETWORK_VAL</div>
                  <div className="text-xl font-mono text-text-primary">
                    ${liveVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">ACTIVE_NODES</div>
                  <div className="text-xl font-mono text-text-primary flex items-center gap-2">
                    {activeNodes} <ArrowDown className="w-3 h-3 text-red-400 rotate-180" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary font-mono mb-1">KYC_REQS</div>
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
              <TerminalDemo />
            </motion.div>

          </div>
        </section>

        {/* ===== SECTION 2: THE SPLIT (Problem) ===== */}
        <section className="relative w-full border-y border-border-subtle bg-bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">

            <div className="mb-20 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-semibold tracking-tight mb-6 text-text-primary">
                Wallets aren&apos;t economies.
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                Cold storage is step one, not the endgame. Without spending, earning, and trading in Bitcoin, there&apos;s no economy — just a savings account reliant on fiat rails.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              {/* Fiat Loop */}
              <div className="glass p-8 rounded-xl border border-red-500/10 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="flex items-center gap-3 text-red-400 font-mono text-sm tracking-wider uppercase mb-8">
                  <Ban className="w-4 h-4" /> The Fiat Trap
                </h3>

                <div className="space-y-6 text-sm text-text-secondary flex-grow">
                  <div className="flex gap-4 items-start">
                    <DollarSign className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                    <p>Earn in fiat from employer</p>
                  </div>
                  <div className="pl-2 border-l border-red-500/20 ml-2 h-6" />
                  <div className="flex gap-4 items-start">
                    <Activity className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                    <p>Spend at surveilled merchants</p>
                  </div>
                  <div className="pl-2 border-l border-red-500/20 ml-2 h-6" />
                  <div className="flex gap-4 items-start">
                    <Lock className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                    <p>KYC exchange → buy BTC → cold storage forever</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border-default font-mono text-xs text-text-muted">
                  STATUS: DEPENDENT ON LEGACY INFRASTRUCTURE
                </div>
              </div>

              {/* Sovereign Loop */}
              <div className="glass-heavy p-8 rounded-xl border border-border-strong relative overflow-hidden group glow-card">
                <div className="absolute top-0 right-0 p-4">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-mono">
                    <Radio className="w-3 h-3 animate-pulse" />
                    LIVE
                  </div>
                </div>

                <h3 className="flex items-center gap-3 text-accent font-mono text-sm tracking-wider uppercase mb-8">
                  <Zap className="w-4 h-4" /> The Sovereign Loop
                </h3>

                <div className="space-y-6 text-sm text-text-primary flex-grow">
                  <div className="flex gap-4 items-start">
                    <Users className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p>Earn sats from community work <span className="text-text-secondary font-light">— workshops, services, freelance gigs</span></p>
                  </div>
                  <div className="pl-2 border-l border-accent/30 ml-2 h-6 animate-[pulse_2s_ease-in-out_infinite]" />
                  <div className="flex gap-4 items-start">
                    <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p>Private ecash payments to local merchants <span className="text-text-secondary font-light">— they scan a QR, you pay in sats</span></p>
                  </div>
                  <div className="pl-2 border-l border-accent/30 ml-2 h-6 animate-[pulse_2s_ease-in-out_infinite_500ms]" />
                  <div className="flex gap-4 items-start">
                    <Cpu className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p>AI agents earn & spend via L402 parallel rails <span className="text-text-secondary font-light">— automated services that generate sats while you sleep</span></p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border-default font-mono text-xs text-accent/70">
                  STATUS: CIRCULAR ECONOMY ESTABLISHED
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHAT CHANGES DAY TO DAY ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight text-text-primary mb-4">
              What changes day to day.
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              One week living on Bitcoin rails. No exchanges. No banks. No fiat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { day: "MON", label: "Get paid 50,000 sats for a workshop you taught", icon: DollarSign },
              { day: "TUE", label: "Coffee costs 3,500 sats — scan the QR, done", icon: Zap },
              { day: "WED", label: "Check the cycle dashboard — MVRV says keep stacking", icon: Activity },
              { day: "THU", label: "Your agent earned 23,500 sats overnight selling data", icon: Cpu },
              { day: "FRI", label: "Pay your barber in ecash — the loop closes", icon: Users },
            ].map((item) => (
              <div key={item.day} className="glass rounded-xl p-6 glow-card border-accent/5 text-center flex flex-col items-center">
                <item.icon className="w-5 h-5 text-accent mb-3" />
                <span className="text-xs font-mono text-accent tracking-widest mb-3">{item.day}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-black/40 border-l-2 border-accent p-4 font-mono text-sm text-accent/80">
            FIAT_DEPENDENCY_THIS_WEEK: <span className="text-green-400 font-semibold">ZERO</span>
          </div>
        </section>

        {/* ===== YOU ALREADY HAVE THE HARD PART ===== */}
        <section className="border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                  You already have the hard part.
                </h2>
                <div className="space-y-6 text-text-secondary text-lg leading-relaxed font-light">
                  <p>
                    If you own Bitcoin in cold storage, you&apos;ve already done the hardest thing — acquiring sound money and taking self-custody. Most people never get that far.
                  </p>
                  <p>
                    The next step isn&apos;t selling it back to fiat. It&apos;s building the infrastructure that lets you <span className="text-text-primary font-medium">spend a fraction locally</span> while your savings stay cold. That&apos;s what a circular economy is — a spending layer on top of your savings.
                  </p>
                </div>
              </div>

              <div className="glass-heavy border border-border-default rounded-xl p-6 sm:p-8 relative overflow-hidden glow-card">
                <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                <h3 className="text-sm font-mono tracking-widest text-accent uppercase mb-8 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> From cold storage to spending
                </h3>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Cold storage stays cold</p>
                      <p className="text-xs text-text-secondary mt-1">Your hardware wallet, your keys, untouched</p>
                    </div>
                  </div>
                  <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                  <div className="flex gap-4 items-start">
                    <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Peg in spending sats</p>
                      <p className="text-xs text-text-secondary mt-1">Move a small amount into the federation — like cash from a safe</p>
                    </div>
                  </div>
                  <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                  <div className="flex gap-4 items-start">
                    <Eye className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Sats become ecash</p>
                      <p className="text-xs text-text-secondary mt-1">Private, instant, untraceable tokens inside your community</p>
                    </div>
                  </div>
                  <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                  <div className="flex gap-4 items-start">
                    <Users className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Spend locally</p>
                      <p className="text-xs text-text-secondary mt-1">Coffee, haircuts, workshops — sats circulate, economy grows</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: THREE PILLARS (GLOW CARDS) ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-semibold tracking-tight text-text-primary mb-4">
              The Sovereign Bridge.
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Not another wallet. A private money rail where humans and AI agents share the same infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Humans */}
            <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card group relative overflow-hidden">
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

            {/* AI Agents */}
            <div className="bg-bg-elevated border border-accent/20 rounded-xl p-8 glow-card group relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl transition-colors" />

              <div className="w-12 h-12 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center mb-8">
                <Cpu className="w-5 h-5 text-accent" />
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

            {/* Communities */}
            <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card group relative overflow-hidden">
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
                  Docker one-command deploy
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-accent" />
                  0.2% mint fee community income
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: ASYMMETRIC GRID (FEATURES) ===== */}
        <section className="border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <h2 className="text-3xl font-semibold text-text-primary mb-20 text-center">
              Infrastructure batteries included.
            </h2>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Large Feature Card (Col 7) */}
              <div className="lg:col-span-7 glass border border-border-default rounded-2xl p-8 lg:p-12 relative overflow-hidden glow-card group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-accent/10 transition-all duration-700" />
                <Eye className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-2xl font-semibold text-text-primary mb-4">Privacy by Default</h3>
                <p className="text-text-secondary leading-relaxed mb-8 max-w-md">
                  We don't just offer privacy as an option. CoinJoin, Tor routing, and silent payments are hardcoded defaults at the protocol level.
                </p>
                <div className="bg-bg-base/80 border border-border-strong rounded-lg p-6 font-mono text-xs">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-text-muted">ROUTING</span>
                    <span className="text-green-400 font-semibold">[TOR ACTIVE]</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">OBFUSCATION</span>
                    <span className="text-accent font-semibold">[COINJOIN: 50+]</span>
                  </div>
                </div>
              </div>

              {/* Stacked Small Cards (Col 5) */}
              <div className="lg:col-span-5 flex flex-col gap-8">

                <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                  <Activity className="w-6 h-6 text-text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Cycle Architecture</h3>
                  <p className="text-text-secondary text-sm">
                    Live MVRV, NUPL, and supply-in-profit alerts built into the operator dashboard.
                  </p>
                </div>

                <div className="glass border border-border-default rounded-2xl p-8 flex-1 glow-card flex flex-col justify-center">
                  <Box className="w-6 h-6 text-text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Containerized Deploy</h3>
                  <p className="text-text-secondary text-sm">
                    LND, Cashu, Fedimint, and Aperture. Spun up with a single Docker composition.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 5: CTA FOCUS ===== */}
        <section className="relative py-32 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base to-bg-surface z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-[100%] z-0" />

          <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6 tracking-tight">
              The parallel system is being built.
            </h2>
            <p className="text-text-secondary text-lg mb-12">
              Sound money infrastructure for a parallel voluntary economy. Protection from hacks, overreach, and controls. Not evasion — sovereignty.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/create" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto">
                Deploy Economy
              </a>
              <a
                href="https://github.com/Traviseric/arxmint"
                target="_blank"
                rel="noopener noreferrer"
                className="antigravity-btn-outline !px-10 !py-4 text-lg w-full sm:w-auto text-text-secondary"
              >
                <Github className="w-5 h-5 mr-3" />
                Audit Code
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
