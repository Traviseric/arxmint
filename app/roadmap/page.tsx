import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Shield,
  Wrench,
  Layers,
  Sparkles,
  Castle,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "Roadmap — ArxMint",
  description:
    "Five phases from security hardening to production deployment. Every task traces back to research. See where ArxMint is headed.",
};

const phases = [
  {
    number: 0,
    codename: "Fortify",
    title: "Security Hardening",
    status: "current" as const,
    icon: Shield,
    description:
      "Fix all P0 security issues identified by research. No new features until the foundation is safe.",
    tasks: [
      {
        id: "0.1",
        title: "Cashu keyset ID validation",
        description:
          "Verify keyset IDs against mint pubkeys. Prevent NUT-13 deterministic secret collisions — critical for agent wallets that programmatically accept tokens.",
        status: "pending" as const,
      },
      {
        id: "0.2",
        title: "Fix Silent Payments status",
        description:
          "Show honest per-backend SP availability. SP for Fedimint peg-outs requires a federation module (server-side), not a client toggle.",
        status: "pending" as const,
      },
      {
        id: "0.3",
        title: "Lightning agent security tiers",
        description:
          "WATCH_ONLY → PAY_ONLY → ADMIN tiers. Agents default to WATCH_ONLY. Never give agents admin macaroons.",
        status: "pending" as const,
      },
      {
        id: "0.4",
        title: "Remote signer integration",
        description:
          "Agent processes must never hold signing keys. Route payments through litd remote signer.",
        status: "pending" as const,
      },
    ],
  },
  {
    number: 1,
    codename: "Keystone",
    title: "Core Architecture",
    status: "upcoming" as const,
    icon: Wrench,
    description:
      "Agent commerce, merchant onboarding, spend routing. The critical stone that holds the arch together.",
    tasks: [
      {
        id: "1.1",
        title: "NUT-24 ecash paywalls",
        description:
          "Accept Cashu tokens as payment for agent services alongside L402. Cashu's native HTTP 402.",
        status: "pending" as const,
      },
      {
        id: "1.2",
        title: "Spend router",
        description:
          "Auto-select ecash → Lightning → Ark → on-chain based on amount and privacy level.",
        status: "pending" as const,
      },
      {
        id: "1.3",
        title: "BCE maturity metrics",
        description:
          "Merchant count, MAU, spend velocity, payment success rate. The KPIs that win grants.",
        status: "pending" as const,
      },
      {
        id: "1.4",
        title: "Merchant onboarding",
        description:
          "Multi-step flow: business registration, QR generation, POS setup, payment tracking.",
        status: "pending" as const,
      },
      {
        id: "1.5",
        title: "Macaroon bakery",
        description:
          "Generate scoped credentials: pay-only, invoice-only, read-only, agent-commerce. Configurable TTL and amount limits.",
        status: "pending" as const,
      },
      {
        id: "1.6",
        title: "Ephemeral agent wallets",
        description:
          "In-memory, auto-expire, scoped to specific community/mint. No persistent secrets.",
        status: "pending" as const,
      },
      {
        id: "1.7",
        title: "G-Bot federation setup",
        description:
          "Fedimint's official guided federation bootstrap — replaces raw Docker scripting.",
        status: "pending" as const,
      },
    ],
  },
  {
    number: 2,
    codename: "Spire",
    title: "Full Privacy + Commerce",
    status: "upcoming" as const,
    icon: Layers,
    description:
      "Complete the privacy layer stack and add production infrastructure. The structure rises.",
    tasks: [
      {
        id: "2.1",
        title: "Fedimint v0.10.0 upgrade",
        description:
          'Upgrade to "Lighthouse" release. ConnectorRegistry transport, Iroh networking.',
        status: "pending" as const,
      },
      {
        id: "2.2",
        title: "Ark SDK integration",
        description:
          "VTXOs for high-privacy off-chain transactions. Hybrid bridge: Ark → on-chain → ecash.",
        status: "pending" as const,
      },
      {
        id: "2.3",
        title: "CDK cloud-native mint",
        description:
          "Replace Nutshell with CDK for production. Postgres backend, Prometheus metrics, Kubernetes profiles.",
        status: "pending" as const,
      },
      {
        id: "2.4",
        title: "Multi-mint support (Coco)",
        description:
          "Manage balances across multiple Cashu mints. Inter-community commerce.",
        status: "pending" as const,
      },
      {
        id: "2.5",
        title: "NUT-26 QR/NFC payments",
        description:
          "cashu: URI format for merchant QR codes. NUT-18 structured payment requests.",
        status: "pending" as const,
      },
      {
        id: "2.6",
        title: "Silent Payments infrastructure",
        description:
          "silent-pay-indexer Docker service, SP address parsing, scan key delegation for mobile.",
        status: "pending" as const,
      },
      {
        id: "2.7",
        title: "Monitoring stack",
        description:
          "Prometheus + Grafana. Federation uptime, mint balance, LN health, payment success rates.",
        status: "pending" as const,
      },
      {
        id: "2.8",
        title: "Fedimint gateway → L402 bridge",
        description:
          "Pay L402 agent services directly from Fedimint ecash. Auto-melt to Lightning.",
        status: "pending" as const,
      },
    ],
  },
  {
    number: 3,
    codename: "Aether",
    title: "Advanced Features",
    status: "upcoming" as const,
    icon: Sparkles,
    description:
      "Programmable ecash, ZK reissuance, governance, hardware wallets. Reaching higher.",
    tasks: [
      {
        id: "3.1",
        title: "Guardian governance",
        description:
          "Selection criteria, rotation policy, incident response, quorum management, treasury policy.",
        status: "pending" as const,
      },
      {
        id: "3.2",
        title: "Programmable eCash (STARK)",
        description:
          "Conditional tokens: escrow, subscriptions, proof-of-service. Depends on upstream NUT-XX adoption.",
        status: "pending" as const,
      },
      {
        id: "3.3",
        title: "ZK verified reissuance",
        description:
          "Audit-log + ZK reissuance for stateless agent wallets. Circulate tokens without centralized mediation.",
        status: "pending" as const,
      },
      {
        id: "3.4",
        title: "Hardware wallet support",
        description:
          "BIP392/BIP376 SP descriptor support. PSBT spending for hardware signing devices.",
        status: "pending" as const,
      },
      {
        id: "3.5",
        title: "Advanced Cashu features",
        description:
          "NUT-28 P2BK, background proof state verification, multi-mint atomic swaps.",
        status: "pending" as const,
      },
      {
        id: "3.6",
        title: "Numo NFC merchant integration",
        description:
          "Tap-to-pay for merchants. Deep integration with merchant directory.",
        status: "pending" as const,
      },
    ],
  },
  {
    number: 4,
    codename: "Citadel",
    title: "Production + Grants",
    status: "upcoming" as const,
    icon: Castle,
    description:
      "Longmont pilot, grant applications, replication playbook. The complete sovereign fortress — deployed and defended.",
    tasks: [
      {
        id: "4.1",
        title: "Longmont pilot deployment",
        description:
          "30 merchants, 300 monthly active spenders, 98%+ payment success, 99.5% uptime by month 6.",
        status: "pending" as const,
      },
      {
        id: "4.2",
        title: "Grant applications",
        description:
          "FBCE Round 3, OpenSats, Fedi grants. Working pilot + BCE metrics + open-source playbook.",
        status: "pending" as const,
      },
      {
        id: "4.3",
        title: "Grant reporting dashboard",
        description:
          "Built-in export: monthly progress notes, KPI snapshots, budget tracking. Matches OpenSats cadence.",
        status: "pending" as const,
      },
      {
        id: "4.4",
        title: "Replication playbook",
        description:
          'Open-source "BCE in a box": infrastructure setup, guardian recruitment, merchant kit, governance template.',
        status: "pending" as const,
      },
      {
        id: "4.5",
        title: "Multi-city federation",
        description:
          "Extend from Longmont to additional cities. Inter-federation commerce via Coco multi-mint.",
        status: "pending" as const,
      },
    ],
  },
];

