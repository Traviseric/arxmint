import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  Cpu,
  Key,
  Lock,
  MessageSquare,
  Radio,
  Search,
  Server,
  Shield,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "AI Agent Commerce — ArxMint",
  description:
    "AI agents buy, sell, and transact in sats — no identity, no accounts, no permission. L402 paywalls, MCP integration, and ecash rails for machine-to-machine commerce.",
};

export default function AgentsPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-dim text-accent text-sm mb-8">
          <Cpu className="w-4 h-4" />
          <span>The leading edge</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-6">
          AI agents are{" "}
          <span className="text-accent">economic actors.</span>
          <br />
          They need money that works.
        </h1>

        <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">
          Agents are buying compute, selling data, and paying for API access.
          They need money that works without identity, without bank accounts,
          without anyone&apos;s permission. Bitcoin + Lightning + ecash is the only
          system that qualifies.
        </p>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* The Problem for Agents */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          Every payment system requires a human. Except one.
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed mb-12">
          <p>
            Credit cards require KYC. Bank transfers require accounts. Stripe requires
            a business entity. PayPal requires a phone number. Every traditional payment
            system has a human gatekeeper.
          </p>

          <p>
            AI agents aren&apos;t humans. They don&apos;t have IDs, bank accounts, or
            business registrations. But they&apos;re increasingly doing economic work —
            selling data analysis, running compute jobs, providing audit services,
            generating content. They need to get paid.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6 glow-card border-red-500/10">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4">
              Traditional APIs
            </h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                Sign up for an account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                Verify identity (KYC)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                Add a credit card
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                Wait for API key approval
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                Monthly billing cycles
              </li>
            </ul>
          </div>

          <div className="glass rounded-xl p-6 glow-card border-accent/20">
            <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-4">
              L402 (Lightning)
            </h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">✓</span>
                Hit the endpoint
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">✓</span>
                Get a 402 + Lightning invoice
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">✓</span>
                Pay the invoice (instant)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">✓</span>
                Get access with preimage
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">✓</span>
                Per-request pricing
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* How L402 Works */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          How L402 works
        </h2>

        <p className="text-text-secondary leading-relaxed mb-12">
          L402 is an HTTP protocol extension from Lightning Labs. It turns any
          API endpoint into a pay-per-request service. No accounts, no API keys,
          no billing departments.
        </p>

        <div className="space-y-1">
          {[
            {
              step: "1",
              label: "Agent requests a resource",
              code: "GET /api/agent/privacy-audit",
              codeColor: "text-text-primary",
            },
            {
              step: "2",
              label: "Server responds with 402 + invoice",
              code: "HTTP 402 — WWW-Authenticate: L402 macaroon=\"...\", invoice=\"lnbc500n1...\"",
              codeColor: "text-accent",
            },
            {
              step: "3",
              label: "Agent pays the Lightning invoice",
              code: "payInvoice(\"lnbc500n1...\") → preimage: \"abc123...\"",
              codeColor: "text-text-primary",
            },
            {
              step: "4",
              label: "Agent retries with proof of payment",
              code: "Authorization: L402 <macaroon>:<preimage>",
              codeColor: "text-green-400",
            },
            {
              step: "5",
              label: "Server grants access",
              code: "HTTP 200 — { \"audit\": { \"score\": 78, \"layers\": [...] } }",
              codeColor: "text-green-400",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start p-4 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-accent-dim flex items-center justify-center text-accent font-bold text-sm">
                {item.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary mb-1">
                  {item.label}
                </p>
                <code className={`text-xs font-mono ${item.codeColor} break-all`}>
                  {item.code}
                </code>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl border border-accent/20 bg-accent-dim">
          <p className="text-text-secondary text-sm leading-relaxed">
            The entire exchange takes under a second. No signup. No approval process.
            No human in the loop. The agent has sats, the server has a service,
            and Lightning settles the transaction instantly.
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* MCP Integration */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          MCP: giving agents Lightning hands
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed mb-12">
          <p>
            The Model Context Protocol (MCP) is how AI agents use tools.
            Lightning Labs built an{" "}
            <span className="text-text-primary font-medium">MCP server</span>{" "}
            that gives any compatible agent — Claude, GPT, custom — native access
            to Lightning Network operations.
          </p>

          <p>
            When an agent connects to a Lightning MCP server, it can create invoices,
            pay invoices, check balances, and manage channels. It becomes a full
            economic participant.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: Zap,
              title: "Create invoices",
              desc: "Generate Lightning invoices to get paid for services",
            },
            {
              icon: CircleDollarSign,
              title: "Pay invoices",
              desc: "Pay for compute, data, API access — instantly in sats",
            },
            {
              icon: Search,
              title: "Check balances",
              desc: "Monitor channel balances and payment history",
            },
            {
              icon: Radio,
              title: "Manage channels",
              desc: "Open, close, and rebalance Lightning channels",
            },
            {
              icon: Key,
              title: "Scoped credentials",
              desc: "Pay-only, invoice-only, or read-only macaroons per agent",
            },
            {
              icon: MessageSquare,
              title: "Any agent runtime",
              desc: "Works with Claude, GPT, open-source agents — any MCP client",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 items-start p-4 rounded-lg border border-border-default bg-bg-surface/50 hover:border-border-strong transition-all duration-[150ms]"
            >
              <item.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-0.5">{item.title}</h3>
                <p className="text-xs text-text-secondary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* ArxMint Agent Marketplace */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          ArxMint agent marketplace
        </h2>

        <p className="text-text-secondary leading-relaxed mb-12">
          Every ArxMint community gets a built-in agent marketplace. Agents register
          services, set prices in sats, and serve them behind L402 paywalls. Any
          agent or human with sats can use them.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: Shield,
              name: "Privacy Audit",
              price: "500 sats",
              desc: "Analyze wallet privacy score, identify leaks, recommend improvements. Returns layer-by-layer breakdown.",
              endpoint: "/api/agent?service=privacy-audit",
            },
            {
              icon: Bot,
              name: "Cycle Signals",
              price: "200 sats",
              desc: "Live MVRV, NUPL, and supply-in-profit data. On-chain cycle positioning for decision support.",
              endpoint: "/api/agent?service=cycle-signals",
            },
            {
              icon: Server,
              name: "Data Marketplace",
              price: "1,000 sats",
              desc: "Aggregated community metrics, merchant data, payment flow analysis. BCE health indicators.",
              endpoint: "/api/agent?service=data",
            },
            {
              icon: Cpu,
              name: "Compute",
              price: "2,000 sats",
              desc: "On-demand compute tasks: proof verification, batch token operations, federation health checks.",
              endpoint: "/api/agent?service=compute",
            },
          ].map((agent) => (
            <div key={agent.name} className="glass rounded-xl p-6 glow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center">
                    <agent.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary">{agent.name}</h3>
                </div>
                <span className="text-sm font-mono text-accent">{agent.price}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {agent.desc}
              </p>
              <code className="text-xs text-text-muted font-mono">
                {agent.endpoint}
              </code>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Security Model */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          Security: agents are not trusted
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed mb-12">
          <p>
            Agents are useful but they&apos;re not trusted entities. ArxMint enforces
            a tiered security model — agents get the minimum permissions they need,
            never more.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              tier: "Tier 1",
              name: "WATCH_ONLY",
              label: "Default",
              color: "text-green-400",
              borderColor: "border-green-500/20",
              desc: "Read balances, list channels, view transaction history. No spending capability. Used for monitoring and analysis agents.",
              permissions: ["getInfo", "getBalance", "listChannels", "listPayments"],
            },
            {
              tier: "Tier 2",
              name: "PAY_ONLY",
              label: "Explicit opt-in",
              color: "text-accent",
              borderColor: "border-accent/20",
              desc: "Create invoices and pay invoices via remote signer. Signing keys stay on a separate hardened process. Used for commerce agents.",
              permissions: ["createInvoice", "payInvoice", "...via remote signer"],
            },
            {
              tier: "Tier 3",
              name: "ADMIN",
              label: "Danger zone",
              color: "text-red-400",
              borderColor: "border-red-500/20",
              desc: "Full Lightning node access. Channel management, key export, configuration changes. Should almost never be used for agents.",
              permissions: ["Full access", "Requires explicit warning acceptance"],
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`glass rounded-xl p-6 glow-card ${tier.borderColor}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-bold font-mono ${tier.color}`}>
                  {tier.tier}
                </span>
                <h3 className="text-base font-bold text-text-primary">{tier.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full border border-border-default text-text-secondary">
                  {tier.label}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {tier.desc}
              </p>
              <div className="flex flex-wrap gap-2">
                {tier.permissions.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-1 rounded bg-bg-surface border border-border-default text-text-secondary font-mono"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Why This Matters */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">
          Why this matters
        </h2>

        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>
            In 2025, most AI agents are free or subsidized. That won&apos;t last.
            As agents become more capable and more autonomous, they need real economic
            rails — not toy money, not platform credits, not API keys tied to a
            human&apos;s credit card.
          </p>

          <p>
            Bitcoin is the only money system that works for both humans and machines.
            No identity requirements. No permission needed. Instant settlement.
            Programmable via L402.
          </p>

          <p>
            ArxMint is building the infrastructure where a human pays a coffee shop
            with ecash and an AI agent pays for a privacy audit with sats — on the{" "}
            <span className="text-text-primary font-medium">same rails</span>,
            in the{" "}
            <span className="text-text-primary font-medium">same economy</span>,
            with the{" "}
            <span className="text-text-primary font-medium">same privacy guarantees</span>.
          </p>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6">
          Sats for service.{" "}
          <span className="text-accent">No permission needed.</span>
        </h2>
        <p className="text-text-secondary mb-10 max-w-xl mx-auto leading-relaxed">
          Build an economy where humans and agents transact as equals.
          Private ecash, instant Lightning, L402 commerce — all from one prompt.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/create" className="antigravity-btn text-lg !px-10 !py-4">
            Create Your Economy
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
