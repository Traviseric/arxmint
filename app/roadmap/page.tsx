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
  Github,
} from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

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
          "Verify keyset IDs against mint pubkeys. Prevent NUT-13 deterministic secret collisions — critical for agent wallets.",
        status: "pending" as const,
      },
      {
        id: "0.2",
        title: "Fix Silent Payments status",
        description:
          "Show honest per-backend SP availability. SP for Fedimint peg-outs requires a federation module (server-side).",
        status: "pending" as const,
      },
      {
        id: "0.3",
        title: "Lightning agent security tiers",
        description:
          "WATCH_ONLY → PAY_ONLY → ADMIN tiers. Agents default to WATCH_ONLY. Never give agents admin macaroons.",
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
        description: "Accept Cashu tokens as payment for agent services alongside L402.",
        status: "pending" as const,
      },
      {
        id: "1.2",
        title: "Spend router",
        description: "Auto-select ecash → Lightning → Ark → on-chain based on amount.",
        status: "pending" as const,
      },
      {
        id: "1.3",
        title: "Macaroon bakery",
        description: "Generate scoped credentials: pay-only, invoice-only, read-only.",
        status: "pending" as const,
      },
      {
        id: "1.4",
        title: "Ephemeral agent wallets",
        description: "In-memory, auto-expire, scoped. No persistent secrets.",
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
        description: 'Upgrade to "Lighthouse" release. ConnectorRegistry transport.',
        status: "pending" as const,
      },
      {
        id: "2.2",
        title: "Multi-mint support (Coco)",
        description: "Manage balances across multiple Cashu mints.",
        status: "pending" as const,
      },
      {
        id: "2.3",
        title: "Monitoring stack",
        description: "Prometheus + Grafana. Federation uptime, mint balance.",
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
        title: "Programmable eCash (STARK)",
        description: "Conditional tokens: escrow, subscriptions, proof-of-service.",
        status: "pending" as const,
      },
      {
        id: "3.2",
        title: "ZK verified reissuance",
        description: "Audit-log + ZK reissuance for stateless agent wallets.",
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
      "Longmont pilot, grant applications, replication playbook. The complete sovereign fortress.",
    tasks: [
      {
        id: "4.1",
        title: "Longmont pilot deployment",
        description: "30 merchants, 300 monthly active spenders, 99.5% uptime.",
        status: "pending" as const,
      },
      {
        id: "4.2",
        title: "Replication playbook",
        description: 'Open-source "BCE in a box": infrastructure setup.',
        status: "pending" as const,
      },
    ],
  },
];

function StatusIcon({ status }: { status: "done" | "current" | "pending" }) {
  if (status === "done")
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "current")
    return <Clock className="w-4 h-4 text-accent animate-pulse" />;
  return <Circle className="w-4 h-4 text-border-strong" />;
}

export default function RoadmapPage() {
  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Lock className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Research-driven development
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
              The Roadmap.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
              Five phases from security hardening to production deployment. Every task
              traces back to rigorous core research. Prioritized by
              security impact.
            </p>
          </ScrollReveal>
        </section>

        {/* Phase overview bar */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScrollReveal delay={0.3} direction="up">
            <div className="flex flex-wrap gap-3 p-2 bg-bg-surface/50 rounded-xl border border-border-default backdrop-blur-sm">
              {phases.map((phase) => (
                <a
                  key={phase.number}
                  href={`#phase-${phase.number}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-[300ms] ${phase.status === "current"
                    ? "bg-accent/10 border border-accent/20 text-accent font-medium shadow-[0_0_15px_rgba(247,147,26,0.1)]"
                    : "border border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                >
                  <span className="font-mono text-xs opacity-60">0{phase.number}</span>
                  <span>{phase.codename}</span>
                </a>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <div className="h-px w-full bg-border-subtle" />

        {/* Phases */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <StaggerContainer className="space-y-32">
            {phases.map((phase, phaseIdx) => (
              <StaggerItem key={phase.number}>
                <section
                  id={`phase-${phase.number}`}
                  className="scroll-mt-32 relative"
                >

                  {/* Connecting Line */}
                  {phaseIdx !== phases.length - 1 && (
                    <div className="absolute left-[27px] top-[70px] bottom-[-130px] w-px bg-border-strong rounded-full" />
                  )}

                  <div className="flex items-start gap-6 mb-12 relative z-10">
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border shadow-lg ${phase.status === "current"
                        ? "bg-bg-base border-accent shadow-accent/20"
                        : "bg-bg-surface border-border-strong shadow-black/50"
                        }`}
                    >
                      <phase.icon
                        className={`w-6 h-6 ${phase.status === "current"
                          ? "text-accent"
                          : "text-text-muted"
                          }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-accent">PHASE_0{phase.number}</span>
                        {phase.status === "current" && (
                          <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 bg-accent/10 text-accent border border-accent/20 font-mono tracking-widest uppercase">
                            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> Active
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl font-semibold text-text-primary mb-3">
                        {phase.codename} : {phase.title}
                      </h2>
                      <p className="text-text-secondary text-base leading-relaxed max-w-2xl font-light">
                        {phase.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 pl-[80px]">
                    {phase.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="glass px-5 py-4 rounded-xl border border-border-default glow-card group transition-colors hover:bg-bg-surface/80"
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5">
                            <StatusIcon
                              status={
                                phase.status === "current" ? "current" : task.status
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-sm font-semibold text-text-primary">
                                {task.title}
                              </h3>
                              <span className="text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded text-text-secondary font-mono border border-border-default">
                                TK_{task.id}
                              </span>
                            </div>
                            <p className="text-[13px] text-text-secondary leading-relaxed font-light">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* CTA */}
        <section className="relative py-32 border-t border-border-subtle overflow-hidden mt-16 bg-bg-surface/30">
          <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-semibold text-text-primary mb-6 tracking-tight">
              Want to contribute?
            </h2>
            <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
              ArxMint is open source infrastructure. Pick a task from the active phase, open a PR, or join the discussion.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://github.com/Traviseric/arxmint" target="_blank" rel="noopener noreferrer" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto">
                <Github className="w-5 h-5 mr-3" />
                View Repository
              </a>
              <a href="/create" className="antigravity-btn-outline !px-10 !py-4 text-lg w-full sm:w-auto">
                Test Deployment
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
