"use client";

// ============================================================
// ArxMint — Merchant Dashboard Settings
// /merchant-dashboard/settings?merchant=[id]
// Business info, payment settings, notifications, API keys, export
// ============================================================

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Copy,
  Check,
  ChevronLeft,
  Settings,
  Building2,
  Wallet,
  Bell,
  Key,
  FileDown,
  ExternalLink,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
  MapPin,
  Tag,
  Mail,
  MessageCircle,
  Link2,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

// ---- Types ----

interface MerchantSettings {
  // Business info (read-only for now)
  businessName: string;
  location: string | null;
  category: string | null;
  website: string | null;
  // Payment settings
  payoutAddress: string | null;
  payoutType: string | null;
  defaultAmountSats: number | null;
  customMemo: string | null;
  // Notifications
  telegramHandle: string | null;
  emailNotifications: boolean;
  webhookUrl: string | null;
  // API Keys
  invoiceKey: string | null;
}

// ---- Seed merchant data fallback ----

const SEED_MERCHANTS: Record<
  string,
  { businessName: string; location: string | null; category: string | null; website: string | null }
> = {
  "seed-black-bear": {
    businessName: "Black Bear Window Cleaning",
    location: "Boulder, CO",
    category: "services",
    website: "https://blackbearwindowcleaning.com",
  },
  "seed-glacier": {
    businessName: "The Ice Cream Parlor by Glacier",
    location: "Boulder, CO",
    category: "food-drink",
    website: "https://www.glacierparlor.com",
  },
  "seed-teneo": {
    businessName: "Teneo",
    location: "Denver, CO",
    category: "technology",
    website: "https://teneo.io",
  },
};

// ---- Helper components ----

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

function SectionCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <ScrollReveal delay={delay}>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
          {icon}
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </ScrollReveal>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 flex items-center gap-2">
        {icon}
        {value || "--"}
      </div>
    </div>
  );
}

// ---- Main Component ----

function MerchantSettingsContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchant") || "seed-black-bear";

  const seedData = SEED_MERCHANTS[merchantId];

  // Form state — initialized from API or seed data
  const [settings, setSettings] = useState<MerchantSettings>({
    businessName: seedData?.businessName ?? merchantId,
    location: seedData?.location ?? null,
    category: seedData?.category ?? null,
    website: seedData?.website ?? null,
    payoutAddress: null,
    payoutType: null,
    defaultAmountSats: null,
    customMemo: null,
    telegramHandle: null,
    emailNotifications: true,
    webhookUrl: null,
    invoiceKey: null,
  });

  // Editable fields (payment + notification settings)
  const [payoutAddress, setPayoutAddress] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [customMemo, setCustomMemo] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Export state
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  // Apply merchant light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  // Load settings from API
  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchant-dashboard/settings?merchant=${encodeURIComponent(merchantId)}`)
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data: MerchantSettings | null) => {
        if (data) {
          setSettings(data);
          setPayoutAddress(data.payoutAddress ?? "");
          setDefaultAmount(
            data.defaultAmountSats ? String(data.defaultAmountSats) : ""
          );
          setCustomMemo(data.customMemo ?? "");
          setTelegramHandle(data.telegramHandle ?? "");
          setEmailNotifications(data.emailNotifications);
          setWebhookUrl(data.webhookUrl ?? "");
        }
      })
      .catch(() => {
        // Use defaults / seed data
      })
      .finally(() => setLoading(false));
  }, [merchantId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/merchant-dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          payoutAddress: payoutAddress.trim() || null,
          payoutType: payoutAddress.includes("@")
            ? "lightning_address"
            : payoutAddress.trim()
              ? "onchain"
              : null,
          defaultAmountSats: defaultAmount
            ? parseInt(defaultAmount, 10)
            : null,
          customMemo: customMemo.trim() || null,
          telegramHandle: telegramHandle.trim() || null,
          emailNotifications,
          webhookUrl: webhookUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const d = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setSaveError(d.error ?? "Failed to save settings.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    merchantId,
    payoutAddress,
    defaultAmount,
    customMemo,
    telegramHandle,
    emailNotifications,
    webhookUrl,
  ]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({ format: "csv" });
    if (exportFrom) params.set("from", exportFrom);
    if (exportTo) params.set("to", exportTo);
    window.open(
      `/api/merchant-dashboard/export?${params.toString()}`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div
        data-theme="merchant"
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#fafafa" }}
      >
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link
              href={`/merchant-dashboard?merchant=${merchantId}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
              Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Settings
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Page heading */}
          <ScrollReveal>
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your payment configuration, notifications, and account.
              </p>
            </div>
          </ScrollReveal>

          {/* Business Info (read-only) */}
          <SectionCard
            icon={<Building2 size={18} className="text-gray-500" />}
            title="Business Info"
            delay={0.1}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField
                label="Business Name"
                value={settings.businessName}
                icon={<Building2 size={14} className="text-gray-400" />}
              />
              <ReadOnlyField
                label="Location"
                value={settings.location}
                icon={<MapPin size={14} className="text-gray-400" />}
              />
              <ReadOnlyField
                label="Category"
                value={settings.category}
                icon={<Tag size={14} className="text-gray-400" />}
              />
              <ReadOnlyField
                label="Website"
                value={settings.website}
                icon={<Globe size={14} className="text-gray-400" />}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              To update your business info, edit your listing at{" "}
              <Link
                href="/merchants"
                className="text-orange-600 hover:underline"
              >
                arxmint.com/merchants
              </Link>{" "}
              or contact{" "}
              <a
                href="mailto:travis@arxmint.com"
                className="text-orange-600 hover:underline"
              >
                travis@arxmint.com
              </a>
              .
            </p>
          </SectionCard>

          {/* Payment Settings */}
          <SectionCard
            icon={<Wallet size={18} className="text-orange-600" />}
            title="Payment Settings"
            delay={0.15}
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="settings-payout"
                  className="block text-xs text-gray-500 mb-1"
                >
                  Payout Address
                </label>
                <input
                  id="settings-payout"
                  type="text"
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  placeholder="you@walletofsatoshi.com or bc1q..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lightning Address or on-chain Bitcoin address for auto-payout.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="settings-default-amount"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Default Amount (sats)
                  </label>
                  <input
                    id="settings-default-amount"
                    type="number"
                    min="0"
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value)}
                    placeholder="Leave empty for any amount"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pre-fills the checkout with a fixed amount.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="settings-memo"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Custom Memo
                  </label>
                  <input
                    id="settings-memo"
                    type="text"
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                    placeholder="Thanks for choosing us!"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Shown on the payment receipt.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard
            icon={<Bell size={18} className="text-blue-600" />}
            title="Notifications"
            delay={0.2}
          >
            <div className="space-y-4">
              {/* Email toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Email Notifications
                    </div>
                    <div className="text-xs text-gray-500">
                      Receive payment confirmations by email
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotifications ? "bg-orange-500" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={emailNotifications}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      emailNotifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Telegram */}
              <div className="flex items-start gap-3">
                <MessageCircle
                  size={16}
                  className="text-gray-400 mt-2"
                />
                <div className="flex-1">
                  <label
                    htmlFor="settings-telegram"
                    className="block text-sm font-medium text-gray-900 mb-1"
                  >
                    Telegram Notifications
                  </label>
                  <input
                    id="settings-telegram"
                    type="text"
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    placeholder="@yourhandle"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Instant payment alerts via Telegram bot.
                  </p>
                </div>
              </div>

              {/* Webhook */}
              <div className="flex items-start gap-3">
                <Link2 size={16} className="text-gray-400 mt-2" />
                <div className="flex-1">
                  <label
                    htmlFor="settings-webhook"
                    className="block text-sm font-medium text-gray-900 mb-1"
                  >
                    Webhook URL
                    <span className="text-gray-400 font-normal text-xs ml-2">
                      advanced
                    </span>
                  </label>
                  <input
                    id="settings-webhook"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll POST payment events to this URL.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* API Keys */}
          <SectionCard
            icon={<Key size={18} className="text-purple-600" />}
            title="API Keys"
            delay={0.25}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Invoice / Read Key
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-700 overflow-hidden flex items-center gap-2">
                    {showKey && settings.invoiceKey ? (
                      settings.invoiceKey
                    ) : (
                      <span className="text-gray-400 tracking-wider">
                        ••••••••••••••••••••••••••••••••
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    title={showKey ? "Hide key" : "Reveal key"}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {settings.invoiceKey && (
                    <CopyButton text={settings.invoiceKey} label="Copy" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This key can create invoices and check payment status. It
                  cannot withdraw funds.
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  Quick API Reference
                </div>
                <div className="font-mono text-xs space-y-1">
                  <div className="text-gray-500">
                    # Create invoice
                  </div>
                  <div className="text-gray-800">POST /api/checkout</div>
                  <div className="text-gray-500 mt-2">
                    # Check payment status
                  </div>
                  <div className="text-gray-800">
                    GET /api/checkout/status/[id]
                  </div>
                </div>
              </div>

              {!settings.invoiceKey && (
                <p className="text-xs text-gray-500">
                  Per-merchant API keys will be available once your wallet is
                  provisioned. Contact{" "}
                  <a
                    href="mailto:travis@arxmint.com"
                    className="text-orange-600 hover:underline"
                  >
                    travis@arxmint.com
                  </a>{" "}
                  for your key.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Export */}
          <SectionCard
            icon={<FileDown size={18} className="text-green-600" />}
            title="Export"
            delay={0.3}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Download your transaction history as a QuickBooks-compatible CSV
                file (Date, Description, Credit, Debit).
              </p>

              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={exportFrom}
                    onChange={(e) => setExportFrom(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={exportTo}
                    onChange={(e) => setExportTo(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FileDown size={14} />
                  Download CSV
                </button>
              </div>

              <p className="text-xs text-gray-500">
                USD values use the exchange rate at the time of each payment.
              </p>
            </div>
          </SectionCard>

          {/* Save button bar */}
          <ScrollReveal delay={0.35}>
            <motion.div
              className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-sm text-gray-500">
                {saveSuccess ? (
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Check size={14} />
                    Settings saved successfully.
                  </span>
                ) : saveError ? (
                  <span className="text-red-600 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {saveError}
                  </span>
                ) : (
                  "Changes are saved when you click Save."
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Settings
                  </>
                )}
              </button>
            </motion.div>
          </ScrollReveal>

          {/* Footer links */}
          <ScrollReveal delay={0.4}>
            <div className="flex flex-wrap justify-center gap-4 py-6 text-xs text-gray-400">
              <Link
                href={`/merchant-dashboard?merchant=${merchantId}`}
                className="hover:text-orange-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={`/pay/${merchantId}`}
                target="_blank"
                className="hover:text-orange-600 transition-colors flex items-center gap-1"
              >
                Checkout Page <ExternalLink size={10} />
              </Link>
              <Link
                href="/merchants"
                className="hover:text-orange-600 transition-colors"
              >
                Merchant Directory
              </Link>
              <a
                href="mailto:travis@arxmint.com"
                className="hover:text-orange-600 transition-colors"
              >
                Support
              </a>
            </div>
          </ScrollReveal>
        </main>
      </div>
    </div>
  );
}

export default function MerchantSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#fafafa" }} />}>
      <MerchantSettingsContent />
    </Suspense>
  );
}
