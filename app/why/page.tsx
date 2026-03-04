import {
  ArrowRight,
  Ban,
  Building2,
  CheckCircle,
  CircleDollarSign,
  Cpu,
  Globe,
  Lock,
  Shield,
  Store,
  Users,
  Zap,
} from "lucide-react";

import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

export const metadata = {
  title: "Why ArxMint — Accept Bitcoin. Zero Fees. No Middleman.",
  description:
    "There's no good way for a small business to accept Bitcoin. Easy options are custodial. Sovereign options are hard. ArxMint is the middle ground that didn't exist.",
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

        {/* ═══════════════════════════════════════════════
            HERO — Lead with the merchant problem
        ═══════════════════════════════════════════════ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center sm:text-left">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Store className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                For business owners
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
              Your customers pay.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                You keep 100%.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed mb-10">
              Accept Bitcoin at your business with zero processing fees, instant settlement, and no middleman.
              Your customers pay with any Bitcoin wallet they already have. You get the money immediately.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <a href="/merchants" className="antigravity-btn !px-8 !py-3 inline-flex items-center gap-2 text-base">
              Become a Merchant
              <ArrowRight className="w-4 h-4" />
            </a>
          </ScrollReveal>
        </section>

        {/* ═══════════════════════════════════════════════
            THE PROBLEM — Plain language
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The problem.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-16">
                You want to accept Bitcoin at your business. But your options today aren&apos;t great.
              </p>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.15}>
              <div className="grid md:grid-cols-3 gap-6">
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <CircleDollarSign className="w-6 h-6 text-red-400 mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Strike, OpenNode, Square</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Easy to set up, but they hold your money, require ID verification, charge fees, and can freeze your account whenever they want. You traded one middleman for another.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <Ban className="w-6 h-6 text-red-400 mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">BTCPay Server</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Truly self-hosted and sovereign. But you need a server, Docker, Lightning channel management, and DNS setup. Realistic for developers — not for most business owners.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="glass rounded-xl p-8 glow-card border-red-500/10 transition-all h-full">
                    <Building2 className="w-6 h-6 text-red-400 mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Nothing</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      This is what most businesses choose. They&apos;d accept Bitcoin, but the custodial options defeat the purpose and the sovereign options are too hard. So they stay on Stripe.
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            THE ANSWER — What ArxMint does
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                ArxMint is the option<br />that didn&apos;t exist.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-16">
                The sovereignty of running your own node. The simplicity of signing up for Stripe. No compromise.
              </p>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.12}>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: CircleDollarSign, title: "Zero processing fees", desc: "Lightning routing costs less than a penny per transaction. Stripe charges 2.9% + 30\u00a2. On $10K/month, that\u2019s $320/month you\u2019re losing." },
                  { icon: Zap, title: "Instant settlement", desc: "Money hits your wallet in seconds. Not 2\u20133 business days. Not \u201cpending.\u201d Instantly yours." },
                  { icon: Lock, title: "Your money, your control", desc: "No one can freeze your account, hold your funds, or shut you down. There\u2019s no middleman to do it." },
                  { icon: Ban, title: "No chargebacks", desc: "Bitcoin payments are final. No disputed charges, no fraud reversals, no chargeback fees." },
                  { icon: Shield, title: "No KYC or ID required", desc: "You don\u2019t need to submit ID, tax forms, or bank statements to accept Bitcoin from your customers." },
                  { icon: Globe, title: "Works online and in person", desc: "QR code at the counter or a payment button on your website. Same system, same instant settlement." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <StaggerItem key={i}>
                    <div className="glass rounded-xl p-6 glow-card border-accent/10 transition-all h-full">
                      <div className="flex gap-4 items-start">
                        <Icon className="w-5 h-5 text-accent shrink-0 mt-1" />
                        <div>
                          <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
                          <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            HOW IT WORKS — Both sides, plain language
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-16">
                How it works.
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-12">
              <ScrollReveal delay={0.1}>
                <div className="glass-heavy border border-border-default rounded-xl p-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-xs font-mono text-accent uppercase tracking-wider">Your customers</span>
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-4">
                    They don&apos;t need anything new.
                  </h3>
                  <p className="text-text-secondary leading-relaxed mb-6">
                    Any Bitcoin wallet they already have works — Cash App, Strike, Phoenix, Muun, Wallet of Satoshi, Blue Wallet, Zeus, or any other Lightning wallet.
                  </p>
                  <p className="text-text-secondary leading-relaxed mb-6">
                    Customer scans a QR code, confirms the amount, done. No app to download, no account to create.
                  </p>
                  <div className="border-t border-border-default pt-4 text-xs text-text-muted font-mono">
                    If their wallet speaks Lightning, it works with your business.
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="glass-heavy border border-accent/20 rounded-xl p-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
                    <Store className="w-4 h-4 text-accent" />
                    <span className="text-xs font-mono text-accent uppercase tracking-wider">Your business</span>
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-4">
                    You keep every dollar.
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Funds go directly to your wallet — not held by anyone",
                      "Settlement in seconds, not days",
                      "No monthly fees, no per-transaction fees",
                      "No account applications or approval process",
                      "Run Stripe and ArxMint side by side during transition",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-sm text-text-secondary">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            COMPARISON TABLE
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The comparison.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-12">
                Here&apos;s how ArxMint stacks up against what&apos;s available today.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="text-left py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider" />
                      <th className="text-center py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">Stripe</th>
                      <th className="text-center py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">Strike / OpenNode</th>
                      <th className="text-center py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">BTCPay Server</th>
                      <th className="text-center py-3 px-4 text-accent font-mono text-xs uppercase tracking-wider">ArxMint</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {[
                      ["Fees", "2.9% + 30\u00a2", "1\u20132%", "0%", "0%"],
                      ["Settlement", "2\u20133 days", "Same day", "Instant", "Instant"],
                      ["You hold the money", "No", "No", "Yes", "Yes"],
                      ["KYC required", "Yes", "Yes", "No", "No"],
                      ["Can freeze your funds", "Yes", "Yes", "No", "No"],
                      ["Setup difficulty", "Easy", "Easy", "Hard", "Easy"],
                      ["Chargebacks", "Yes", "Limited", "No", "No"],
                      ["Any wallet can pay", "Cards only", "Lightning", "Lightning + on-chain", "Lightning + on-chain"],
                      ["Open source", "No", "No", "Yes", "Yes"],
                    ].map(([label, stripe, strike, btcpay, arx], i) => (
                      <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-elevated/50 transition-colors">
                        <td className="py-3 px-4 text-text-primary font-medium text-left">{label}</td>
                        <td className="py-3 px-4 text-center">{stripe}</td>
                        <td className="py-3 px-4 text-center">{strike}</td>
                        <td className="py-3 px-4 text-center">{btcpay}</td>
                        <td className="py-3 px-4 text-center text-accent font-medium">{arx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="mt-8 bg-black/40 border-l-2 border-accent p-6 text-sm text-text-secondary leading-relaxed">
                <span className="text-accent font-medium">Bottom line:</span> ArxMint is the only option that is self-custodial, easy to set up, and open source — all at the same time.
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            THE MATH
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The math.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-12">
                Every dollar Stripe takes is a dollar that leaves your business.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="text-left py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">Monthly Revenue</th>
                      <th className="text-center py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">Stripe Fees / Year</th>
                      <th className="text-center py-3 px-4 text-text-muted font-mono text-xs uppercase tracking-wider">ArxMint Fees / Year</th>
                      <th className="text-center py-3 px-4 text-accent font-mono text-xs uppercase tracking-wider">You Save</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {[
                      ["$5,000", "$1,920", "~$0", "$1,920"],
                      ["$10,000", "$3,840", "~$0", "$3,840"],
                      ["$50,000", "$17,760", "~$0", "$17,760"],
                      ["$100,000", "$36,000", "~$0", "$36,000"],
                    ].map(([rev, stripe, arx, savings], i) => (
                      <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-elevated/50 transition-colors">
                        <td className="py-3 px-4 text-text-primary font-medium">{rev}</td>
                        <td className="py-3 px-4 text-center text-red-400">{stripe}</td>
                        <td className="py-3 px-4 text-center">{arx}</td>
                        <td className="py-3 px-4 text-center text-accent font-semibold">{savings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="mt-8 glass-heavy border border-accent/20 rounded-xl p-8 text-center">
                <p className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
                  $76,800<span className="text-accent">/year</span>
                </p>
                <p className="text-text-secondary">
                  saved by a community of 20 merchants averaging $10K/month each.
                  <br />
                  <span className="text-text-muted text-sm">That&apos;s money that stays local instead of going to payment processors.</span>
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            CIRCULAR ECONOMY — Why this matters for a community
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                Better together.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-16">
                One business accepting Bitcoin is good. A whole community doing it changes everything.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-8">
              <ScrollReveal delay={0.1}>
                <div className="glass rounded-xl p-8 border-red-500/10 h-full">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Today: money leaves</h3>
                  <div className="space-y-3 text-sm text-text-secondary">
                    <p>Customer pays merchant via Stripe. Stripe takes 2.9%.</p>
                    <p>Merchant pays supplier via Stripe. Stripe takes 2.9% again.</p>
                    <p>Every transaction leaks money out of your community to payment processors, card networks, and banks.</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="glass rounded-xl p-8 border-accent/20 h-full">
                  <h3 className="text-lg font-semibold text-accent mb-4">With ArxMint: money stays</h3>
                  <div className="space-y-3 text-sm text-text-secondary">
                    <p>Customer pays merchant in sats. Zero fees.</p>
                    <p>Merchant pays supplier in sats. Zero fees.</p>
                    <p>Supplier pays another local business in sats. Money circulates locally instead of being extracted by middlemen.</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.3}>
              <div className="mt-8 bg-black/40 border-l-2 border-accent p-6 text-sm text-text-secondary leading-relaxed">
                <span className="text-accent font-medium">This is a circular economy.</span> Not buying and holding — actually spending and earning Bitcoin as money. The more merchants in your area that join, the more valuable the network becomes for everyone.
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            MERCHANT CTA
        ═══════════════════════════════════════════════ */}
        <section className="relative py-24 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base to-bg-surface z-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] bg-accent/10 blur-[100px] rounded-[100%] z-0" />

          <ScrollReveal direction="up">
            <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
              <h2 className="text-4xl sm:text-5xl font-semibold text-text-primary mb-6 tracking-tight">
                Ready to keep <span className="text-accent">100%</span>?
              </h2>
              <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
                Join the merchants building the first fully interconnected Bitcoin economy in Colorado.
                Sign up takes two minutes.
              </p>
              <a href="/merchants" className="antigravity-btn !px-10 !py-4 text-lg inline-flex items-center gap-2">
                Become a Merchant
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════════════════════════════════════════
            DEEPER — For technical readers / grant reviewers
        ═══════════════════════════════════════════════ */}
        <section className="relative w-full border-t border-border-subtle bg-bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
                <Cpu className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                  Under the hood
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-6">
                The technology exists.<br />The integration didn&apos;t.
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl leading-relaxed mb-16">
                ArxMint integrates the best open-source Bitcoin tools into one deployable system.
                Each is powerful alone — but connecting them takes weeks of DevOps.
                ArxMint does it in minutes.
              </p>
            </ScrollReveal>

            <StaggerContainer staggerDelay={0.1}>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <Zap className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Lightning Network</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Instant Bitcoin payments. Any Lightning wallet can pay — Cash App, Strike, Phoenix, and hundreds more.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <Shield className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Cashu Ecash</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Private digital cash tokens. Payments are unlinkable — the merchant can&apos;t track who paid what.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <Lock className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Fedimint</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Community-governed custody. Trusted local members run a shared vault — no single point of failure.
                    </p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-bg-elevated border border-border-default rounded-xl p-8 glow-card relative overflow-hidden h-full">
                    <Cpu className="w-8 h-8 text-accent mb-6" />
                    <h3 className="text-lg font-semibold text-text-primary mb-3">L402 for AI Agents</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      AI programs can buy and sell services using the same payment rails. No identity, no accounts required.
                    </p>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>

            <ScrollReveal delay={0.3}>
              <div className="mt-8 bg-black/40 border-l-2 border-accent p-6 text-sm text-text-secondary leading-relaxed">
                <span className="text-accent font-medium">Open source.</span> Self-hostable. No vendor lock-in. ArxMint is the integration layer — more deployments mean more real-world users for every ecash and federation project in the ecosystem.
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════════════ */}
        <section className="relative py-24 border-t border-border-subtle overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-surface to-bg-base z-0" />

          <ScrollReveal direction="up">
            <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
              <h2 className="text-3xl sm:text-4xl font-semibold text-text-primary mb-6 tracking-tight">
                Bitcoin was supposed to be money.<br />
                <span className="text-accent">Let&apos;s make it money.</span>
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <a href="/merchants" className="antigravity-btn !px-10 !py-4 text-lg w-full sm:w-auto inline-flex items-center justify-center gap-2">
                  Become a Merchant
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a href="/create" className="antigravity-btn-outline !px-10 !py-4 text-lg w-full sm:w-auto inline-flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5" />
                  Create Your Economy
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </div>
    </div>
  );
}
