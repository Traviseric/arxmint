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
} from "lucide-react";
import { generateDeployment, generateApertureConfig } from "@/lib/community-generator";
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

  const setDeployment = useSovereignStore((s) => s.setDeployment);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    // Small delay for UX feel
    await new Promise((r) => setTimeout(r, 600));

    const result = generateDeployment(prompt, network);
    setLocalDeployment(result);
    setDeployment(result);
    setGenerating(false);
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
        <label className="sovereign-label">
          Describe your sovereign community
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data..."
          className="sovereign-input min-h-[140px] resize-y font-mono text-sm"
          rows={5}
        />

        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-xs px-3 py-1.5 rounded-full border border-sovereign-border
                         text-sovereign-muted hover:text-btc-orange hover:border-btc-orange/30
                         transition-all duration-200 truncate max-w-[280px]"
            >
              {ex.slice(0, 60)}...
            </button>
          ))}
        </div>
      </div>

      {/* Network selector */}
      <div className="flex items-center gap-4">
        <label className="sovereign-label !mb-0">Network:</label>
        <div className="flex gap-2">
          {(["testnet", "signet", "regtest", "bitcoin"] as const).map((n) => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                network === n
                  ? "bg-btc-orange text-sovereign-black"
                  : "border border-sovereign-border text-sovereign-muted hover:border-btc-orange/30"
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
        className="sovereign-btn w-full text-lg !py-4"
      >
        {generating ? (
          <>
            <div className="w-5 h-5 border-2 border-sovereign-black/30 border-t-sovereign-black rounded-full animate-spin" />
            Forging your sovereign community...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Forge Community
          </>
        )}
      </button>

      {/* Generated Output */}
      {deployment && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="glow-line" />

          {/* Summary Card */}
          <div className="sovereign-card !border-btc-orange/30">
            <h3 className="text-lg font-bold text-sovereign-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-btc-orange" />
              {deployment.community.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-sovereign-muted">Backend</div>
                <div className="text-sovereign-white font-medium capitalize">
                  {deployment.community.mintBackend}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Members</div>
                <div className="text-sovereign-white font-medium">
                  {deployment.community.memberCount}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Guardians</div>
                <div className="text-sovereign-white font-medium">
                  {deployment.community.guardianCount}
                </div>
              </div>
              <div>
                <div className="text-sovereign-muted">Network</div>
                <div className="text-sovereign-white font-medium uppercase">
                  {deployment.community.network}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-4 flex flex-wrap gap-2">
              {deployment.community.features.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-full bg-btc-orange/10 text-btc-orange text-xs"
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
                    className={`px-2 py-1 rounded ${
                      val
                        ? "bg-green-500/10 text-green-400"
                        : "bg-sovereign-dark text-sovereign-muted"
                    }`}
                  >
                    {key}: {val ? "ON" : "OFF"}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Docker Compose */}
          <CollapsibleSection
            title="Docker Compose"
            icon={<Globe className="w-4 h-4" />}
            id="docker"
            expanded={expandedSection}
            onToggle={setExpandedSection}
          >
            <div className="relative">
              <pre className="bg-sovereign-dark rounded-lg p-4 text-xs text-sovereign-text overflow-x-auto max-h-[500px]">
                {deployment.dockerCompose}
              </pre>
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => copyToClipboard(deployment.dockerCompose, "docker")}
                  className="p-2 rounded-lg bg-sovereign-panel hover:bg-sovereign-border transition-colors"
                  title="Copy"
                >
                  {copied === "docker" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-sovereign-muted" />
                  )}
                </button>
                <button
                  onClick={() =>
                    downloadFile(deployment.dockerCompose, "docker-compose.yml")
                  }
                  className="p-2 rounded-lg bg-sovereign-panel hover:bg-sovereign-border transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-sovereign-muted" />
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
                <pre className="bg-sovereign-dark rounded-lg p-4 text-xs text-sovereign-text overflow-x-auto max-h-[400px]">
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
                    className="p-2 rounded-lg bg-sovereign-panel hover:bg-sovereign-border transition-colors"
                  >
                    {copied === "aperture" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-sovereign-muted" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        generateApertureConfig(deployment.community),
                        "aperture.yml"
                      )
                    }
                    className="p-2 rounded-lg bg-sovereign-panel hover:bg-sovereign-border transition-colors"
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
                  <div
                    key={ep.path}
                    className="flex items-center justify-between bg-sovereign-dark rounded-lg px-4 py-3"
                  >
                    <div>
                      <code className="text-btc-orange text-sm">{ep.path}</code>
                      <p className="text-xs text-sovereign-muted mt-1">
                        {ep.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-sovereign-white">
                        {ep.priceSats} sats
                      </div>
                      {ep.agentOnly && (
                        <span className="text-xs text-btc-orange">agent-only</span>
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
              <pre className="bg-sovereign-dark rounded-lg p-4 text-xs text-sovereign-text whitespace-pre-wrap">
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
    <div className="sovereign-card !p-0 overflow-hidden">
      <button
        onClick={() => onToggle(isOpen ? null : id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-sovereign-dark/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sovereign-white font-medium">
          <span className="text-btc-orange">{icon}</span>
          {title}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-sovereign-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-sovereign-muted" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
