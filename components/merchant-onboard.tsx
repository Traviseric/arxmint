"use client";

// ============================================================
// ArxMint — Merchant Onboarding Flow
// Multi-step form for businesses to join the circular economy.
// Source: Doc 7 — merchant directory, BCE patterns
// ============================================================

import { useState } from "react";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  QrCode,
} from "lucide-react";

/** Merchant categories */
export type MerchantCategory =
  | "food-drink"
  | "retail"
  | "services"
  | "health"
  | "entertainment"
  | "technology"
  | "other";

const CATEGORY_LABELS: Record<MerchantCategory, string> = {
  "food-drink": "Food & Drink",
  retail: "Retail",
  services: "Services",
  health: "Health & Wellness",
  entertainment: "Entertainment",
  technology: "Technology",
  other: "Other",
};

/** Payment methods a merchant can accept */
export type PaymentMethod = "cashu" | "lightning" | "onchain" | "fedimint";

/** Merchant listing data */
export interface MerchantListing {
  id: string;
  name: string;
  category: MerchantCategory;
  description: string;
  location: string;
  paymentMethods: PaymentMethod[];
  contactInfo?: string;
  createdAt: number;
  active: boolean;
}

type Step = "info" | "payment" | "review" | "complete";

interface MerchantOnboardProps {
  onComplete: (merchant: MerchantListing) => void;
  onCancel: () => void;
  mintUrl?: string;
}

