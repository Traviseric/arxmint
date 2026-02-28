"use client";

// ============================================================
// ArxMint — Create Community Form
// Prompt-driven community generation
// ============================================================

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
} from "lucide-react";
import { generateApertureConfig } from "@/lib/community-generator";
import type { DeploymentConfig } from "@/lib/types";
import { useSovereignStore } from "@/lib/store";

const EXAMPLE_PROMPTS = [
  "Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data.",
  "Set up a maximum privacy Fedimint federation for 50 cypherpunks with L402 paywalls and cycle alerts.",
  "Build a lightweight Cashu mint for 10 people with agent marketplace and merchant directory.",
  "Launch a sovereign circular economy for our Colorado Bitcoin meetup — chat, privacy dashboard, and AI agent compute marketplace.",
];

export function CreateCommunityForm() {
  const [prompt, setPrompt] = useState("");
  const [network, setNetwork] = useState<"testnet" | "signet" | "regtest" | "bitcoin">("testnet");
  const [deployment, setLocalDeployment] = useState<DeploymentConfig | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("docker");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const setDeployment = useSovereignStore((s) => s.setDeployment);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    setSavedId(null);
    setGenerationDone(false);

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, network }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate community");
      }
      setLocalDeployment(data.deployment);
      setDeployment(data.deployment);
      if (data.id) setSavedId(data.id);
      setGenerationDone(true);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Prompt Input */}
      <div>
        {/* Fix 057-1: htmlFor + id link label to textarea; visible required indicator */}
        <label htmlFor="prompt-textarea" className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono">
          Describe your sovereign community{" "}
          <span aria-hidden="true" className="text-btc-orange">*</span>
          <span className="sr-only">(required)</span>
        </label>
        {/* Fix 057-5: aria-required on textarea (covered with id + aria-required) */}
        <textarea
          id="prompt-textarea"
          aria-required="true"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data..."
          className="w-full bg-bg-elevated border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-[300ms] shadow-inner min-h-[140px] resize-y font-mono text-sm"
          rows={5}
        />

        {/* Example prompts — task 135: aria-pressed + active state */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            /* Fix 057-2: aria-label describes purpose to screen readers */
            /* Fix 135: aria-pressed + active visual state for selected prompt */
            <button
              key={i}
              aria-label={`Use example prompt: ${ex}`}
              aria-pressed={prompt === ex}
              onClick={() => setPrompt(ex)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 truncate max-w-[280px] min-h-[44px] ${
                prompt === ex
                  ? "border-btc-orange bg-btc-orange/10 text-btc-orange"
                  : "border-white/10 text-sovereign-muted hover:text-sovereign-text hover:border-white/20"
              }`}
            >
              {ex.slice(0, 60)}...
            </button>
          ))}
        </div>
      </div>

      {/* Fix 057-3: Network selector with radiogroup semantics */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <span id="network-group-label" className="block text-[13px] font-medium text-text-primary tracking-wide uppercase font-mono">Network:</span>
        <div role="radiogroup" aria-labelledby="network-group-label" className="flex flex-wrap gap-2">
          {(["testnet", "signet", "regtest", "bitcoin"] as const).map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={network === n}
              onClick={() => setNetwork(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[44px] ${network === n
                  ? "bg-accent text-bg-base"
                  : "border border-white/10 text-sovereign-muted hover:border-accent/30"
                }`}
            >
              {n === "bitcoin" ? "MAINNET" : n.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Fix 062-1: aria-live region announces generation status to screen readers */}
      <span aria-live="polite" className="sr-only">
        {generating
          ? "Generating economy configuration..."
          : generationDone
          ? "Economy configuration ready."
          : ""}
      </span>

      {/* Fix 062-1: aria-busy on generate button; Fix 062-6: min-h for 44px touch target */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        aria-busy={generating}
        className="antigravity-btn w-full text-lg !py-4 min-h-[44px]"
      >
        {generating ? (
          <>
            <div className="w-5 h-5 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" aria-hidden="true" />
            Forging your sovereign community...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" aria-hidden="true" />
            Forge Community
          </>
        )}
      </button>

      {/* Fix 062-3: role="alert" so dynamic error is announced by screen readers */}
      {/* Fix 120: Retry button lets user re-submit without clearing form state */}
      {generateError && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>{generateError}</span>
            <button
              onClick={handleGenerate}
              className="sovereign-btn-outline text-xs px-3 py-1 shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Generated Output */}
      {deployment && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* Summary Card */}
          <div className="glass glow-card border border-border-default rounded-xl p-6 !border-accent/30">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" aria-hidden="true" />
              {deployment.community.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-sovereign-muted">Backend</div>
                <div className="text-text-primary font-medium capitalize">
                  {deployment.community.mintBackend}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Members</div>
                <div className="text-text-primary font-medium">
                  {deployment.community.memberCount}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Guardians</div>
                <div className="text-text-primary font-medium">
                  {deployment.community.guardianCount}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Network</div>
                <div className="text-text-primary font-medium uppercase">
                  {deployment.community.network}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-4 flex flex-wrap gap-2">
              {deployment.community.features.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Privacy */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(Object.entries(deployment.community.privacy) as [string, boolean][]).map(
                ([key, val]) => (
                  <div
                    key={key}
                    className={`px-2 py-1 rounded ${val
                        ? "bg-green-500/10 text-green-400"
                        : "bg-sovereign-panel/50 text-sovereign-muted"
                      }`}
                  >
                    {key}: {val ? "ON" : "OFF"}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Dashboard link (only shown when persisted to DB) */}
          {savedId && (
            <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
              <span className="text-sm text-text-primary">
                Community saved — view it in your dashboard
              </span>
              <a
                href={`/community/${savedId}`}
                className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Open <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Docker Compose */}
          <CollapsibleSection
            title="Docker Compose"
            icon={<Globe className="w-4 h-4" aria-hidden="true" />}
            id="docker"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <div className="relative">
              <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[500px]">
                {deployment.dockerCompose}
              </pre>
              <div className="absolute top-2 right-2 flex gap-2 items-center">
                {/* Fix 057-4: aria-label on icon-only copy button; Fix 062-4: aria-live for copy feedback */}
                <span aria-live="polite" className="sr-only">
                  {copied === "docker" ? "Copied to clipboard" : ""}
                </span>
                <button
                  aria-label="Copy docker-compose to clipboard"
                  onClick={() => copyToClipboard(deployment.dockerCompose, "docker")}
                  className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  title="Copy"
                >
                  {copied === "docker" ? (
                    <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
                  )}
                </button>
                {/* Fix 057-4: aria-label on icon-only download button */}
                <button
                  aria-label="Download docker-compose.yml"
                  onClick={() =>
                    downloadFile(deployment.dockerCompose, "docker-compose.yml")
                  }
                  className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
                </button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Aperture Config (if agents enabled) */}
          {deployment.community.agents.enabled && (
            <CollapsibleSection
              title="Aperture L402 Config"
              icon={<Cpu className="w-4 h-4" aria-hidden="true" />}
              id="aperture"
              expanded={expandedSection}
              onToggle={setExpandedSection}
            >
              <div className="relative">
                <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[400px]">
                  {generateApertureConfig(deployment.community)}
                </pre>
                <div className="absolute top-2 right-2 flex gap-2 items-center">
                  <span aria-live="polite" className="sr-only">
                    {copied === "aperture" ? "Copied to clipboard" : ""}
                  </span>
                  <button
                    aria-label="Copy Aperture config to clipboard"
                    onClick={() =>
                      copyToClipboard(
                        generateApertureConfig(deployment.community),
                        "aperture"
                      )
                    }
                    className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  >
                    {copied === "aperture" ? (
                      <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    aria-label="Download aperture.yml"
                    onClick={() =>
                      downloadFile(
                        generateApertureConfig(deployment.community),
                        "aperture.yml"
                      )
                    }
                    className="p-2 rounded-lg bg-sovereign-dark hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <Download className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* L402 Endpoints */}
          {deployment.l402Endpoints.length > 0 && (
            <CollapsibleSection
              title="L402 Agent Endpoints"
              icon={<Zap className="w-4 h-4" aria-hidden="true" />}
              id="l402"
              expanded={expandedSection}
              onToggle={setExpandedSection}
            >
              <div className="space-y-2">
                {deployment.l402Endpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="flex items-center justify-between bg-sovereign-panel/50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <code className="text-accent text-sm">{ep.path}</code>
                      <p className="text-xs text-sovereign-muted mt-1">
                        {ep.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {ep.priceSats} sats
                      </div>
                      {ep.agentOnly && (
                        <span className="text-xs text-accent">agent-only</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Setup Instructions */}
          <CollapsibleSection
            title="Setup Instructions"
            icon={<Shield className="w-4 h-4" aria-hidden="true" />}
            id="instructions"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="bg-sovereign-panel/50 rounded-lg p-4 text-xs text-text-secondary whitespace-pre-wrap">
                {deployment.instructions.join("\n")}
              </pre>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

// ---- Collapsible Section Component ----

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
  // Fix 062-2: stable content id for aria-controls
  const contentId = `${id}-content`;

  return (
    <div className="glass glow-card border border-border-default rounded-xl p-6 !p-0 overflow-hidden">
      {/* Fix 062-2: aria-expanded + aria-controls on toggle button; Fix 062-6: min-h touch target */}
      <button
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => onToggle(isOpen ? null : id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-sovereign-panel/50 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <span className="text-accent" aria-hidden="true">{icon}</span>
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
        )}
      </button>
      {isOpen && <div id={contentId} className="px-6 pb-6">{children}</div>}
    </div>
  );
}
