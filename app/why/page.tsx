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
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
              The thesis
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
            Bitcoin doesn&apos;t need another wallet.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
              It needs economies.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
            Everyone&apos;s building on-ramps and off-ramps. Nobody&apos;s building the road.
            ArxMint is the road — private infrastructure where Bitcoin actually circulates
            as money, not just sits in cold storage waiting for a better price.
          </p>
        </section>

        {/* The Problem — Holding isn't an economy */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="mb-20 max-w-3xl mx-auto text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The holding trap.
              </h2>
              <div className="space-y-6 text-text-secondary text-lg leading-relaxed">
                <p>
                  Most Bitcoiners have the same daily experience: earn fiat, spend fiat, buy
                  Bitcoin on an exchange, move it to cold storage. Repeat. The entire financial
                  life still runs on fiat rails — Bitcoin is savings, not money.
                </p>
                <p>
                  This isn&apos;t a criticism. Cold storage is the right first step. But it&apos;s
                  supposed to be step one, not the endgame. The original promise was a{" "}
                  <span className="text-text-primary font-medium">peer-to-peer electronic cash system</span>. Cash means circulation. Cash means merchants and customers and services
                  flowing through a real economy.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all">
                <CircleDollarSign className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">Still on fiat rails</h3>
                <p className="text-sm text-text-secondary leading-relaxed space-y-2">
                  Rent, groceries, gas — all paid in dollars. Bitcoin is a savings account
                  that you convert out of, not money you live on.
                </p>
              </div>
              <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all">
                <Ban className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">KYC everywhere</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Every exchange, every on-ramp, every &quot;compliant&quot; service builds a map of
                  your financial life. Privacy is opt-in and expensive.
                </p>
              </div>
              <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all">
                <Building2 className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">No local infrastructure</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your town has no ecash mint, no private payment rails, no merchant
                  directory. The parallel economy is a concept, not a reality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Technology Exists */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The technology exists.<br />The integration doesn&apos;t.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">
                This isn&apos;t 2018 anymore. The building blocks for a real private Bitcoin
                economy are production-ready:
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pillar Cards */}
              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                <Lock className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">Fedimint</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Federated e-cash with trusted local guardians. Chaumian blind signatures
                  make transactions inside the mint completely private.
                </p>
              </div>

              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                <Shield className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">Cashu</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Lightweight ecash protocol. Faster to spin up than a federation — ideal for
                  small communities, testing, or single-operator mints.
                </p>
              </div>

              <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                <Zap className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">Lightning + L402</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Instant Bitcoin payments over Lightning. turns any API
                  endpoint into a pay-per-request service — native system for AI commerce.
                </p>
              </div>

              <div className="glass-heavy rounded-xl p-8 glow-card relative overflow-hidden border-accent/20">
                <div className="absolute top-0 -right-4 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />
                <Cpu className="w-8 h-8 text-accent mb-6" />
                <h3 className="text-lg font-semibold text-text-primary mb-3">MCP + Agent Tools</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Model Context Protocol hooks AI properly into Lightning.
                  Agents pay invoices, create channels, manage balances seamlessly.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-black/40 border-l-2 border-accent p-6 text-sm text-text-secondary font-mono leading-relaxed">
              <span className="text-accent">STATUS OF CURRENT MARKET:</span> Each of these is a separate project with its own setup, its own docs, its own Docker configs. Stitching them into a working economy takes weeks of DevOps expertise. Most communities never start.
            </div>
          </div>
        </section>

        {/* The AI Agent Angle */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-8 text-center sm:text-left">
              AI agents need Bitcoin.<br />Bitcoin needs AI agents.
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6 text-text-secondary text-lg leading-relaxed font-light">
                <p>
                  This is the part most people haven&apos;t connected yet. AI agents are
                  becoming economic actors — buying compute, selling data, and paying for API
                  access. They need money that works without identities, or bank accounts.
                </p>
                <p>
                  Credit cards require KYC. Banks require accounts. PayPal requires a human. The only money system where an autonomous agent can <span className="text-text-primary font-medium">earn, hold, and spend</span> without permission is Bitcoin on Lightning rails.
                </p>
                <p>
                  ArxMint puts humans and agents on the <span className="text-text-primary font-medium">same rails</span>. A community member pays a local coffee shop with ecash while an AI agent pays for severe inference with sats. Same federation.
                </p>
              </div>
              <div className="glass-heavy p-8 border border-border-default rounded-xl relative overflow-hidden glow-card">
                <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                <h3 className="text-sm font-mono tracking-widest text-accent uppercase mb-6 flex items-center gap-2"><Zap className="w-4 h-4" /> L402 Sequence</h3>
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>AGENT_REQUEST_API</span>
                    <span>...</span>
                  </div>
                  <div className="flex justify-between items-center text-accent">
                    <span>HTTP 402 PAYMENT RQD</span>
                    <span>[LN INVOICE]</span>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>PAY_INVOICE(LND)</span>
                    <span>[PREIMAGE]</span>
                  </div>
                  <div className="flex justify-between items-center text-green-400">
                    <span>HTTP 200 SUCCESS</span>
                    <span>[DATA SERVED]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section className="relative py-32 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base to-bg-surface z-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-[100%] z-0" />

          <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6 tracking-tight">
              Not evasion. <span className="text-accent drop-shadow-lg shadow-accent/20">Sovereignty.</span>
            </h2>
            <p className="text-text-secondary text-lg mb-12 max-w-xl mx-auto">
              ArxMint isn&apos;t about hiding. It&apos;s about building the infrastructure
              that makes Bitcoin work as money — private, circulating, accessible. For your community and your agents.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/create" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto">
                Create Your Economy
              </a>
              <a href="/roadmap" className="antigravity-btn-outline !px-10 !py-4 text-lg w-full sm:w-auto">
                <Globe className="w-5 h-5 mr-2" />
                View Roadmap
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
