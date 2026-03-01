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

import Image from "next/image";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

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
        <Image
          src="/images/agent_commerce.png"
          alt="Cinematic agent landscape"
          fill
          className="object-cover opacity-20 mix-blend-screen grayscale-[50%]"
          priority
        />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />

        {/* Gradient Fade up */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base/90 via-transparent to-transparent z-10" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center sm:text-left">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Cpu className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                The leading edge
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
              AI agents are <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">economic actors.</span><br />
              They need money that works.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
              Agents are buying compute, selling data, and paying for API access.
              They need money that works without identity, without bank accounts,
              without anyone&apos;s permission. Bitcoin + Lightning + ecash is the only
              system that qualifies.
            </p>
          </ScrollReveal>
        </section>

        {/* This Isn't About Robots */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
              <div className="mb-16 max-w-3xl">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                  This isn&apos;t about robots.
                </h2>
                <p className="text-lg text-text-secondary leading-relaxed">
                  AI agents sound abstract until you see what they do for real people in a real community.
                </p>
              </div>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.15}>
              <div className="grid md:grid-cols-3 gap-6">
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all h-full">
                    <CircleDollarSign className="w-6 h-6 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Maria&apos;s taco truck</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Maria tapes a QR code to her window. Customers scan, pay in ecash, she sees sats instantly. No chargebacks, no Square fees. A privacy-audit agent checks her setup weekly and flags anything exposed.
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all h-full">
                    <Radio className="w-6 h-6 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Jake the node runner</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Jake deployed a cycle-signals agent on his community&apos;s infrastructure. It watches on-chain metrics and sells alerts to subscribers at 200 sats per request. He earns sats while he sleeps.
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all h-full">
                    <Search className="w-6 h-6 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Sarah the organizer</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Sarah runs the Boulder Bitcoin meetup. She checks the community health dashboard before each meeting — active wallets, transaction volume, merchant count — and shares the metrics to keep everyone motivated.
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </div>
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

        {/* Two Payment Flows */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6 text-center">
                Two payment flows. Same network.
              </h2>
              <p className="text-text-secondary text-lg text-center max-w-2xl mx-auto mb-12">
                Humans and agents both transact in sats. The experience is different. The rails are identical.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-8">
              <ScrollReveal direction="left" delay={0.2}>
                <div className="glass-heavy border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                  <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                  <h3 className="text-sm font-mono tracking-widest text-accent uppercase mb-6 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Human Payment
                  </h3>
                  <div className="space-y-4 text-sm text-text-secondary">
                    <p>Scan QR code at counter</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p>Ecash sends from your wallet</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p>Merchant sees sats instantly</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p className="text-green-400">Done.</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border-default grid grid-cols-3 gap-4 font-mono text-xs">
                    <div>
                      <span className="text-text-muted block">TIME</span>
                      <span className="text-text-primary">2 seconds</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">COST</span>
                      <span className="text-green-400">Zero</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">PRIVACY</span>
                      <span className="text-accent">Total</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.3}>
                <div className="glass-heavy border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                  <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                  <h3 className="text-sm font-mono tracking-widest text-accent uppercase mb-6 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Agent Payment
                  </h3>
                  <div className="space-y-4 text-sm text-text-secondary">
                    <p>Hit API endpoint</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p>Receive 402 challenge + invoice</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p>Pay Lightning invoice automatically</p>
                    <div className="pl-2 border-l border-accent/30 ml-2 h-4" />
                    <p className="text-green-400">Data served.</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border-default grid grid-cols-3 gap-4 font-mono text-xs">
                    <div>
                      <span className="text-text-muted block">TIME</span>
                      <span className="text-text-primary">800ms</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">COST</span>
                      <span className="text-text-primary">500 sats</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">IDENTITY</span>
                      <span className="text-accent">None</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* How L402 Works & MCP Integration */}
        <section className="relative w-full border-t border-border-subtle overflow-hidden">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-[100%] z-0" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-16 relative z-10">

            {/* Left */}
            <ScrollReveal direction="right">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-text-primary mb-6">
                  How L402 Works
                </h2>
                <p className="text-text-secondary leading-relaxed mb-10 text-lg font-light">
                  L402 is how machines pay each other on the internet. Think of it like a
                  vending machine — put in sats, get the product. Any API endpoint becomes
                  a pay-per-request service. No accounts, no API keys, no billing departments.
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
                      <span className="text-accent">HTTP 402 — WWW-Authenticate: L402 macaroon=&quot;...&quot; invoice=&quot;...&quot;</span>
                    </div>
                    <div>
                      <span className="text-text-muted">3. Agent pays LN invoice:</span><br />
                      <span className="text-text-primary">payInvoice(&quot;lnbc500n1...&quot;)</span> → preimage
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
            </ScrollReveal>

            {/* Right  */}
            <ScrollReveal direction="left" delay={0.2}>
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
                  ].map((item, idx) => (
                    <div key={item.title} className="glass border border-border-default rounded-lg p-5 glow-card">
                      <item.icon className="w-5 h-5 text-accent mb-3" />
                      <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                      <p className="text-xs text-text-secondary">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
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
                  humanUse: "a security checkup for your financial privacy",
                  endpoint: "/agent?svc=privacy",
                },
                {
                  icon: Bot,
                  name: "Cycle Signals",
                  price: "200 sats",
                  desc: "On-chain cycle positioning for decision support. Live MVRV, NUPL.",
                  humanUse: "watches the market for you, alerts when it matters",
                  endpoint: "/agent?svc=signals",
                },
                {
                  icon: Server,
                  name: "Data Market",
                  price: "1000 sats",
                  desc: "Aggregated community metrics, merchant data, flow analysis.",
                  humanUse: "community health metrics for organizers",
                  endpoint: "/agent?svc=data",
                },
                {
                  icon: Cpu,
                  name: "Compute",
                  price: "2000 sats",
                  desc: "On-demand compute tasks: batch token operations, ZK verifications.",
                  humanUse: "back-end infrastructure that keeps the economy running",
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
                  <p className="text-xs text-text-secondary leading-relaxed mb-2 flex-grow">
                    {agent.desc}
                  </p>
                  <p className="text-[11px] text-accent/70 font-mono mb-4">
                    → {agent.humanUse}
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

      </div >
    </div >
  );
}
