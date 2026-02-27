import {
  ArrowRight,
  Ban,
  Building2,
  CircleDollarSign,
  Cpu,
  Globe,
  Lock,
  RefreshCw,
  Shield,
  Users,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Why ArxMint — The Case for Private Bitcoin Economies",
  description:
    "Bitcoin was supposed to change everything. But most people are still trapped in fiat, just holding sats on the side. ArxMint closes the gap between hodling and living on a Bitcoin standard.",
};

export default function WhyPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-dim text-accent text-sm mb-8">
          <Shield className="w-4 h-4" />
          <span>The thesis</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-6">
          Bitcoin doesn&apos;t need another wallet.
          <br />
          <span className="text-accent">It needs economies.</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">
          Everyone&apos;s building on-ramps and off-ramps. Nobody&apos;s building the road.
          ArxMint is the road — private infrastructure where Bitcoin actually circulates
          as money, not just sits in cold storage waiting for a better price.
        </p>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* The Problem — Holding isn't an economy */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          The holding trap
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            Most Bitcoiners have the same daily experience: earn fiat, spend fiat, buy
            Bitcoin on an exchange, move it to cold storage. Repeat. The entire financial
            life still runs on fiat rails — Bitcoin is savings, not money.
          </p>

          <p>
            This isn&apos;t a criticism. Cold storage is the right first step. But it&apos;s
            supposed to be step one, not the endgame. The original promise was a{" "}
            <span className="text-text-primary font-medium">
              peer-to-peer electronic cash system
            </span>
            . Cash means circulation. Cash means merchants and customers and services
            flowing through a real economy.
          </p>

          <p>
            The problem isn&apos;t conviction. Bitcoiners know this. The problem is
            infrastructure. Setting up the rails for a real circular economy — private
            mints, Lightning nodes, merchant tools, agent commerce — takes months of
            expertise that most communities don&apos;t have.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6 glow-card border-red-500/10">
            <CircleDollarSign className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="text-sm font-bold text-text-primary mb-2">Still on fiat rails</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Rent, groceries, gas — all paid in dollars. Bitcoin is a savings account
              that you convert out of, not money you live on.
            </p>
          </div>
          <div className="glass rounded-xl p-6 glow-card border-red-500/10">
            <Ban className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="text-sm font-bold text-text-primary mb-2">KYC everywhere</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every exchange, every on-ramp, every &quot;compliant&quot; service builds a map of
              your financial life. Privacy is opt-in and expensive.
            </p>
          </div>
          <div className="glass rounded-xl p-6 glow-card border-red-500/10">
            <Building2 className="w-6 h-6 text-red-400 mb-3" />
            <h3 className="text-sm font-bold text-text-primary mb-2">No local infrastructure</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your town has no ecash mint, no private payment rails, no merchant
              directory. The parallel economy is a concept, not a reality.
            </p>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* The Technology Exists */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          The technology exists. The integration doesn&apos;t.
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            This isn&apos;t 2018 anymore. The building blocks for a real private Bitcoin
            economy are production-ready:
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6 glow-card">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-text-primary">Fedimint</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Federated e-cash with trusted local guardians. Chaumian blind signatures
              make transactions inside the mint completely private. Multi-guardian setup
              means no single point of failure.
            </p>
          </div>

          <div className="glass rounded-xl p-6 glow-card">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-text-primary">Cashu</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Lightweight ecash protocol. Faster to spin up than a federation — ideal for
              small communities, testing, or single-operator mints. Interoperable with
              Lightning for payments outside the mint.
            </p>
          </div>

          <div className="glass rounded-xl p-6 glow-card">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-text-primary">Lightning + L402</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Instant Bitcoin payments over Lightning. L402 (formerly LSAT) turns any API
              endpoint into a pay-per-request service — the native payment protocol for
              AI agents and machine commerce.
            </p>
          </div>

          <div className="glass rounded-xl p-6 glow-card">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-text-primary">MCP + Agent Tools</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              The Model Context Protocol lets AI agents use Lightning natively.
              Pay invoices, create channels, manage balances — agents become
              economic participants, not just chatbots.
            </p>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-xl border border-accent/20 bg-accent-dim">
          <p className="text-text-secondary leading-relaxed">
            <span className="text-accent font-bold">The gap:</span> each of these
            is a separate project with its own setup, its own docs, its own Docker configs.
            Stitching them into a working economy takes weeks of DevOps expertise.
            Most Bitcoin communities never start because the activation energy is too high.
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* The AI Agent Angle */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          AI agents need Bitcoin. Bitcoin needs AI agents.
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            This is the part most people haven&apos;t connected yet. AI agents are
            becoming economic actors — buying compute, selling data, paying for API
            access. They need money that works without identity, without bank accounts,
            without permission.
          </p>

          <p>
            Credit cards require KYC. Bank transfers require accounts. PayPal requires
            a human. The only money system where an autonomous agent can{" "}
            <span className="text-text-primary font-medium">earn, hold, and spend</span>{" "}
            without anyone&apos;s permission is Bitcoin — specifically, Lightning and ecash.
          </p>

          <p>
            L402 is the protocol that makes this work. An AI agent hits an API endpoint,
            gets a 402 Payment Required response with a Lightning invoice, pays it
            instantly, and gets access. No signup, no API key approval process, no
            billing department. Just sats for service.
          </p>

          <p>
            ArxMint puts humans and agents on the{" "}
            <span className="text-text-primary font-medium">same rails</span>.
            A community member pays a local coffee shop with ecash. An AI agent pays
            for a privacy audit with sats. Same federation. Same mint. Same economy.
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* What ArxMint Actually Does */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          What ArxMint does
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed mb-12">
          <p>
            ArxMint takes the entire stack — Fedimint, Cashu, Lightning, L402, agent
            tools, privacy defaults, Docker deployment — and makes it accessible through
            a single natural language prompt.
          </p>

          <p>
            Describe your community. ArxMint generates the federation config, the mint
            setup, the Lightning node, the L402 proxy, the agent marketplace, and the
            Docker deployment. Run one command. Your economy is live.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: Users,
              label: "For a Bitcoin meetup",
              example:
                '"20-person meetup in Longmont, private payments, merchant directory, cycle alerts"',
              result: "Fedimint federation + 3 guardians + merchant onboarding + cycle dashboard",
            },
            {
              icon: Cpu,
              label: "For an agent network",
              example:
                '"AI agent marketplace — privacy audits, data feeds, compute — L402 paywalls"',
              result: "Cashu mint + Aperture L402 proxy + 4 agent endpoints + MCP config",
            },
            {
              icon: Globe,
              label: "For a local economy",
              example:
                '"Bitcoin circular economy for a small town — merchants, residents, agents all using ecash"',
              result: "Full stack: Fedimint + Cashu + LND + merchant tools + privacy defaults",
            },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl p-6 glow-card">
              <div className="flex items-center gap-3 mb-3">
                <item.icon className="w-5 h-5 text-accent shrink-0" />
                <h3 className="text-sm font-bold text-text-primary">{item.label}</h3>
              </div>
              <div className="text-sm text-accent/80 font-mono mb-2">
                {item.example}
              </div>
              <div className="text-xs text-text-secondary">
                → {item.result}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* The Circular Economy Vision */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          The sovereign loop
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed mb-12">
          <p>
            A circular economy isn&apos;t an abstract concept. It&apos;s a specific thing:
            sats flow in a loop. Someone earns them, someone spends them, a merchant
            receives them, they pay a supplier, the supplier pays workers. The money
            circulates without ever touching fiat.
          </p>

          <p>
            Bitcoin Beach in El Salvador proved it works. Fedimint makes it private.
            Cashu makes it lightweight. Lightning makes it instant. L402 makes it
            programmable. ArxMint makes it deployable.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 py-8">
          {[
            { icon: Zap, text: "Earn sats (work, services, agent commerce)", color: "text-accent" },
            { icon: Shield, text: "Hold in private ecash (Fedimint / Cashu)", color: "text-accent" },
            { icon: Users, text: "Spend at local merchants (QR / NFC)", color: "text-accent" },
            { icon: Cpu, text: "Agents earn via L402 (data, compute, audits)", color: "text-accent" },
            { icon: RefreshCw, text: "Sats circulate — economy grows", color: "text-green-400" },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg border border-border-default bg-bg-surface">
                <step.icon className={`w-4 h-4 shrink-0 ${step.color}`} />
                <span className="text-sm text-text-primary">{step.text}</span>
              </div>
              {i < 4 && (
                <div className="w-px h-6 bg-accent/30" />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Why Now */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          Why now
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            Three things converged in 2025-2026 that make this possible for the first time:
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex gap-5 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center text-accent font-bold text-sm">
              01
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary mb-1">
                Ecash protocols matured
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Fedimint hit production. Cashu-TS v3 shipped. CDK went cloud-native.
                The mint infrastructure that was experimental in 2023 is deployable in 2026.
              </p>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center text-accent font-bold text-sm">
              02
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary mb-1">
                AI agents became economic actors
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                MCP gave agents tool use. L402 gave them payment rails. For the first
                time, autonomous software can earn and spend without human intermediation.
                They just need money that doesn&apos;t require identity.
              </p>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center text-accent font-bold text-sm">
              03
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary mb-1">
                Financial surveillance accelerated
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                CBDCs, transaction monitoring, debanking. The case for private money
                infrastructure isn&apos;t theoretical anymore — it&apos;s urgent. Communities
                need sovereignty before they need it, not after.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6">
          Not evasion.{" "}
          <span className="text-accent">Sovereignty.</span>
        </h2>
        <p className="text-text-secondary mb-10 max-w-xl mx-auto leading-relaxed">
          ArxMint isn&apos;t about hiding. It&apos;s about building the infrastructure
          that makes Bitcoin work as money — private, circulating, accessible.
          For your community, your agents, your economy.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/create" className="antigravity-btn text-lg !px-10 !py-4">
            Create Your Economy
            <ArrowRight className="w-5 h-5" />
          </a>
          <a href="/roadmap" className="antigravity-btn-outline text-lg !px-8 !py-4">
            View Roadmap
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
