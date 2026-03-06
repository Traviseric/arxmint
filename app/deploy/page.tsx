"use client";

// ============================================================
// ArxMint — Merchant Deploy Wizard
// 3-question flow → downloadable .env.merchant + docker-compose.yml
// ============================================================

import { useState, useRef } from "react";
import {
  Store,
  Zap,
  Globe,
  Copy,
  Download,
  Check,
  ArrowRight,
  ArrowLeft,
  Terminal,
  FileText,
} from "lucide-react";
import {
  generateMerchantEnv,
  generateMerchantCompose,
  type PaymentMethod,
} from "@/lib/generate-merchant-config";

type Step = 1 | 2 | 3 | "result";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; desc: string }[] = [
  { value: "lightning", label: "Lightning only", desc: "Fastest settlement. Recommended for most merchants." },
  { value: "both", label: "Lightning + Cashu", desc: "Lightning payments + private ecash. Best privacy default." },
];

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CodeBlock({ label, content, filename }: { label: string; content: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-btc-orange" />
          <span className="text-xs font-mono text-sovereign-muted">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-sovereign-muted hover:text-sovereign-text hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => downloadFile(filename, content)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-sovereign-muted hover:text-sovereign-text hover:bg-white/10 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-sovereign-text overflow-x-auto whitespace-pre leading-relaxed max-h-64 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

export default function DeployPage() {
  const [step, setStep] = useState<Step>(1);
  const [merchantName, setMerchantName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("both");
  const [domain, setDomain] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const nameError = step !== 1 && !merchantName.trim();

  const slug = merchantName.trim()
    ? merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "your-store";
  const resolvedDomain = domain.trim() || `${slug}.arxmint.com`;

  const envContent = generateMerchantEnv(merchantName || "My Bitcoin Store", [paymentMethod], domain);
  const composeContent = generateMerchantCompose(merchantName || "My Bitcoin Store", [paymentMethod], domain);

  const steps = [
    { n: 1, label: "Business Name" },
    { n: 2, label: "Payments" },
    { n: 3, label: "Domain" },
  ];

  return (
    <div className="min-h-screen bg-sovereign-dark text-sovereign-text">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-20">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 bg-white/5 mb-6">
            <Terminal className="w-4 h-4 text-btc-orange" />
            <span className="text-xs font-mono text-sovereign-muted uppercase tracking-widest">
              Deploy Wizard
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            Go live in{" "}
            <span className="text-btc-orange">15 minutes</span>
          </h1>
          <p className="text-sovereign-muted text-sm max-w-md mx-auto">
            Answer 3 questions. Download your config. Run one Docker command.
          </p>
        </div>

        {/* Step indicator */}
        {step !== "result" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step === s.n
                      ? "bg-btc-orange text-white"
                      : (step as number) > s.n
                        ? "bg-btc-orange/20 text-btc-orange border border-btc-orange/30"
                        : "bg-white/10 text-sovereign-muted"
                  }`}
                >
                  {(step as number) > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span className={`text-xs hidden sm:block ${step === s.n ? "text-sovereign-text" : "text-sovereign-muted"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className="w-8 h-px bg-white/10" />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="sovereign-card p-6 sm:p-8">

          {/* Step 1 — Business Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-5 h-5 text-btc-orange" />
                  <h2 className="text-lg font-semibold">What is your business name?</h2>
                </div>
                <p className="text-sm text-sovereign-muted">Used to name your containers and checkout URL.</p>
              </div>
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && merchantName.trim() && setStep(2)}
                  placeholder="e.g. The Ice Cream Parlor"
                  className="sovereign-input w-full text-base"
                  maxLength={60}
                  autoFocus
                />
                {merchantName.trim() && (
                  <p className="text-xs text-sovereign-muted mt-2">
                    Slug: <span className="font-mono text-btc-orange">{slug}</span>
                  </p>
                )}
                {nameError && (
                  <p className="text-xs text-red-400 mt-1">Business name is required.</p>
                )}
              </div>
              <button
                onClick={() => merchantName.trim() ? setStep(2) : nameInputRef.current?.focus()}
                className="sovereign-btn w-full flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2 — Payment Methods */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-btc-orange" />
                  <h2 className="text-lg font-semibold">What payment methods?</h2>
                </div>
                <p className="text-sm text-sovereign-muted">You can change this later in your config.</p>
              </div>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      paymentMethod === opt.value
                        ? "border-btc-orange bg-btc-orange/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        paymentMethod === opt.value ? "border-btc-orange bg-btc-orange" : "border-white/30"
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-sovereign-text">{opt.label}</div>
                        <div className="text-xs text-sovereign-muted mt-0.5">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="sovereign-btn-outline flex items-center gap-2 px-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="sovereign-btn flex-1 flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Domain */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-btc-orange" />
                  <h2 className="text-lg font-semibold">Your domain or subdomain</h2>
                </div>
                <p className="text-sm text-sovereign-muted">
                  Leave blank to use a suggested ArxMint subdomain.
                </p>
              </div>
              <div>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setStep("result")}
                  placeholder={`${slug}.arxmint.com`}
                  className="sovereign-input w-full"
                />
                <p className="text-xs text-sovereign-muted mt-2">
                  Checkout will be at:{" "}
                  <span className="font-mono text-btc-orange">https://{resolvedDomain}/pay/{slug}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="sovereign-btn-outline flex items-center gap-2 px-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep("result")}
                  className="sovereign-btn flex-1 flex items-center justify-center gap-2"
                >
                  Generate Config
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Result Screen */}
          {step === "result" && (
            <div className="space-y-6">
              <div className="text-center pb-2 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-btc-orange/10 border border-btc-orange/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-btc-orange" />
                </div>
                <h2 className="text-lg font-semibold">Config generated</h2>
                <p className="text-sm text-sovereign-muted mt-1">
                  Download both files and run one command.
                </p>
              </div>

              <CodeBlock
                label=".env.merchant"
                content={envContent}
                filename=".env.merchant"
              />

              <CodeBlock
                label="docker-compose.merchant.yml"
                content={composeContent}
                filename="docker-compose.merchant.yml"
              />

              {/* Next steps */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-sovereign-text">Next steps</p>
                <ol className="text-sm text-sovereign-muted space-y-1.5 list-decimal list-inside">
                  <li>Save both files to the same folder on your server.</li>
                  <li>
                    Fill in the{" "}
                    <span className="font-mono text-sovereign-text text-xs">{"<run: openssl rand ...>"}</span>{" "}
                    placeholders with real secrets:{" "}
                    <span className="font-mono text-btc-orange text-xs">openssl rand -hex 32</span>
                  </li>
                  <li>
                    Run:{" "}
                    <span className="font-mono text-btc-orange text-xs">
                      docker compose -f docker-compose.merchant.yml up -d
                    </span>
                  </li>
                  <li>
                    Create your LND wallet:{" "}
                    <span className="font-mono text-btc-orange text-xs">
                      docker exec {slug}-lnd lncli create
                    </span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="sovereign-btn-outline flex items-center gap-2 px-4 text-sm"
                >
                  Start over
                </button>
                <button
                  onClick={() => {
                    downloadFile(".env.merchant", envContent);
                    downloadFile("docker-compose.merchant.yml", composeContent);
                  }}
                  className="sovereign-btn flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Both Files
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
