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
    } catch (err: any) {
      setGenerateError(err.message);
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
        <label className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono">
          Describe your sovereign community
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data..."
          className="w-full bg-bg-elevated border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-[300ms] shadow-inner min-h-[140px] resize-y font-mono text-sm"
          rows={5}
        />

        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-xs px-3 py-1.5 rounded-full border border-border-border-default
                         text-text-text-secondary hover:text-accent hover:border-accent/30
                         transition-all duration-200 truncate max-w-[280px]"
            >
              {ex.slice(0, 60)}...
            </button>
          ))}
        </div>
      </div>

      {/* Network selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <label className="block text-[13px] font-medium text-text-primary mb-2 tracking-wide uppercase font-mono !mb-0">Network:</label>
        <div className="flex flex-wrap gap-2">
          {(["testnet", "signet", "regtest", "bitcoin"] as const).map((n) => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${network === n
                  ? "bg-accent text-bg-base"
                  : "border border-border-border-default text-text-text-secondary hover:border-accent/30"
                }`}
            >
              {n === "bitcoin" ? "MAINNET" : n.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        className="antigravity-btn w-full text-lg !py-4"
      >
        {generating ? (
          <>
            <div className="w-5 h-5 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" />
            Forging your sovereign community...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Forge Community
          </>
        )}
      </button>

      {/* Error state */}
      {generateError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {generateError}
        </div>
      )}

      {/* Generated Output */}
      {deployment && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* Summary Card */}
          <div className="glass glow-card border border-border-default rounded-xl p-6 !border-accent/30">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              {deployment.community.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-text-text-secondary">Backend</div>
                <div className="text-text-primary font-medium capitalize">
                  {deployment.community.mintBackend}
                </div>
              </div>
              <div>
                <div className="text-text-text-secondary">Members</div>
                <div className="text-text-primary font-medium">
                  {deployment.community.memberCount}
                </div>
              </div>
              <div>
                <div className="text-text-text-secondary">Guardians</div>
                <div className="text-text-primary font-medium">
                  {deployment.community.guardianCount}
                </div>
              </div>
              <div>
                <div className="text-text-text-secondary">Network</div>
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
                        : "bg-bg-bg-elevated/50 text-text-text-secondary"
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
              <pre className="bg-bg-bg-elevated/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[500px]">
                {deployment.dockerCompose}
              </pre>
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => copyToClipboard(deployment.dockerCompose, "docker")}
                  className="p-2 rounded-lg bg-bg-bg-surface hover:bg-bg-elevated hover:bg-border-border-default transition-colors"
                  title="Copy"
                >
                  {copied === "docker" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-text-text-secondary" />
                  )}
                </button>
                <button
                  onClick={() =>
                    downloadFile(deployment.dockerCompose, "docker-compose.yml")
                  }
                  className="p-2 rounded-lg bg-bg-bg-surface hover:bg-bg-elevated hover:bg-border-border-default transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-text-text-secondary" />
                </button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Aperture Config (if agents enabled) */}
          {deployment.community.agents.enabled && (
            <CollapsibleSection
              title="Aperture L402 Config"
              icon={<Cpu className="w-4 h-4" />}
              id="aperture"
              expanded={expandedSection}
              onToggle={setExpandedSection}
            >
              <div className="relative">
                <pre className="bg-bg-bg-elevated/50 rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-[400px]">
                  {generateApertureConfig(deployment.community)}
                </pre>
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        generateApertureConfig(deployment.community),
                        "aperture"
                      )
                    }
                    className="p-2 rounded-lg bg-bg-bg-surface hover:bg-bg-elevated hover:bg-border-border-default transition-colors"
                  >
                    {copied === "aperture" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-text-text-secondary" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        generateApertureConfig(deployment.community),
                        "aperture.yml"
                      )
                    }
                    className="p-2 rounded-lg bg-bg-bg-surface hover:bg-bg-elevated hover:bg-border-border-default transition-colors"
                  >
                    <Download className="w-4 h-4 text-text-text-secondary" />
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
                  <div
                    key={ep.path}
                    className="flex items-center justify-between bg-bg-bg-elevated/50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <code className="text-accent text-sm">{ep.path}</code>
                      <p className="text-xs text-text-text-secondary mt-1">
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
            icon={<Shield className="w-4 h-4" />}
            id="instructions"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="bg-bg-bg-elevated/50 rounded-lg p-4 text-xs text-text-secondary whitespace-pre-wrap">
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

  return (
    <div className="glass glow-card border border-border-default rounded-xl p-6 !p-0 overflow-hidden">
      <button
        onClick={() => onToggle(isOpen ? null : id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-bg-elevated/50/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-text-secondary" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
