"use client";

import { useState } from "react";
import {
  Zap,
  Shield,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  ExternalLink,
  Store,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { generateApertureConfig } from "@/lib/community-generator";
import type { DeploymentConfig } from "@/lib/types";
import { useSovereignStore } from "@/lib/store";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Business Info",
  2: "Payment Methods",
  3: "Review & Deploy",
};

interface PaymentOption {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "lightning",
    label: "Lightning",
    description: "Instant payments via Lightning Network. QR code at the register, sats in your wallet in seconds.",
    defaultOn: true,
  },
  {
    id: "ecash",
    label: "Ecash (Cashu)",
    description: "Private ecash tokens backed by Bitcoin. Customers tap to pay — blinded, instant, final.",
    defaultOn: true,
  },
  {
    id: "onchain",
    label: "On-chain",
    description: "Standard Bitcoin transactions for larger payments. Silent Payment addresses for privacy.",
    defaultOn: false,
  },
];

export function MerchantSetupWizard() {
  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [storeName, setStoreName] = useState("");
  const [domain, setDomain] = useState("");
  const [network, setNetwork] = useState<"testnet" | "signet" | "bitcoin">("testnet");

  // Step 2 fields
  const [payments, setPayments] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PAYMENT_OPTIONS.map((p) => [p.id, p.defaultOn]))
  );

  // Generation state
  const [deployment, setLocalDeployment] = useState<DeploymentConfig | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("docker");

  const setDeployment = useSovereignStore((s) => s.setDeployment);

  const hasAnyPayment = Object.values(payments).some(Boolean);
  const canProceedStep1 = storeName.trim().length > 0;
  const canProceedStep2 = hasAnyPayment;

  function buildPrompt(): string {
    const methods: string[] = [];
    if (payments.lightning) methods.push("Lightning");
    if (payments.ecash) methods.push("Cashu ecash");
    if (payments.onchain) methods.push("on-chain Bitcoin with Silent Payments");

    const parts = [
      `Set up a merchant payment node for "${storeName.trim()}"`,
      `accepting ${methods.join(", ")}`,
    ];
    if (domain.trim()) parts.push(`on domain ${domain.trim()}`);
    parts.push("with merchant directory and privacy dashboard");
    return parts.join(" ") + ".";
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(), network }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate deployment");
      setLocalDeployment(data.deployment);
      setDeployment(data.deployment);
      if (data.id) setSavedId(data.id);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function togglePayment(id: string) {
    setPayments((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s < step) setStep(s);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                s === step
                  ? "bg-accent text-bg-base"
                  : s < step
                  ? "bg-accent/20 text-accent border border-accent/30 cursor-pointer hover:bg-accent/30"
                  : "bg-bg-surface border border-border-default text-text-muted"
              }`}
            >
              {s < step ? <Check className="w-3.5 h-3.5" /> : s}
            </button>
            <span
              className={`text-xs font-mono hidden sm:block ${
                s === step ? "text-text-primary" : "text-text-muted"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {s < 3 && <div className={`w-8 sm:w-12 h-px ${s < step ? "bg-accent/40" : "bg-border-default"}`} />}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Business Info ===== */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <label htmlFor="store-name" className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono">
              Store Name{" "}
              <span className="text-accent" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="store-name"
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Longmont Coffee Co"
              className="w-full bg-bg-elevated border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="domain" className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono">
              Domain <span className="text-text-muted font-normal normal-case">(optional)</span>
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="pay.longmontcoffee.com"
              className="w-full bg-bg-elevated border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono text-sm"
            />
            <p className="text-xs text-text-muted mt-1.5">
              Your hosted checkout page. Auto-HTTPS included. Leave blank to configure later.
            </p>
          </div>

          <div>
            <span id="network-label" className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono">
              Network
            </span>
            <div role="radiogroup" aria-labelledby="network-label" className="flex gap-2">
              {(["testnet", "signet", "bitcoin"] as const).map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={network === n}
                  onClick={() => setNetwork(n)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                    network === n
                      ? "bg-accent text-bg-base"
                      : "border border-border-default text-text-muted hover:border-accent/30"
                  }`}
                >
                  {n === "bitcoin" ? "MAINNET" : n.toUpperCase()}
                </button>
              ))}
            </div>
            {network === "bitcoin" && (
              <p className="text-xs text-yellow-400/80 mt-2 font-mono">
                Real sats. Make sure you know what you&apos;re doing.
              </p>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="antigravity-btn w-full !py-3"
          >
            Next: Payment Methods
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}

      {/* ===== STEP 2: Payment Methods ===== */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <p className="text-sm text-text-secondary">
            Choose how <span className="text-text-primary font-medium">{storeName}</span> accepts Bitcoin.
          </p>

          <div className="space-y-3">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => togglePayment(opt.id)}
                className={`w-full text-left rounded-xl border p-5 transition-all ${
                  payments[opt.id]
                    ? "border-accent/40 bg-accent/5 ring-1 ring-accent/10"
                    : "border-border-default bg-bg-elevated hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-text-primary">{opt.label}</span>
                  <div
                    className={`w-10 h-6 rounded-full flex items-center px-1 transition-all ${
                      payments[opt.id] ? "bg-accent justify-end" : "bg-bg-surface border border-border-default justify-start"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-all ${payments[opt.id] ? "bg-bg-base" : "bg-text-muted"}`} />
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{opt.description}</p>
              </button>
            ))}
          </div>

          {!hasAnyPayment && (
            <p className="text-xs text-red-400 font-mono">Select at least one payment method.</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="antigravity-btn-outline !py-3 flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="antigravity-btn !py-3 flex-[2]"
            >
              Review & Deploy
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Review & Deploy ===== */}
      {step === 3 && !deployment && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Card */}
          <div className="glass border border-border-default rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-accent" />
              {storeName}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-text-muted font-mono text-xs uppercase">Network</div>
                <div className="text-text-primary font-medium font-mono">
                  {network === "bitcoin" ? "MAINNET" : network.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-text-muted font-mono text-xs uppercase">Domain</div>
                <div className="text-text-primary font-medium font-mono">
                  {domain.trim() || "—"}
                </div>
              </div>
              <div>
                <div className="text-text-muted font-mono text-xs uppercase">Payments</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {PAYMENT_OPTIONS.filter((o) => payments[o.id]).map((o) => (
                    <span key={o.id} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                      {o.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, label: "LND Lightning Node", desc: "Neutrino light client" },
              { icon: Shield, label: "Cashu Mint", desc: "Private ecash tokens" },
              { icon: Globe, label: "Hosted Checkout", desc: "Auto-HTTPS + QR page" },
            ].map((item) => (
              <div key={item.label} className="bg-bg-elevated border border-border-default rounded-lg p-4 text-center">
                <item.icon className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="text-xs font-semibold text-text-primary">{item.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {generateError && (
            <div role="alert" className="rounded-lg border border-red-500/50 bg-red-900/40 px-4 py-3 text-sm text-red-200">
              <div className="flex items-center justify-between gap-3">
                <span>{generateError}</span>
                <button onClick={handleGenerate} className="sovereign-btn-outline text-xs px-3 py-1 shrink-0">
                  Retry
                </button>
              </div>
            </div>
          )}

          <span aria-live="polite" className="sr-only">
            {generating ? "Generating deployment configuration..." : ""}
          </span>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="antigravity-btn-outline !py-3 flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              aria-busy={generating}
              className="antigravity-btn !py-3 flex-[2] text-lg"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Deploy My Node
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===== OUTPUT: Generated Deployment ===== */}
      {deployment && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* Summary */}
          <div className="glass glow-card border border-border-default rounded-xl p-6 !border-accent/30">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              {deployment.community.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-text-muted">Backend</div>
                <div className="text-text-primary font-medium capitalize">{deployment.community.mintBackend}</div>
              </div>
              <div>
                <div className="text-text-muted">Network</div>
                <div className="text-text-primary font-medium uppercase">{deployment.community.network}</div>
              </div>
              <div>
                <div className="text-text-muted">Mint Fee</div>
                <div className="text-text-primary font-medium">{deployment.community.mintFeePercent}%</div>
              </div>
              <div>
                <div className="text-text-muted">Guardians</div>
                <div className="text-text-primary font-medium">{deployment.community.guardianCount}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {deployment.community.features.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs">{f}</span>
              ))}
            </div>
          </div>

          {/* Dashboard link */}
          {savedId && (
            <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
              <span className="text-sm text-text-primary">Node saved — view in your dashboard</span>
              <a href={`/community/${savedId}`} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                Open <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Docker Compose */}
          <CollapsibleSection
            title="Docker Compose"
            icon={<Globe className="w-4 h-4" />}
            id="docker"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <div className="relative">
              <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[400px]">
                {deployment.dockerCompose}
              </pre>
              <div className="absolute top-2 right-2 flex gap-2">
                <span aria-live="polite" className="sr-only">{copied === "docker" ? "Copied" : ""}</span>
                <button
                  aria-label="Copy docker-compose"
                  onClick={() => copyToClipboard(deployment.dockerCompose, "docker")}
                  className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                >
                  {copied === "docker" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-sovereign-muted" />}
                </button>
                <button
                  aria-label="Download docker-compose.yml"
                  onClick={() => downloadFile(deployment.dockerCompose, "docker-compose.yml")}
                  className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                >
                  <Download className="w-4 h-4 text-sovereign-muted" />
                </button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Aperture Config */}
          {deployment.community.agents.enabled && (
            <CollapsibleSection
              title="Aperture L402 Config"
              icon={<Cpu className="w-4 h-4" />}
              id="aperture"
              expanded={expandedSection}
              onToggle={setExpandedSection}
            >
              <div className="relative">
                <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[400px]">
                  {generateApertureConfig(deployment.community)}
                </pre>
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    aria-label="Copy Aperture config"
                    onClick={() => copyToClipboard(generateApertureConfig(deployment.community), "aperture")}
                    className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  >
                    {copied === "aperture" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-sovereign-muted" />}
                  </button>
                  <button
                    aria-label="Download aperture.yml"
                    onClick={() => downloadFile(generateApertureConfig(deployment.community), "aperture.yml")}
                    className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Download className="w-4 h-4 text-sovereign-muted" />
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* L402 Endpoints */}
          {deployment.l402Endpoints.length > 0 && (
            <CollapsibleSection
              title="L402 Agent Endpoints"
              icon={<Zap className="w-4 h-4" />}
              id="l402"
              expanded={expandedSection}
              onToggle={setExpandedSection}
            >
              <div className="space-y-2">
                {deployment.l402Endpoints.map((ep) => (
                  <div key={ep.path} className="flex items-center justify-between bg-sovereign-panel/50 rounded-lg px-4 py-3">
                    <div>
                      <code className="text-accent text-sm">{ep.path}</code>
                      <p className="text-xs text-sovereign-muted mt-1">{ep.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">{ep.priceSats} sats</div>
                      {ep.agentOnly && <span className="text-xs text-accent">agent-only</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Setup Instructions */}
          <CollapsibleSection
            title="Setup Instructions"
            icon={<Shield className="w-4 h-4" />}
            id="instructions"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary whitespace-pre-wrap">
              {deployment.instructions.join("\n")}
            </pre>
          </CollapsibleSection>

          {/* Start Over */}
          <button
            onClick={() => {
              setLocalDeployment(null);
              setSavedId(null);
              setStep(1);
            }}
            className="antigravity-btn-outline w-full !py-3 text-sm"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

/* ---- Collapsible Section ---- */

function CollapsibleSection({
  title,
  icon,
  id,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  id: string;
  expanded: string | null;
  onToggle: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  const contentId = `${id}-content`;

  return (
    <div className="glass glow-card border border-border-default rounded-xl overflow-hidden">
      <button
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => onToggle(isOpen ? null : id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-sovereign-panel/50 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-sovereign-muted" /> : <ChevronDown className="w-4 h-4 text-sovereign-muted" />}
      </button>
      {isOpen && <div id={contentId} className="px-6 pb-6">{children}</div>}
    </div>
  );
}