export function MerchantOnboard({
  onComplete,
  onCancel,
  mintUrl = "http://localhost:3338",
}: MerchantOnboardProps) {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MerchantCategory>("food-drink");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    "cashu",
    "lightning",
  ]);
  const [copied, setCopied] = useState(false);

  const togglePayment = (method: PaymentMethod) => {
    setPaymentMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const merchant: MerchantListing = {
    id: `m_${Date.now().toString(36)}`,
    name,
    category,
    description,
    location,
    paymentMethods,
    contactInfo: contactInfo || undefined,
    createdAt: Date.now(),
    active: true,
  };

  const paymentUri = `cashu://${mintUrl}?merchant=${encodeURIComponent(name)}&amount=0`;

  const handleCopyUri = async () => {
    await navigator.clipboard.writeText(paymentUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceedInfo = name.trim() && description.trim() && location.trim();
  const canProceedPayment = paymentMethods.length > 0;

  return (
    <div className="sovereign-card max-w-lg mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {(["info", "payment", "review", "complete"] as Step[]).map(
          (s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-btc-orange text-sovereign-black"
                    : (["info", "payment", "review", "complete"].indexOf(step) >
                      i)
                      ? "bg-green-500/20 text-green-400"
                      : "bg-sovereign-dark text-sovereign-muted"
                }`}
              >
                {(["info", "payment", "review", "complete"].indexOf(step) > i)
                  ? <CheckCircle className="w-4 h-4" />
                  : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 mx-1 ${
                    (["info", "payment", "review", "complete"].indexOf(step) > i)
                      ? "bg-green-500/40"
                      : "bg-sovereign-border"
                  }`}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Step 1: Business Info */}
      {step === "info" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-btc-orange" />
            Business Information
          </h3>

          <div>
            <label className="sovereign-label">Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bitcoin Coffee Shop"
              className="sovereign-input text-sm"
            />
          </div>

          <div>
            <label className="sovereign-label">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_LABELS) as [MerchantCategory, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      category === key
                        ? "bg-btc-orange/10 border-btc-orange/40 text-btc-orange"
                        : "bg-sovereign-dark border-sovereign-border text-sovereign-muted hover:text-sovereign-text"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="sovereign-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your business offer?"
              className="sovereign-input text-sm min-h-[60px]"
            />
          </div>

          <div>
            <label className="sovereign-label">
              <MapPin className="w-3 h-3 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Longmont, CO"
              className="sovereign-input text-sm"
            />
          </div>

          <div>
            <label className="sovereign-label">Contact (optional)</label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="@handle, website, or phone"
              className="sovereign-input text-sm"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={onCancel} className="sovereign-btn-outline !py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={() => setStep("payment")}
              disabled={!canProceedInfo}
              className="sovereign-btn !py-2 text-sm"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment Methods */}
      {step === "payment" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-btc-orange" />
            Payment Methods
          </h3>
          <p className="text-sm text-sovereign-muted">
            Select which Bitcoin payment methods you accept.
          </p>

          <div className="space-y-2">
            {([
              { id: "cashu" as const, label: "Cashu Ecash", desc: "Instant, private bearer tokens. Best for small payments." },
              { id: "lightning" as const, label: "Lightning", desc: "Fast, low-fee payments via Lightning Network." },
              { id: "fedimint" as const, label: "Fedimint Ecash", desc: "Federation-backed ecash. Private within the community." },
              { id: "onchain" as const, label: "On-chain", desc: "Standard Bitcoin transactions. Best for large amounts." },
            ]).map((pm) => (
              <button
                key={pm.id}
                onClick={() => togglePayment(pm.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  paymentMethods.includes(pm.id)
                    ? "border-btc-orange/40 bg-btc-orange/5"
                    : "border-sovereign-border bg-sovereign-dark"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-sovereign-white">
                    {pm.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      paymentMethods.includes(pm.id)
                        ? "border-btc-orange bg-btc-orange"
                        : "border-sovereign-border"
                    }`}
                  >
                    {paymentMethods.includes(pm.id) && (
                      <Check className="w-3 h-3 text-sovereign-black" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-sovereign-muted mt-1">{pm.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("info")} className="sovereign-btn-outline !py-2 text-sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!canProceedPayment}
              className="sovereign-btn !py-2 text-sm"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-btc-orange" />
            Review Listing
          </h3>

          <div className="rounded-lg border border-sovereign-border bg-sovereign-dark p-4 space-y-3">
            <div>
              <div className="text-xs text-sovereign-muted">Business</div>
              <div className="text-sm font-medium text-sovereign-white">
                {name}
              </div>
            </div>
            <div>
              <div className="text-xs text-sovereign-muted">Category</div>
              <div className="text-sm text-sovereign-text">
                {CATEGORY_LABELS[category]}
              </div>
            </div>
            <div>
              <div className="text-xs text-sovereign-muted">Description</div>
              <div className="text-sm text-sovereign-text">{description}</div>
            </div>
            <div>
              <div className="text-xs text-sovereign-muted">Location</div>
              <div className="text-sm text-sovereign-text">{location}</div>
            </div>
            <div>
              <div className="text-xs text-sovereign-muted">Accepts</div>
              <div className="flex gap-1.5 mt-1">
                {paymentMethods.map((pm) => (
                  <span
                    key={pm}
                    className="px-2 py-0.5 rounded-full bg-btc-orange/10 text-btc-orange text-xs"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("payment")} className="sovereign-btn-outline !py-2 text-sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => {
                onComplete(merchant);
                setStep("complete");
              }}
              className="sovereign-btn !py-2 text-sm"
            >
              List Business
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-sovereign-white">
            Listed!
          </h3>
          <p className="text-sm text-sovereign-muted">
            {name} is now in the merchant directory. Share your payment QR
            with customers.
          </p>

          {/* Payment URI */}
          <div className="rounded-lg border border-sovereign-border bg-sovereign-dark p-4">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-btc-orange" />
              <span className="text-xs text-sovereign-muted">
                Payment URI (for QR code generation)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-sovereign-text font-mono break-all flex-1">
                {paymentUri}
              </code>
              <button
                onClick={handleCopyUri}
                className="p-1.5 rounded bg-sovereign-panel hover:bg-sovereign-border transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sovereign-muted" />
                )}
              </button>
            </div>
          </div>

          {/* POS Setup Guidance */}
          <div className="text-left rounded-lg border border-sovereign-border bg-sovereign-dark p-4">
            <div className="text-xs font-bold text-sovereign-white mb-2">
              POS Setup
            </div>
            <ul className="space-y-1.5 text-xs text-sovereign-muted">
              <li>
                <span className="text-btc-orange font-medium">NFC:</span> Use{" "}
                <a href="https://numo.cash" target="_blank" rel="noopener noreferrer" className="text-btc-orange underline">
                  Numo
                </a>{" "}
                for tap-to-pay with Cashu ecash
              </li>
              <li>
                <span className="text-btc-orange font-medium">QR:</span> Print
                the payment URI as a QR code for counter display
              </li>
              <li>
                <span className="text-btc-orange font-medium">Invoice:</span>{" "}
                Create Lightning invoices per transaction via the wallet panel
              </li>
            </ul>
          </div>

          <button onClick={onCancel} className="sovereign-btn !py-2 text-sm">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/** Simple merchant listing card for the directory */
export function MerchantCard({ merchant }: { merchant: MerchantListing }) {
  return (
    <div className="sovereign-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-sovereign-white">{merchant.name}</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sovereign-dark text-sovereign-muted">
            {CATEGORY_LABELS[merchant.category]}
          </span>
        </div>
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1 ${
            merchant.active ? "bg-green-400" : "bg-sovereign-muted"
          }`}
        />
      </div>
      <p className="text-sm text-sovereign-muted mb-3 leading-relaxed">
        {merchant.description}
      </p>
      <div className="flex items-center gap-2 text-xs text-sovereign-muted mb-2">
        <MapPin className="w-3 h-3" />
        {merchant.location}
      </div>
      <div className="flex gap-1.5">
        {merchant.paymentMethods.map((pm) => (
          <span
            key={pm}
            className="px-2 py-0.5 rounded-full bg-btc-orange/10 text-btc-orange text-xs"
          >
            {pm}
          </span>
        ))}
      </div>
    </div>
  );
}
