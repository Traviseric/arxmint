"use client";

// ============================================================
// ArxMint — Merchant Payment Setup Wizard
// /merchant-dashboard/setup?merchant=[id]&email=[email]
// 3-field form: Email, Payout Address, Telegram handle
// ============================================================

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  Wallet,
  MessageCircle,
  ArrowRight,
  Check,
  RefreshCw,
  ChevronLeft,
  Shield,
  Clock,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

interface OnboardingStatus {
  walletProvisioned: boolean;
  payoutConfigured: boolean;
  onboardingComplete: boolean;
  onboardingStatus: string;
}

function MerchantSetupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchant") || "";
  const prefilledEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefilledEmail);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  // Apply merchant light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  // Fetch onboarding status to show correct UI variant
  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant/${encodeURIComponent(merchantId)}/onboarding-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: OnboardingStatus | null) => {
        if (data) setOnboardingStatus(data);
        // If already fully configured, redirect to dashboard
        if (data?.onboardingComplete) {
          router.replace(`/merchant-dashboard?merchant=${encodeURIComponent(merchantId)}`);
        }
      })
      .catch(() => {});
  }, [merchantId, router]);

  const isLightningAddress = (addr: string) => addr.includes("@");
  const isBtcAddress = (addr: string) =>
    /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);

  const isValidPayout = payoutAddress.trim().length > 0 &&
    (isLightningAddress(payoutAddress.trim()) || isBtcAddress(payoutAddress.trim()));

  const canSubmit =
    email.trim().length > 0 &&
    email.includes("@") &&
    isValidPayout &&
    !submitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setSubmitting(true);
      setError(null);

      try {
        const payoutType = isLightningAddress(payoutAddress.trim())
          ? "lightning_address"
          : "onchain";

        const res = await fetch("/api/merchant-dashboard/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId: merchantId || undefined,
            email: email.trim(),
            payoutAddress: payoutAddress.trim(),
            payoutType,
            telegramHandle: telegramHandle.trim() || undefined,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            success: boolean;
            merchantId?: string;
          };
          if (data.success) {
            setSuccess(true);
            const targetId = data.merchantId || merchantId;
            setTimeout(() => {
              router.push(
                `/merchant-dashboard?merchant=${encodeURIComponent(targetId)}`
              );
            }, 2000);
          } else {
            setError("Setup did not complete. Please try again.");
          }
        } else {
          const d = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(d.error ?? "Failed to complete setup. Please try again.");
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, email, payoutAddress, telegramHandle, merchantId, router]
  );

  return (
    <div
      data-theme="merchant"
      className="relative overflow-x-hidden min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Full-bleed light background */}
      <div className="fixed inset-0 z-0" style={{ background: "#fafafa" }} />

      {/* Background ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-[#F7931A]/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[#F7931A]/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link
              href={
                merchantId
                  ? `/merchant-dashboard?merchant=${merchantId}`
                  : "/merchants"
              }
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">ArxMint</span>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 sm:px-6 py-12">
          {/* Hero */}
          <ScrollReveal>
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-6"
              >
                <Zap size={32} className="text-white" />
              </motion.div>
              {onboardingStatus?.walletProvisioned ? (
                <>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Your Bitcoin wallet
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-600">
                      is ready
                    </span>
                  </h1>
                  <p className="text-gray-500 mt-4 max-w-md mx-auto">
                    We auto-configured your payment wallet. Just add your payout
                    destination and you&apos;re live.
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                    <Check size={12} />
                    Bitcoin wallet auto-provisioned
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Start accepting Bitcoin
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                      in 60 seconds
                    </span>
                  </h1>
                  <p className="text-gray-500 mt-4 max-w-md mx-auto">
                    Three fields is all we need. Your payment link will be live
                    immediately after setup.
                  </p>
                </>
              )}
            </div>
          </ScrollReveal>

          {/* Trust badges */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={14} className="text-green-500" />
                No custody of funds
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={14} className="text-blue-500" />
                Instant settlement
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Zap size={14} className="text-orange-500" />
                Zero fees
              </div>
            </div>
          </ScrollReveal>

          {/* Success state */}
          {success ? (
            <ScrollReveal>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl border border-green-200 p-8 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check size={32} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  You&apos;re all set!
                </h2>
                <p className="text-gray-600">
                  Your payment link is now live. Redirecting you to your
                  dashboard...
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <RefreshCw size={14} className="animate-spin" />
                  Redirecting...
                </div>
              </motion.div>
            </ScrollReveal>
          ) : (
            /* Form */
            <ScrollReveal delay={0.2}>
              <form onSubmit={handleSubmit}>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Field 1: Email */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                        1
                      </div>
                      <label
                        htmlFor="setup-email"
                        className="font-semibold text-gray-900"
                      >
                        Email address
                      </label>
                    </div>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        id="setup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@business.com"
                        required
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      For payment notifications and invoice delivery.
                    </p>
                  </div>

                  {/* Field 2: Payout Address */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                        2
                      </div>
                      <label
                        htmlFor="setup-payout"
                        className="font-semibold text-gray-900"
                      >
                        Payout address
                      </label>
                    </div>
                    <div className="relative">
                      <Wallet
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        id="setup-payout"
                        type="text"
                        value={payoutAddress}
                        onChange={(e) => setPayoutAddress(e.target.value)}
                        placeholder="you@walletofsatoshi.com or bc1q..."
                        required
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a Lightning Address (e.g., from Wallet of Satoshi,
                      Phoenix, or Cash App) or an on-chain Bitcoin address. Funds
                      are auto-forwarded here after each payment.
                    </p>
                    {payoutAddress.trim().length > 0 && !isValidPayout && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Enter a valid Lightning Address (user@domain) or Bitcoin
                        address (bc1..., 1..., or 3...).
                      </p>
                    )}
                  </div>

                  {/* Field 3: Telegram (optional) */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                        3
                      </div>
                      <label
                        htmlFor="setup-telegram"
                        className="font-semibold text-gray-900"
                      >
                        Telegram handle
                        <span className="text-gray-400 font-normal text-sm ml-2">
                          optional
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <MessageCircle
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        id="setup-telegram"
                        type="text"
                        value={telegramHandle}
                        onChange={(e) => setTelegramHandle(e.target.value)}
                        placeholder="@yourhandle"
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Get instant payment notifications via Telegram when a
                      customer pays.
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-orange-500/20"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Start Accepting Bitcoin
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </ScrollReveal>
          )}

          {/* Footer help text */}
          {!success && (
            <ScrollReveal delay={0.3}>
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-400">
                  Need help?{" "}
                  <a
                    href="mailto:travis@arxmint.com"
                    className="text-orange-600 hover:underline"
                  >
                    travis@arxmint.com
                  </a>{" "}
                  /{" "}
                  <a
                    href="https://discord.gg/arxmint"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline"
                  >
                    Discord
                  </a>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  ArxMint never holds your funds. Payments are forwarded directly
                  to your wallet.
                </p>
              </div>
            </ScrollReveal>
          )}
        </main>
      </div>
    </div>
  );
}

export default function MerchantSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
      <MerchantSetupPageInner />
    </Suspense>
  );
}
