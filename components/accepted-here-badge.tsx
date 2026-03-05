"use client";

// ============================================================
// ArxMint "Accepted Here" Badge
// Merchants embed this on their site or print it for their store.
// Includes referral link back to arxmint.com/merchants
// ============================================================

import { Zap } from "lucide-react";

interface AcceptedHereBadgeProps {
  /** Merchant's slug/id for referral tracking */
  merchantId?: string;
  /** Display variant */
  variant?: "dark" | "light" | "outline" | "minimal";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Show "Join the network" referral text */
  showReferral?: boolean;
  /** Link to merchant's payment page instead of directory */
  payLink?: string;
  /** Disable the link (for print/static use) */
  static?: boolean;
}

const SIZE_MAP = {
  sm: { badge: "px-3 py-1.5", text: "text-[10px]", icon: "w-3 h-3", gap: "gap-1.5" },
  md: { badge: "px-4 py-2", text: "text-xs", icon: "w-4 h-4", gap: "gap-2" },
  lg: { badge: "px-6 py-3", text: "text-sm", icon: "w-5 h-5", gap: "gap-2.5" },
};

const VARIANT_MAP = {
  dark: "bg-[#0a0a0a] text-white border border-[#333]",
  light: "bg-white text-[#171717] border border-[#e5e5e5]",
  outline: "bg-transparent text-[#F7931A] border-2 border-[#F7931A]",
  minimal: "bg-transparent text-[#171717]",
};

export function AcceptedHereBadge({
  merchantId,
  variant = "dark",
  size = "md",
  showReferral = false,
  payLink,
  static: isStatic = false,
}: AcceptedHereBadgeProps) {
  const s = SIZE_MAP[size];
  const v = VARIANT_MAP[variant];
  const referralParam = merchantId ? `?ref=${merchantId}` : "";
  const href = payLink ?? `https://www.arxmint.com/merchants${referralParam}`;

  const badge = (
    <span
      className={`inline-flex items-center ${s.gap} ${s.badge} ${v} rounded-lg font-mono uppercase tracking-wider ${s.text} select-none`}
    >
      <Zap className={`${s.icon} text-[#F7931A] fill-[#F7931A]`} />
      <span>
        <span className="font-semibold text-[#F7931A]">Bitcoin</span>
        {" "}Accepted Here
      </span>
      <span className="text-[#F7931A] opacity-60">|</span>
      <span className="opacity-70">ArxMint</span>
    </span>
  );

  if (isStatic) {
    return (
      <div className="inline-block">
        {badge}
        {showReferral && (
          <p className={`${s.text} text-center opacity-50 mt-1`}>
            arxmint.com/merchants
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="inline-block">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-90 transition-opacity"
      >
        {badge}
      </a>
      {showReferral && (
        <a
          href={`https://www.arxmint.com/merchants${referralParam}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`block ${s.text} text-center text-[#F7931A] opacity-60 hover:opacity-100 transition-opacity mt-1`}
        >
          Join the network
        </a>
      )}
    </div>
  );
}

/**
 * SVG version for downloads/prints — self-contained, no React dependencies.
 * Returns SVG markup string.
 */
export function getAcceptedHereSVG(variant: "dark" | "light" = "dark"): string {
  const bg = variant === "dark" ? "#0a0a0a" : "#ffffff";
  const text = variant === "dark" ? "#fafafa" : "#171717";
  const border = variant === "dark" ? "#333333" : "#e5e5e5";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="320" height="60">
  <rect x="1" y="1" width="318" height="58" rx="10" fill="${bg}" stroke="${border}" stroke-width="1.5"/>
  <!-- Lightning bolt -->
  <g transform="translate(20, 12)">
    <path d="M13 2L3 14h6l-2 10 10-12h-6l2-10z" fill="#F7931A" stroke="#F7931A" stroke-width="0.5" stroke-linejoin="round"/>
  </g>
  <text x="52" y="28" font-family="monospace, 'Courier New'" font-size="11" font-weight="700" fill="#F7931A" letter-spacing="1">BITCOIN</text>
  <text x="120" y="28" font-family="monospace, 'Courier New'" font-size="11" font-weight="400" fill="${text}" letter-spacing="1">ACCEPTED HERE</text>
  <line x1="252" y1="10" x2="252" y2="50" stroke="#F7931A" stroke-width="1" opacity="0.4"/>
  <text x="264" y="28" font-family="monospace, 'Courier New'" font-size="9" fill="${text}" opacity="0.6" letter-spacing="0.5">ArxMint</text>
  <text x="52" y="45" font-family="monospace, 'Courier New'" font-size="8" fill="#F7931A" opacity="0.5">arxmint.com/merchants</text>
</svg>`;
}
