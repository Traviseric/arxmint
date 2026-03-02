import {
  Ban,
  Building2,
  CircleDollarSign,
  Cpu,
  Globe,
  Lock,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

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
        <div className="absolute inset-0 bg-[url('/images/why_bg.png')] bg-cover bg-center bg-no-repeat opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/50 via-bg-base/80 to-bg-base" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center sm:text-left">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                The thesis
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
              Bitcoin doesn&apos;t need another wallet.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                It needs economies.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
              Everyone&apos;s building on-ramps and off-ramps. Nobody&apos;s building the road.
              ArxMint is the road — private infrastructure where Bitcoin actually circulates
              as money, not just sits in cold storage waiting for a better price.
            </p>
          </ScrollReveal>
        </section>

        {/* The Problem — Holding isn't an economy */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
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
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.15}>
              <div className="grid md:grid-cols-3 gap-6">
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <CircleDollarSign className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Still on fiat rails</h3>
                    <p className="text-sm text-text-secondary leading-relaxed space-y-2">
                      Rent, groceries, gas — all paid in dollars. Bitcoin is a savings account
                      that you convert out of, not money you live on.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <Ban className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">KYC everywhere</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Every exchange, every on-ramp, every &quot;compliant&quot; service builds a map of
                      your financial life. Privacy is opt-in and expensive.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <Building2 className="w-6 h-6 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">No local infrastructure</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Your town has no ecash mint, no private payment rails, no merchant
                      directory. The parallel economy is a concept, not a reality.
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </div>
        </section>

        {/* So What Actually Changes */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                So what actually changes?
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-12">
                Forget the jargon for a minute. Here&apos;s what a Bitcoin circular economy means for your daily life.
              </p>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.15}>
              <div className="space-y-6">
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all">
                    <div className="flex gap-6 items-start">
                      <CircleDollarSign className="w-6 h-6 text-accent shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">&quot;How do I get paid?&quot;</h3>
                        <p className="text-text-secondary leading-relaxed">
                          Community members pay you in sats for real work — teaching a workshop, fixing a bike, designing a logo. The sats land in your wallet instantly. No bank, no 3-5 business days, no fees.
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all">
                    <div className="flex gap-6 items-start">
                      <Users className="w-6 h-6 text-accent shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">&quot;How do merchants accept this?&quot;</h3>
                        <p className="text-text-secondary leading-relaxed">
                          QR code on the counter. Customer scans, sends ecash, merchant sees sats. No card reader, no processor fees, no chargebacks. Works with any phone.
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-accent/10 transition-all">
                    <div className="flex gap-6 items-start">
                      <Lock className="w-6 h-6 text-accent shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">&quot;What happens to my cold storage?&quot;</h3>
                        <p className="text-text-secondary leading-relaxed">
                          Nothing. It stays cold. You peg in a small amount of spending money — like pulling cash from a safe. Your savings don&apos;t move. Your spending sats circulate locally as private ecash.
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </div>
        </section>

        {/* The Technology Exists */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
              <div className="mb-16">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                  The technology exists.<br />The integration doesn&apos;t.
                </h2>
                <p className="text-lg text-text-secondary max-w-3xl leading-relaxed">
                  This isn&apos;t 2018 anymore. The building blocks for a real private Bitcoin
                  economy are production-ready:
                </p>
              </div>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.1}>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pillar Cards */}
                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                    <Lock className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Fedimint</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Federated e-cash with trusted local guardians. Chaumian blind signatures
                      make transactions inside the mint completely private.
                    </p>
                    <p className="text-xs text-accent/70 font-mono mt-3">
                      → trusted community members run a shared vault, your transactions are invisible
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                    <Shield className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Cashu</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Lightweight ecash protocol. Faster to spin up than a federation — ideal for
                      small communities, testing, or single-operator mints.
                    </p>
                    <p className="text-xs text-accent/70 font-mono mt-3">
                      → lightweight version, one person can run it for a small group
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
                    <Zap className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Lightning + L402</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Instant Bitcoin payments over Lightning. turns any API
                      endpoint into a pay-per-request service — native system for AI commerce.
                    </p>
                    <p className="text-xs text-accent/70 font-mono mt-3">
                      → instant payments, any service can charge per use
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="glass-heavy rounded-xl p-8 glow-card relative overflow-hidden border-accent/20 h-full">
                    <div className="absolute top-0 -right-4 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />
                    <Cpu className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">MCP + Agent Tools</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Model Context Protocol hooks AI properly into Lightning.
                      Agents pay invoices, create channels, manage balances seamlessly.
                    </p>
                    <p className="text-xs text-accent/70 font-mono mt-3">
                      → how AI programs plug into the payment system
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>

            <ScrollReveal direction="up" delay={0.4}>
              <div className="mt-8 bg-black/40 border-l-2 border-accent p-6 text-sm text-text-secondary font-mono leading-relaxed">
                <span className="text-accent">STATUS OF CURRENT MARKET:</span> Each of these is a separate project with its own setup, its own docs, its own Docker configs. Stitching them into a working economy takes weeks of DevOps expertise. Most communities never start.
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* The AI Agent Angle */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal direction="up">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-8 text-center sm:text-left">
                AI agents need Bitcoin.<br />Bitcoin needs AI agents.
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-12">
              <ScrollReveal direction="left" delay={0.2}>
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
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.4}>
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
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Why Coffee Shop Owners Should Care About AI Agents */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-8">
                Why should a coffee shop owner care about AI agents?
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="glass-heavy border border-border-default rounded-xl p-8 relative overflow-hidden glow-card">
                <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10" />
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <Zap className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-text-secondary leading-relaxed">
                      <span className="text-text-primary font-medium">Agents generate revenue.</span> A cycle-signals agent running on your community&apos;s infrastructure earns sats from subscribers 24/7. That revenue flows back into the local economy — and some of it gets spent at your shop.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <Shield className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-text-secondary leading-relaxed">
                      <span className="text-text-primary font-medium">Agents automate monitoring.</span> A privacy-audit agent can check your shop&apos;s payment setup, flag misconfigurations, and make sure your customers&apos; transactions stay private — without you learning cryptography.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <Users className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-text-secondary leading-relaxed">
                      <span className="text-text-primary font-medium">Agents bring economic activity.</span> Every agent transaction adds liquidity to your community&apos;s mint. More liquidity means more sats in circulation means more customers walking through your door.
                    </p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border-default font-mono text-sm text-accent/80">
                  Agents are the back office. Humans are the economy. Both run on the same rails.
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Call To Action */}
        <section className="relative py-32 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base to-bg-surface z-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-[100%] z-0" />

          <ScrollReveal direction="up">
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
          </ScrollReveal>
        </section>

      </div>
    </div>
  );
}
