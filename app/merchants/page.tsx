"use client";

// ============================================================
// ArxMint — Merchants Page
// Merchant directory + application form at bottom.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  ArrowDown,
  Globe,
  ExternalLink,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
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
  logoUrl: string | null;
  reason: string | null;
  featured: boolean;
  checkoutEnabled?: boolean;
  defaultAmountSats?: number | null;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantPublic[]>([]);
  const [count, setCount] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

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

  // Apply merchant light theme to body + nav so the entire page feels light
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div data-theme="merchant" className="relative overflow-x-hidden min-h-screen" style={{ background: '#fafafa', color: '#171717' }}>

      {/* Full-bleed light background to prevent dark body bleeding through */}
      <div className="fixed inset-0 z-0" style={{ background: '#fafafa' }} />

      {/* Background Ambience — warm orange glow */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-[#F7931A]/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[#F7931A]/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">

        {/* ── Hero with CTA ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Store className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Colorado Front Range
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
              Be the first city where{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                every merchant
              </span>
              <br />
              runs on Bitcoin.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
              Zero fees. Instant settlement. No middlemen. Join the merchants across
              Colorado building the first fully interconnected Bitcoin economy.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <button
              onClick={scrollToForm}
              className="antigravity-btn !px-8 !py-3 inline-flex items-center gap-2 text-sm"
            >
              Become a Merchant
              <ArrowDown className="w-4 h-4" />
            </button>
          </ScrollReveal>
        </section>

        {/* ── Merchant Directory ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">
                  Merchants
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {count > 0 ? (
                    <>
                      <span className="text-accent font-medium">{count}</span>{" "}
                      {count === 1 ? "business" : "businesses"} on the network
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
            <ScrollReveal delay={0.1}>
              <div className="bg-bg-elevated border border-border-default border-dashed rounded-xl p-16 text-center">
                <Store className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary mb-4">
                  No merchants yet. Be the first business on the network.
                </p>
                <button
                  onClick={scrollToForm}
                  className="antigravity-btn-outline !px-6 !py-2 inline-flex items-center gap-2 text-sm"
                >
                  Apply Now
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {merchants.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={`bg-bg-elevated border rounded-xl p-6 ${
                    m.featured
                      ? "border-accent/40 ring-1 ring-accent/10"
                      : "border-border-default"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Logo or category icon */}
                    {m.logoUrl ? (
                      <div className="w-14 h-14 rounded-lg bg-white border border-border-strong overflow-hidden shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.logoUrl}
                          alt={`${m.businessName} logo`}
                          width={56}
                          height={56}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-bg-surface border border-border-strong flex items-center justify-center text-2xl shrink-0">
                        {CATEGORY_ICONS[m.category ?? "other"] ?? "⚡"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-text-primary">
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
                        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                          &ldquo;{m.reason}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {m.website && (
                          <a
                            href={m.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            {m.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {m.checkoutEnabled && (
                          <Link
                            href={`/pay/${m.id}${m.defaultAmountSats ? `?amount=${m.defaultAmountSats}` : ""}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                          >
                            <Zap className="w-3 h-3" />
                            Pay
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── Application Form ── */}
        <section ref={formRef} className="border-t border-border-subtle py-20">
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-3 tracking-tight">
                  Apply to Join
                </h2>
                <p className="text-text-secondary max-w-md mx-auto">
                  Fill out the form below and we&apos;ll add your business to the
                  merchant directory. We&apos;ll reach out when the network goes live.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="bg-bg-elevated border border-border-default rounded-xl p-6 sm:p-8">
                <MerchantSignupForm onSuccess={loadMerchants} />
              </div>
            </ScrollReveal>
          </div>
        </section>

      </div>
    </div>
  );
}
