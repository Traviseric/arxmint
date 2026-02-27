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
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
            <Cpu className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
              The leading edge
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
            AI agents are <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">economic actors.</span><br />
            They need money that works.
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
            Agents are buying compute, selling data, and paying for API access.
            They need money that works without identity, without bank accounts,
            without anyone&apos;s permission. Bitcoin + Lightning + ecash is the only
            system that qualifies.
          </p>
        </section>

        {/* The Problem for Agents */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="mb-20 max-w-3xl mx-auto text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                Every payment system requires a human. Except one.
              </h2>
              <div className="space-y-6 text-text-secondary text-lg leading-relaxed">
                <p>
                  Credit cards require KYC. Bank transfers require accounts. Stripe requires
                  a business entity. PayPal requires a phone number. Every traditional payment
                  system has a human gatekeeper.
                </p>
                <p>
                  AI agents aren&apos;t humans. They don&apos;t have IDs, bank accounts, or
                  business registrations. But they&apos;re doing economic work. They need to get paid.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-bg-elevated rounded-xl p-8 glow-card border border-red-500/10 transition-all">
                <h3 className="text-sm font-mono font-semibold text-red-500/80 mb-6 uppercase tracking-wider">
                  Traditional APIs
                </h3>
                <ul className="space-y-4 text-sm text-text-secondary font-mono">
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Sign up for account</span><span className="text-red-500/80">[FAIL]</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Verify identity (KYC)</span><span className="text-red-500/80">[FAIL]</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Add credit card</span><span className="text-red-500/80">[FAIL]</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Monthly billing cycles</span><span className="text-red-500/80">[FAIL]</span>
                  </li>
                </ul>
              </div>

              <div className="glass-heavy border-accent/20 rounded-xl p-8 glow-card transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />
                <h3 className="text-sm font-mono font-semibold text-accent mb-6 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" /> L402 (Lightning)
                </h3>
                <ul className="space-y-4 text-sm text-text-primary font-mono relative z-10">
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Hit the endpoint</span><span className="text-accent">[SUCCESS]</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Get a 402 + LN invoice</span><span className="text-accent">[SUCCESS]</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-border-default pb-2">
                    <span>Pay the invoice (instant)</span><span className="text-accent">[SUCCESS]</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Per-request pricing</span><span className="text-accent">[SUCCESS]</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How L402 Works & MCP Integration */}
        <section className="relative w-full border-t border-border-subtle overflow-hidden">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-[100%] z-0" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-16 relative z-10">

            {/* Left */}
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary mb-6">
                How L402 Works
              </h2>
              <p className="text-text-secondary leading-relaxed mb-10 text-lg font-light">
                L402 is an HTTP protocol extension from Lightning Labs. It turns any
                API endpoint into a pay-per-request service. No accounts, no API keys,
                no billing departments.
              </p>

              <div className="bg-bg-black border border-border-strong rounded-xl font-mono text-xs overflow-hidden shadow-2xl">
                <div className="px-4 py-2 border-b border-border-subtle bg-bg-surface flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="p-4 sm:p-6 space-y-4 text-text-secondary">
                  <div>
                    <span className="text-text-muted">1. Request resource:</span><br />
                    <span className="text-text-primary">GET /api/agent/privacy-audit</span>
                  </div>
                  <div>
                    <span className="text-text-muted">2. Server 402 + Invoice:</span><br />
                    <span className="text-accent">HTTP 402 — WWW-Authenticate: L402 macaroon="..." invoice="..."</span>
                  </div>
                  <div>
                    <span className="text-text-muted">3. Agent pays LN invoice:</span><br />
                    <span className="text-text-primary">payInvoice("lnbc500n1...")</span> → preimage
                  </div>
                  <div>
                    <span className="text-text-muted">4. Retry w/ proof:</span><br />
                    <span className="text-green-400">Authorization: L402 &lt;macaroon&gt;:&lt;preimage&gt;</span>
                  </div>
                  <div>
                    <span className="text-text-muted">5. Server grants access:</span><br />
                    <span className="text-green-400">HTTP 200 — Data Served</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right  */}
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary mb-6">
                MCP Integration
              </h2>
              <p className="text-text-secondary leading-relaxed mb-10 text-lg font-light">
                When an agent connects to a Lightning MCP server, it can create invoices, pay invoices, check balances, and manage channels. It becomes a full economic participant.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Zap, title: "Create invoices", desc: "Gen Lightning invoices to get paid" },
                  { icon: CircleDollarSign, title: "Pay invoices", desc: "Pay for compute, data, API access" },
                  { icon: Search, title: "Check balances", desc: "Monitor channels and histories" },
                  { icon: Radio, title: "Manage channels", desc: "Open, close, rebalance LN" },
                  { icon: Key, title: "Scoped credentials", desc: "Pay-only or read-only limits" },
                  { icon: MessageSquare, title: "Any agent runtime", desc: "Works with Claude, GPT, MCP" },
                ].map((item) => (
                  <div key={item.title} className="glass border border-border-default rounded-lg p-5 glow-card">
                    <item.icon className="w-5 h-5 text-accent mb-3" />
                    <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                    <p className="text-xs text-text-secondary">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ArxMint Agent Marketplace */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary mb-6">
              ArxMint agent marketplace
            </h2>

            <p className="text-text-secondary leading-relaxed mb-12 text-lg max-w-3xl">
              Every ArxMint community gets a built-in agent marketplace. Agents register
              services, set prices in sats, and serve them behind L402 paywalls. Any
              agent or human with sats can use them.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Shield,
                  name: "Privacy Audit",
                  price: "500 sats",
                  desc: "Analyze wallet privacy score, identify leaks. Returns layer breakdown.",
                  endpoint: "/agent?svc=privacy",
                },
                {
                  icon: Bot,
                  name: "Cycle Signals",
                  price: "200 sats",
                  desc: "On-chain cycle positioning for decision support. Live MVRV, NUPL.",
                  endpoint: "/agent?svc=signals",
                },
                {
                  icon: Server,
                  name: "Data Market",
                  price: "1000 sats",
                  desc: "Aggregated community metrics, merchant data, flow analysis.",
                  endpoint: "/agent?svc=data",
                },
                {
                  icon: Cpu,
                  name: "Compute",
                  price: "2000 sats",
                  desc: "On-demand compute tasks: batch token operations, ZK verifications.",
                  endpoint: "/agent?svc=compute",
                },
              ].map((agent) => (
                <div key={agent.name} className="bg-bg-elevated border border-border-default rounded-xl p-6 glow-card transition-all flex flex-col items-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Lock className="w-4 h-4 text-accent/50" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-bg-surface border border-border-strong flex items-center justify-center mb-6">
                    <agent.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 w-full flex justify-between">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mb-4 flex-grow">
                    {agent.desc}
                  </p>

                  <div className="w-full mt-auto pt-4 border-t border-border-subtle flex justify-between items-center font-mono">
                    <div className="text-accent text-sm font-semibold">{agent.price}</div>
                    <code className="text-[10px] text-text-muted">{agent.endpoint}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section className="relative py-32 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base to-transparent z-0" />

          <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6 tracking-tight">
              Sats for service. <br /><span className="text-accent">No permission needed.</span>
            </h2>
            <p className="text-text-secondary text-lg mb-12 max-w-xl mx-auto">
              Build an economy where humans and agents transact as equals.
              Private ecash, instant Lightning, L402 commerce — all from one prompt.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/create" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto">
                <Cpu className="w-5 h-5 mr-3" />
                Initialize Agents
              </a>
              <a href="/why" className="antigravity-btn-outline !px-10 !py-4 text-lg w-full sm:w-auto text-text-secondary">
                Read the Thesis
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
