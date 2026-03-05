"use client";

// ============================================================
// ArxMint — Merchant Badge Page
// Merchants grab their "Accepted Here" badge + embed code here.
// Includes: live preview, copy-paste HTML, downloadable SVGs,
// and referral link for recruiting other merchants.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { AcceptedHereBadge, getAcceptedHereSVG } from "@/components/accepted-here-badge";
import { ScrollReveal } from "@/components/scroll-reveal";

type Variant = "dark" | "light" | "outline" | "minimal";
type Size = "sm" | "md" | "lg";

export default function BadgePage() {
  const [variant, setVariant] = useState<Variant>("dark");
  const [size, setSize] = useState<Size>("md");
  const [merchantId, setMerchantId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Apply merchant light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  const referralParam = merchantId ? `?ref=${merchantId}` : "";
  const embedUrl = `https://www.arxmint.com/merchants${referralParam}`;

  const embedHTML = `<!-- ArxMint "Accepted Here" Badge -->
<a href="${embedUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">
  <img src="https://www.arxmint.com/api/badge${merchantId ? `?ref=${merchantId}` : ""}${variant !== "dark" ? `&variant=${variant}` : ""}" alt="Bitcoin Accepted Here — ArxMint" height="40" />
</a>`;

  const referralLink = `https://www.arxmint.com/merchants${referralParam}`;

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const downloadSVG = useCallback((v: "dark" | "light") => {
    const svg = getAcceptedHereSVG(v);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arxmint-accepted-here-${v}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div data-theme="merchant" className="relative min-h-screen" style={{ background: "#fafafa", color: "#171717" }}>
      <div className="fixed inset-0 z-0" style={{ background: "#fafafa" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            Merchant Badge
          </h1>
          <p className="text-text-secondary mb-12">
            Show your customers you accept Bitcoin. Grab your badge for your website,
            window, or counter — and invite other businesses to join the network.
          </p>
        </ScrollReveal>

        {/* ── Merchant ID ── */}
        <ScrollReveal delay={0.1}>
          <div className="mb-10">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Your Merchant ID <span className="text-text-muted">(optional — for referral tracking)</span>
            </label>
            <input
              type="text"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value.trim())}
              placeholder="e.g. seed-glacier"
              className="w-full px-4 py-2.5 rounded-lg border border-border-default bg-bg-elevated text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </ScrollReveal>

        {/* ── Live Preview ── */}
        <ScrollReveal delay={0.15}>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>

            {/* Variant selector */}
            <div className="flex gap-2 mb-4">
              {(["dark", "light", "outline", "minimal"] as Variant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors ${
                    variant === v
                      ? "bg-accent text-white"
                      : "bg-bg-elevated text-text-secondary border border-border-default hover:border-accent/30"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Size selector */}
            <div className="flex gap-2 mb-6">
              {(["sm", "md", "lg"] as Size[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors ${
                    size === s
                      ? "bg-accent text-white"
                      : "bg-bg-elevated text-text-secondary border border-border-default hover:border-accent/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Badge preview on checkered background */}
            <div
              className="rounded-xl p-10 flex items-center justify-center border border-border-default"
              style={{
                backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                backgroundColor: "#e8e8e8",
              }}
            >
              <AcceptedHereBadge
                merchantId={merchantId || undefined}
                variant={variant}
                size={size}
                showReferral
              />
            </div>
          </div>
        </ScrollReveal>

        {/* ── Embed Code ── */}
        <ScrollReveal delay={0.2}>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Embed on Your Website</h2>
            <p className="text-sm text-text-secondary mb-4">
              Paste this HTML anywhere on your site. When visitors click, they see
              the ArxMint merchant network{merchantId ? " — with your referral tracked" : ""}.
            </p>
            <div className="relative">
              <pre className="bg-[#0a0a0a] text-[#e5e5e5] rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                {embedHTML}
              </pre>
              <button
                onClick={() => copyToClipboard(embedHTML, "embed")}
                className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                {copied === "embed" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Referral Link ── */}
        <ScrollReveal delay={0.25}>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Referral Link</h2>
            <p className="text-sm text-text-secondary mb-4">
              Share this link with other businesses. When they sign up, you get credit
              for growing the network.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border-default bg-bg-elevated text-text-primary text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(referralLink, "referral")}
                className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors inline-flex items-center gap-2"
              >
                {copied === "referral" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === "referral" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Downloads ── */}
        <ScrollReveal delay={0.3}>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Download for Print</h2>
            <p className="text-sm text-text-secondary mb-4">
              SVG files for window stickers, counter cards, and receipts. Scales to any size without losing quality.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark variant download */}
              <div className="bg-[#0a0a0a] rounded-xl p-6 flex flex-col items-center gap-4 border border-[#333]">
                <div
                  dangerouslySetInnerHTML={{ __html: getAcceptedHereSVG("dark") }}
                  className="w-full max-w-[280px]"
                />
                <button
                  onClick={() => downloadSVG("dark")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-mono hover:bg-white/20 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Dark SVG
                </button>
              </div>

              {/* Light variant download */}
              <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 border border-[#e5e5e5]">
                <div
                  dangerouslySetInnerHTML={{ __html: getAcceptedHereSVG("light") }}
                  className="w-full max-w-[280px]"
                />
                <button
                  onClick={() => downloadSVG("light")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0a0a0a] text-white text-xs font-mono hover:bg-[#1a1a1a] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Light SVG
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Full Artwork Gallery ── */}
        <ScrollReveal delay={0.32}>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Merchant Kit Artwork</h2>
            <p className="text-sm text-text-secondary mb-6">
              Professional artwork for social media, storefronts, and marketing. Right-click to save any image.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/badge-dark.png" alt="Bitcoin Accepted Here badge (dark)" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Badge — Dark (website embed, glass doors)</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/badge-light.png" alt="Bitcoin Accepted Here badge (light)" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Badge — Light (print, counter cards)</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/window-sticker.png" alt="ArxMint window sticker" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Window Sticker — circular die-cut</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/counter-card.png" alt="ArxMint QR counter card" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Counter Card — Scan to Pay QR</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/logo-icon.png" alt="ArxMint logo icon" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Logo Icon — fortress + lightning</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/welcome-kit.png" alt="ArxMint merchant welcome kit" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Welcome Kit — full merchant package</div>
              </div>
            </div>
            {/* Wide images */}
            <div className="mt-4 space-y-4">
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/network-hero.png" alt="Join the ArxMint network" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Network Hero — &ldquo;Join the network&rdquo; promotional</div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/merchant-kit/social-banner.png" alt="Build the citadel social banner" className="w-full" />
                <div className="p-3 bg-bg-elevated text-xs text-text-muted">Social Banner — &ldquo;Build the citadel&rdquo; header</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Instructions ── */}
        <ScrollReveal delay={0.35}>
          <div className="bg-bg-elevated border border-border-default rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">How to Use</h2>
            <div className="space-y-4 text-sm text-text-secondary">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">1</span>
                <p><strong className="text-text-primary">Website:</strong> Copy the embed code above and paste it in your site footer, checkout page, or about page.</p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <p><strong className="text-text-primary">Window sticker:</strong> Download the SVG and print at any size. The dark version works best on glass doors.</p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">3</span>
                <p><strong className="text-text-primary">Counter card:</strong> Print the light SVG on card stock. Place at register or point of sale.</p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">4</span>
                <p><strong className="text-text-primary">Invite others:</strong> Share your referral link with neighboring businesses. Every signup strengthens the network.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Back link ── */}
        <div className="mt-8 text-center">
          <a
            href="/merchants"
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View the Merchant Directory
          </a>
        </div>
      </div>
    </div>
  );
}
