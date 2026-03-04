"use client";

// ============================================================
// ArxMint — Merchants Page
// Sign up to join the Fort Collins Bitcoin payment network.
// Public directory of merchants + signup form.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Zap,
  Shield,
  ArrowRight,
  Globe,
  Users,
  CircleDollarSign,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";
import { MerchantSignupForm } from "@/components/merchant-signup-form";

const CATEGORY_ICONS: Record<string, string> = {
  "food-drink": "🍦",
  retail: "🛍️",
  services: "🛠️",
  health: "💚",
  entertainment: "🎵",
  technology: "💻",
  other: "⚡",
};

interface MerchantPublic {
  id: string;
  businessName: string;
  location: string | null;
  category: string | null;
  website: string | null;
  reason: string | null;
  featured: boolean;
}

const BENEFITS = [
  {
    icon: CircleDollarSign,
    title: "Zero Fees",
    desc: "No 2.9% + 30¢ per transaction. No monthly fees. No chargebacks. Keep what you earn.",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    desc: "Funds hit your wallet the moment a customer pays. No 2–7 day holds. No intermediaries.",
  },
  {
    icon: Shield,
    title: "Self-Custody",
    desc: "Your keys, your money. No platform can freeze your account or withhold your funds.",
  },
  {
    icon: Users,
    title: "AI Agent Ready",
    desc: "Your business is instantly discoverable and payable by AI agents — the next wave of commerce.",
  },
];

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantPublic[]>([]);
  const [count, setCount] = useState(0);

  const loadMerchants = useCallback(async () => {
    try {
      const res = await fetch("/api/pledge");
      if (res.ok) {
        const data = await res.json();
        setMerchants(data.pledges);
        setCount(data.count);
      }
    } catch {
      // Graceful degradation
    }
  }, []);

  useEffect(() => {
    loadMerchants();
  }, [loadMerchants]);

  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/50 via-bg-base/80 to-bg-base" />
      </div>

      <div className="relative z-10 w-full">

        {/* ── Hero ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Store className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Fort Collins Pilot
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
              The first city where{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                every merchant
              </span>
              <br />
              runs on Bitcoin.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-4">
              ArxMint is building an interconnected payment network in Fort Collins, CO —
              where local businesses and AI agents share the same private commerce infrastructure.
              Zero fees. Instant settlement. No middlemen.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <p className="text-sm text-text-muted max-w-xl mx-auto">
              Sign up below to join the network when it launches. Be part of the first
              fully interconnected Bitcoin economy in the country.
            </p>
          </ScrollReveal>
        </section>

        {/* ── Benefits Grid ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <StaggerItem key={b.title}>
                <div className="bg-bg-elevated border border-border-default rounded-xl p-5 h-full">
                  <b.icon className="w-5 h-5 text-accent mb-3" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">{b.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{b.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ── Signup + Merchant Directory ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

            {/* Left: Signup Form */}
            <div className="lg:col-span-2">
              <ScrollReveal>
                <div className="bg-bg-elevated border border-border-default rounded-xl p-6 sm:p-8 sticky top-24">
                  <h2 className="text-xl font-semibold text-text-primary mb-1">
                    Join the Network
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Sign up now — we&apos;ll onboard you when Fort Collins goes live.
                  </p>
                  <MerchantSignupForm onSuccess={loadMerchants} />
                </div>
              </ScrollReveal>
            </div>

            {/* Right: Merchant Directory */}
            <div className="lg:col-span-3">
              <ScrollReveal delay={0.1}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      Merchant Directory
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                      {count > 0 ? (
                        <>
                          <span className="text-accent font-medium">{count}</span>{" "}
                          {count === 1 ? "business" : "businesses"} signed up
                        </>
                      ) : (
                        "Be the first to join"
                      )}
                    </p>
                  </div>
                  {count > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span className="text-xs text-accent font-mono">Pre-Launch</span>
                    </div>
                  )}
                </div>
              </ScrollReveal>

              {count === 0 ? (
                <ScrollReveal delay={0.2}>
                  <div className="bg-bg-elevated border border-border-default border-dashed rounded-xl p-12 text-center">
                    <Store className="w-10 h-10 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary text-sm">
                      No merchants yet. Be the first Fort Collins business to join the network.
                    </p>
                  </div>
                </ScrollReveal>
              ) : (
                <div className="space-y-3">
                  {merchants.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className={`bg-bg-elevated border rounded-xl p-5 ${
                        m.featured
                          ? "border-accent/40 ring-1 ring-accent/10"
                          : "border-border-default"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-bg-surface border border-border-strong flex items-center justify-center text-xl shrink-0">
                          {CATEGORY_ICONS[m.category ?? "other"] ?? "⚡"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-text-primary">
                              {m.businessName}
                            </h3>
                            {m.featured && (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono uppercase tracking-wider">
                                Founding Merchant
                              </span>
                            )}
                          </div>
                          {m.location && (
                            <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {m.location}
                            </p>
                          )}
                          {m.reason && (
                            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                              &ldquo;{m.reason}&rdquo;
                            </p>
                          )}
                          {m.website && (
                            <a
                              href={m.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 mt-2 transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                              Visit website
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="border-t border-border-subtle py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4 tracking-tight">
                Fort Collins. Ground zero.
              </h2>
              <p className="text-text-secondary mb-8 max-w-lg mx-auto">
                Every merchant that joins makes the network more valuable for every other merchant.
                This is how Bitcoin adoption actually happens — one city, fully connected.
              </p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="antigravity-btn-outline !px-8 !py-3 inline-flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                Sign Up Your Business
                <ArrowRight className="w-4 h-4" />
              </a>
            </ScrollReveal>
          </div>
        </section>

      </div>
    </div>
  );
}
