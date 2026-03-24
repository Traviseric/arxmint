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
  BadgeCheck,
  Map,
  ChevronDown,
  Search,
  X,
  Share2,
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

const CATEGORY_LABELS: Record<string, string> = {
  "food-drink": "Food & Drink",
  retail: "Retail",
  services: "Services",
  health: "Health",
  entertainment: "Entertainment",
  technology: "Technology",
  other: "Other",
};

function deriveReferralCode(id: string): string {
  return id.replace(/^seed-/, "").slice(0, 8).toUpperCase().replace(/-/g, "");
}

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
  pipeline?: boolean;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantPublic[]>([]);
  const [count, setCount] = useState(0);
  const [showBtcMapTips, setShowBtcMapTips] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const loadMerchants = useCallback(async () => {
    try {
      // Session cookie sent automatically — admin sees pipeline merchants
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

  // Derived unique cities for city filter
  const uniqueCities = Array.from(
    new Set(
      merchants
        .filter((m) => !m.pipeline && m.location)
        .map((m) => m.location as string)
    )
  ).sort();

  // Derived unique categories present in the list
  const uniqueCategories = Array.from(
    new Set(merchants.filter((m) => !m.pipeline && m.category).map((m) => m.category as string))
  ).sort();

  // Client-side filtered merchants (pipeline merchants always shown to admin, not filtered)
  const liveMerchants = merchants.filter((m) => !m.pipeline);
  const pipelineMerchants = merchants.filter((m) => m.pipeline);

  const filteredLive = liveMerchants.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        m.businessName.toLowerCase().includes(q) ||
        (m.location?.toLowerCase().includes(q) ?? false) ||
        (m.reason?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (cityFilter && m.location !== cityFilter) return false;
    return true;
  });

  const filteredMerchants = [...filteredLive, ...pipelineMerchants];
  const hasFilters = searchQuery || categoryFilter || cityFilter;

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

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
            <div className="flex items-center justify-between mb-6">
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

          {/* ── Search & Filter Controls ── */}
          {count > 0 && (
            <ScrollReveal delay={0.05}>
              <div className="mb-6 space-y-3">
                {/* Text search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search merchants by name, city, or description…"
                    className="sovereign-input w-full pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category pills + city dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        categoryFilter === cat
                          ? "bg-accent text-white border-accent"
                          : "bg-bg-elevated border-border-default text-text-secondary hover:border-accent/50"
                      }`}
                    >
                      <span>{CATEGORY_ICONS[cat] ?? "⚡"}</span>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}

                  {uniqueCities.length > 1 && (
                    <select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="sovereign-input !py-1 !text-xs"
                    >
                      <option value="">All cities</option>
                      {uniqueCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  )}

                  {hasFilters && (
                    <button
                      onClick={() => { setSearchQuery(""); setCategoryFilter(""); setCityFilter(""); }}
                      className="text-xs text-text-muted hover:text-text-primary transition-colors underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Result count when filtering */}
                {hasFilters && (
                  <p className="text-xs text-text-muted">
                    {filteredLive.length === 0
                      ? "No merchants match your search."
                      : `${filteredLive.length} ${filteredLive.length === 1 ? "merchant" : "merchants"} found`}
                  </p>
                )}
              </div>
            </ScrollReveal>
          )}

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
          ) : filteredMerchants.length === 0 && hasFilters ? (
            <ScrollReveal delay={0.1}>
              <div className="bg-bg-elevated border border-border-default border-dashed rounded-xl p-12 text-center">
                <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">No merchants match your search.</p>
                <button
                  onClick={() => { setSearchQuery(""); setCategoryFilter(""); setCityFilter(""); }}
                  className="mt-3 text-sm text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  Clear filters
                </button>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMerchants.map((m, i) => {
                const referralCode = deriveReferralCode(m.id);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={`bg-bg-elevated border rounded-xl overflow-hidden ${
                      m.pipeline
                        ? "border-border-default opacity-75"
                        : m.featured
                          ? "border-accent/40 ring-1 ring-accent/10"
                          : "border-border-default"
                    }`}
                  >
                    {/* Pipeline badge (admin only) */}
                    {m.pipeline && (
                      <div className="bg-neutral-200 text-neutral-500 text-[10px] font-mono uppercase tracking-wider text-center py-1">
                        Pipeline — awaiting first transaction
                      </div>
                    )}

                    {/* Logo banner across top */}
                    {m.logoUrl ? (
                      <div className="w-full h-40 bg-white border-b border-border-default flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.logoUrl}
                          alt={`${m.businessName} logo`}
                          className="h-full w-full object-contain p-3"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-bg-surface border-b border-border-default flex items-center justify-center text-4xl">
                        {CATEGORY_ICONS[m.category ?? "other"] ?? "⚡"}
                      </div>
                    )}

                    <div className="p-6">
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

                      {/* Referral code — live merchants only */}
                      {!m.pipeline && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <button
                            onClick={() => copyReferralCode(referralCode)}
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
                            title="Copy referral code"
                          >
                            <Share2 className="w-3 h-3" />
                            Refer a merchant:{" "}
                            <span className="text-accent font-semibold">{referralCode}</span>
                            {copiedCode === referralCode && (
                              <span className="text-green-500 ml-1">Copied!</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BTCMap Integration ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <ScrollReveal>
            <div className="bg-bg-elevated border border-border-default rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Map className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-text-primary">
                    Find ArxMint Merchants on BTCMap
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    ArxMint merchants are listed on BTCMap.org — the global Bitcoin merchant directory used by the broader Bitcoin community.
                  </p>
                </div>
                <a
                  href="https://btcmap.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View ArxMint merchants on BTCMap.org (opens in new window)"
                  className="antigravity-btn-outline !px-5 !py-2 inline-flex items-center gap-2 text-sm shrink-0"
                >
                  <Map className="w-4 h-4" />
                  View on BTCMap
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Collapsible submission instructions */}
              <div className="mt-4 border-t border-border-subtle pt-4">
                <button
                  onClick={() => setShowBtcMapTips((v) => !v)}
                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors w-full text-left"
                  aria-expanded={showBtcMapTips}
                >
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showBtcMapTips ? "rotate-180" : ""}`}
                  />
                  How to get your business listed on BTCMap
                </button>

                {showBtcMapTips && (
                  <div className="mt-3 space-y-2 text-sm text-text-secondary pl-6">
                    <p>
                      1.{" "}
                      <a
                        href="https://btcmap.org/add-merchant"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 underline underline-offset-2 transition-colors"
                      >
                        Submit your business on BTCMap
                      </a>{" "}
                      — the form takes about 2 minutes.
                    </p>
                    <p>
                      2. Listings typically appear within <span className="text-text-primary font-medium">24–48 hours</span> after review.
                    </p>
                    <p>
                      3. ArxMint merchants qualify as Bitcoin-accepting businesses — Lightning and ecash payments both count.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── Badge CTA ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <ScrollReveal>
            <Link
              href="/badge"
              className="block bg-bg-elevated border border-border-default rounded-xl p-6 hover:border-accent/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
                    Get Your &ldquo;Accepted Here&rdquo; Badge
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Embeddable badge for your website, printable stickers for your window, and a referral link to grow the network.
                  </p>
                </div>
              </div>
            </Link>
          </ScrollReveal>
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