function StatusIcon({ status }: { status: "done" | "current" | "pending" }) {
  if (status === "done")
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "current")
    return <Clock className="w-4 h-4 text-accent" />;
  return <Circle className="w-4 h-4 text-text-muted" />;
}

export default function RoadmapPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-dim text-accent text-sm mb-8">
          <Lock className="w-4 h-4" />
          <span>Research-driven development</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-6">
          Roadmap
        </h1>

        <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">
          Five phases from security hardening to production deployment. Every task
          traces back to one of seven research documents. 29 tasks, prioritized by
          security impact and dependency order.
        </p>
      </section>

      {/* Phase overview bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-wrap gap-3">
          {phases.map((phase) => (
            <a
              key={phase.number}
              href={`#phase-${phase.number}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-[300ms] ${
                phase.status === "current"
                  ? "border-accent/40 bg-accent-dim text-accent"
                  : "border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"
              }`}
            >
              <phase.icon className="w-4 h-4" />
              <span className="font-medium">
                {phase.number}. {phase.codename}
              </span>
              {phase.status === "current" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                  Active
                </span>
              )}
            </a>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Phases */}
      {phases.map((phase, phaseIdx) => (
        <div key={phase.number}>
          <section
            id={`phase-${phase.number}`}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-24"
          >
            <div className="flex items-start gap-5 mb-8">
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                  phase.status === "current"
                    ? "bg-accent-dim border border-accent/30"
                    : "bg-bg-surface border border-border-default"
                }`}
              >
                <phase.icon
                  className={`w-7 h-7 ${
                    phase.status === "current"
                      ? "text-accent"
                      : "text-text-secondary"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-text-primary">
                    Phase {phase.number}: {phase.codename}
                  </h2>
                  {phase.status === "current" && (
                    <span className="text-xs px-2 py-1 rounded-full bg-accent-dim text-accent border border-accent/30">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{phase.title}</p>
              </div>
            </div>

            <p className="text-text-secondary leading-relaxed mb-8 max-w-3xl">
              {phase.description}
            </p>

            <div className="space-y-3">
              {phase.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex gap-4 items-start p-4 rounded-lg border border-border-default bg-bg-surface/50 hover:border-border-strong transition-all duration-[150ms]"
                >
                  <StatusIcon
                    status={
                      phase.status === "current" ? "current" : task.status
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted font-mono">
                        {task.id}
                      </span>
                      <h3 className="text-sm font-bold text-text-primary">
                        {task.title}
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {phaseIdx < phases.length - 1 && (
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          )}
        </div>
      ))}

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Research traceability note */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass rounded-xl p-6 border-accent/20">
          <h3 className="text-lg font-bold text-text-primary mb-3">
            Research-driven
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Every roadmap item traces back to at least one of seven research documents
            covering Fedimint architecture, Lightning agent security, Cashu protocol
            evolution, Ark privacy design, Silent Payments infrastructure, ecash
            cryptographic research, and Bitcoin Circular Economy patterns.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            35 implementation gaps were identified through systematic cross-referencing
            and prioritized by security impact (P0-P3).
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-6">
          Want to contribute?
        </h2>
        <p className="text-text-secondary mb-10 max-w-xl mx-auto">
          ArxMint is open source. Pick a task, open a PR, or join the conversation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/create" className="antigravity-btn text-lg !px-10 !py-4">
            Try It Now
            <ArrowRight className="w-5 h-5" />
          </a>
          <a href="/why" className="antigravity-btn-outline text-lg !px-8 !py-4">
            Read the Thesis
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
