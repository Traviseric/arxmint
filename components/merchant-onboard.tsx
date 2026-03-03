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
import { useSovereignStore } from "@/lib/store";
import type { MerchantCategory, PaymentMethod, MerchantListing } from "@/lib/types";
export type { MerchantCategory, PaymentMethod, MerchantListing };

const CATEGORY_LABELS: Record<MerchantCategory, string> = {
  "food-drink": "Food & Drink",
  retail: "Retail",
  services: "Services",
  health: "Health & Wellness",
  entertainment: "Entertainment",
  technology: "Technology",
  other: "Other",
};

type Step = "info" | "payment" | "review" | "complete";

interface MerchantOnboardProps {
  onComplete: (merchant: MerchantListing) => void;
  onCancel: () => void;
  mintUrl?: string;
  communityId?: string;
}

const MAX_DESC_CHARS = 200;

const STEPS: Step[] = ["info", "payment", "review", "complete"];

const STEP_LABELS: Record<Step, string> = {
  info: "Business Info",
  payment: "Payment Methods",
  review: "Review",
  complete: "Complete",
};

export function MerchantOnboard({
  onComplete,
  onCancel,
  mintUrl = "http://localhost:3338",
  communityId,
}: MerchantOnboardProps) {
  const { addMerchant, saveMerchantsToStorage } = useSovereignStore();
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (fieldName: string, value: string) => {
    const messages: Record<string, string> = {
      businessName: "Business name is required",
      description: "Description is required",
      location: "Location is required",
    };
    if (!value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: messages[fieldName] ?? "This field is required" }));
    } else {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const resetForm = () => {
    setStep("info");
    setName("");
    setCategory("food-drink");
    setDescription("");
    setLocation("");
    setContactInfo("");
    setPaymentMethods(["cashu", "lightning"]);
    setSubmitError(null);
  };

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

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="sovereign-card max-w-lg mx-auto">
      {/* Progress Steps */}
      <nav aria-label="Form progress">
        <ol className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center">
              <div
                aria-current={step === s ? "step" : undefined}
                aria-label={`Step ${i + 1} of ${STEPS.length}: ${STEP_LABELS[s]}${step === s ? " (current)" : currentStepIndex > i ? " (completed)" : ""}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-btc-orange text-sovereign-black"
                    : currentStepIndex > i
                      ? "bg-green-500/20 text-green-400"
                      : "bg-sovereign-dark text-sovereign-muted"
                }`}
              >
                {currentStepIndex > i ? (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`w-8 sm:w-12 h-0.5 mx-1 ${
                    currentStepIndex > i
                      ? "bg-green-500/40"
                      : "bg-sovereign-border"
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step 1: Business Info */}
      {step === "info" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-btc-orange" aria-hidden="true" />
            Business Information
          </h3>

          <div>
            <label htmlFor="business-name" className="sovereign-label">
              Business Name
              <span aria-hidden="true" className="text-btc-orange ml-1">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => validateField("businessName", e.target.value)}
              placeholder="Bitcoin Coffee Shop"
              aria-describedby={fieldErrors.businessName ? "businessName-error" : undefined}
              className={`sovereign-input text-sm${fieldErrors.businessName ? " border-red-500" : ""}`}
            />
            {fieldErrors.businessName && (
              <p id="businessName-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.businessName}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="sovereign-label mb-2">
              Category
              <span aria-hidden="true" className="text-btc-orange ml-1">*</span>
              <span className="sr-only">(required)</span>
            </legend>
            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_LABELS) as [MerchantCategory, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    role="radio"
                    aria-checked={category === key}
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
          </fieldset>

          <div>
            <label htmlFor="business-description" className="sovereign-label">
              Description
              <span aria-hidden="true" className="text-btc-orange ml-1">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <textarea
              id="business-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => validateField("description", e.target.value)}
              placeholder="What does your business offer?"
              maxLength={MAX_DESC_CHARS}
              aria-label={`Business description, maximum ${MAX_DESC_CHARS} characters`}
              aria-describedby={`desc-counter${fieldErrors.description ? " description-error" : ""}`}
              className={`sovereign-input text-sm min-h-[60px]${fieldErrors.description ? " border-red-500" : ""}`}
            />
            <p
              id="desc-counter"
              className="text-xs text-sovereign-muted mt-1 text-right"
              aria-live="polite"
            >
              {description.length}/{MAX_DESC_CHARS} characters
            </p>
            {fieldErrors.description && (
              <p id="description-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="business-location" className="sovereign-label">
              <MapPin className="w-3 h-3 inline mr-1" aria-hidden="true" />
              Location
              <span aria-hidden="true" className="text-btc-orange ml-1">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="business-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={(e) => validateField("location", e.target.value)}
              placeholder="Longmont, CO"
              aria-describedby={fieldErrors.location ? "location-error" : undefined}
              className={`sovereign-input text-sm${fieldErrors.location ? " border-red-500" : ""}`}
            />
            {fieldErrors.location && (
              <p id="location-error" role="alert" className="text-xs text-red-400 mt-1">
                {fieldErrors.location}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-info" className="sovereign-label">
              Contact
              <span className="text-sovereign-muted text-xs ml-1">(optional)</span>
            </label>
            <input
              id="contact-info"
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
              Next <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment Methods */}
      {step === "payment" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-btc-orange" aria-hidden="true" />
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
            ]).map((pm) => {
              const isChecked = paymentMethods.includes(pm.id);
              return (
                <button
                  key={pm.id}
                  aria-pressed={isChecked}
                  onClick={() => togglePayment(pm.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    isChecked
                      ? "border-btc-orange/40 bg-btc-orange/5"
                      : "border-sovereign-border bg-sovereign-dark"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-sovereign-white">
                      {pm.label}
                    </span>
                    <div
                      aria-hidden="true"
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isChecked
                          ? "border-btc-orange bg-btc-orange"
                          : "border-sovereign-border"
                      }`}
                    >
                      {isChecked && (
                        <Check className="w-3 h-3 text-sovereign-black" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-sovereign-muted mt-1">{pm.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("info")} className="sovereign-btn-outline !py-2 text-sm">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!canProceedPayment}
              className="sovereign-btn !py-2 text-sm"
            >
              Next <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-btc-orange" aria-hidden="true" />
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

          {submitError && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {submitError}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("payment")} className="sovereign-btn-outline !py-2 text-sm">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
            </button>
            <button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setSubmitError(null);
                try {
                  const res = await fetch("/api/merchants", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      communityId: communityId ?? "unknown",
                      name,
                      description,
                      category,
                      location,
                      contactInfo: contactInfo || null,
                      paymentMethods,
                      cashuAddress: paymentMethods.includes("cashu") ? paymentUri : null,
                      lightningAddress: paymentMethods.includes("lightning") ? contactInfo || null : null,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to save merchant");
                  }
                  const data = await res.json();
                  const savedMerchant: MerchantListing = {
                    ...merchant,
                    id: data.merchant?.id ?? merchant.id,
                  };
                  addMerchant(savedMerchant);
                  saveMerchantsToStorage();
                  onComplete(savedMerchant);
                  setStep("complete");
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  setSubmitError(`Failed to save listing: ${message}. Please retry.`);
                  // Save locally so form data isn't lost, but do NOT show success screen
                  addMerchant(merchant);
                  saveMerchantsToStorage();
                  // Do NOT call setStep("complete") — keep user on review to retry
                } finally {
                  setSubmitting(false);
                }
              }}
              className="sovereign-btn !py-2 text-sm"
            >
              {submitting ? (
                <div
                  aria-hidden="true"
                  className="w-3.5 h-3.5 border-2 border-sovereign-black/30 border-t-sovereign-black rounded-full animate-spin"
                />
              ) : null}
              List Business
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" aria-hidden="true" />
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
              <QrCode className="w-4 h-4 text-btc-orange" aria-hidden="true" />
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
                aria-label={copied ? "Copied!" : "Copy payment URI"}
                className="p-1.5 rounded bg-sovereign-panel hover:bg-sovereign-border transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sovereign-muted" aria-hidden="true" />
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

          <div className="flex gap-3 justify-center">
            <button
              className="sovereign-btn-outline !py-2 text-sm"
              onClick={resetForm}
            >
              Create Another Listing
            </button>
            <button onClick={onCancel} className="sovereign-btn !py-2 text-sm">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Numo NFC Integration (Phase 3.6) ----

/** NFC card provisioning status */
export type NFCCardStatus = "unprovisioned" | "provisioning" | "active" | "disabled";

/** Numo NFC card configuration */
export interface NumoNFCConfig {
  /** Card ID (from Numo) */
  cardId: string;
  /** Merchant this card is linked to */
  merchantId: string;
  /** Mint URL for tap-to-pay */
  mintUrl: string;
  /** Default payment amount (0 = variable) */
  defaultAmountSats: number;
  /** Card status */
  status: NFCCardStatus;
  /** Last tap timestamp */
  lastTapAt?: number;
  /** Total taps processed */
  totalTaps: number;
  /** Total sats received via NFC */
  totalSatsReceived: number;
}

/** Tap-to-pay event */
export interface NFCTapEvent {
  /** Event ID */
  id: string;
  /** Card ID */
  cardId: string;
  /** Merchant ID */
  merchantId: string;
  /** Amount paid in sats */
  amountSats: number;
  /** Payment method used */
  paymentMethod: "cashu" | "lightning";
  /** Whether the payment succeeded */
  success: boolean;
  /** Timestamp */
  timestamp: number;
}

/**
 * Generate Numo NFC card provisioning config.
 * Used to set up a merchant's NFC tap-to-pay card.
 */
export function generateNumoCardConfig(
  merchantId: string,
  merchantName: string,
  mintUrl: string,
  defaultAmountSats: number = 0
): NumoNFCConfig {
  return {
    cardId: `nfc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    merchantId,
    mintUrl,
    defaultAmountSats,
    status: "unprovisioned",
    totalTaps: 0,
    totalSatsReceived: 0,
  };
}

/**
 * Generate the NFC NDEF payload for a Numo card.
 * The NDEF record contains a cashu: URI that the customer's
 * wallet reads when they tap the card.
 */
export function generateNFCPayload(
  config: NumoNFCConfig,
  amountSats?: number
): string {
  const amount = amountSats || config.defaultAmountSats;
  if (amount > 0) {
    return `cashu://pay?mint=${encodeURIComponent(config.mintUrl)}&amount=${amount}&merchant=${config.merchantId}`;
  }
  // Variable amount — wallet prompts user
  return `cashu://pay?mint=${encodeURIComponent(config.mintUrl)}&merchant=${config.merchantId}`;
}

/** Numo NFC card setup component for merchant onboarding */
export function NumoNFCSetup({
  merchantId,
  merchantName,
  mintUrl,
  onSetup,
}: {
  merchantId: string;
  merchantName: string;
  mintUrl: string;
  onSetup: (config: NumoNFCConfig) => void;
}) {
  const [defaultAmount, setDefaultAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "provisioning" | "done">("idle");

  // Detect Web NFC API support (Chrome on Android only)
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;

  if (!nfcSupported) {
    return (
      <div className="sovereign-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
          <span className="text-sm font-bold text-sovereign-muted">
            Numo NFC Card Setup
          </span>
        </div>
        <p className="text-xs text-sovereign-muted">
          NFC provisioning requires Chrome on Android. Use the QR code above to accept payments on this device.
        </p>
      </div>
    );
  }

  const handleProvision = () => {
    setStatus("provisioning");
    const config = generateNumoCardConfig(
      merchantId,
      merchantName,
      mintUrl,
      defaultAmount ? parseInt(defaultAmount, 10) : 0
    );
    // TODO: Real NFC provisioning requires Web NFC API (navigator.nfc.write)
    // and Numo NFC card backend integration. Currently queues card setup
    // for manual fulfillment.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
    onSetup(config);
    setStatus("done");
  };

  return (
    <div className="rounded-lg border border-sovereign-border bg-sovereign-dark p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-4 h-4 text-btc-orange" aria-hidden="true" />
        <span className="text-sm font-bold text-sovereign-white">
          Numo NFC Card Setup
        </span>
      </div>

      {status === "idle" && (
        <div className="space-y-3">
          <p className="text-xs text-sovereign-muted">
            Set up a Numo NFC card for tap-to-pay with Cashu ecash.
            Customers tap their phone on your card to pay instantly.
          </p>
          <div>
            <label htmlFor="nfc-default-amount" className="sovereign-label">
              Default Amount (sats, 0 = variable)
            </label>
            <input
              id="nfc-default-amount"
              type="number"
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="sovereign-input text-sm"
            />
          </div>
          <button onClick={handleProvision} className="sovereign-btn w-full !py-2 text-sm">
            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
            Provision NFC Card
          </button>
        </div>
      )}

      {status === "provisioning" && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-4 h-4 border-2 border-btc-orange border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <span className="text-sm text-sovereign-muted">Provisioning card...</span>
        </div>
      )}

      {status === "done" && (
        <div className="text-center py-2">
          <CheckCircle className="w-6 h-6 text-btc-orange mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-btc-orange font-medium">Card setup queued</p>
          <p className="text-xs text-sovereign-muted mt-1">
            Numo will contact you to complete NFC card provisioning.
            In the meantime, use the QR code above for payments.
          </p>
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
          aria-hidden="true"
          className={`w-2.5 h-2.5 rounded-full mt-1 ${
            merchant.active ? "bg-green-400" : "bg-sovereign-muted"
          }`}
        />
      </div>
      <p className="text-sm text-sovereign-muted mb-3 leading-relaxed">
        {merchant.description}
      </p>
      <div className="flex items-center gap-2 text-xs text-sovereign-muted mb-2">
        <MapPin className="w-3 h-3" aria-hidden="true" />
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
