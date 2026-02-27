import {
  Shield,
  Cpu,
  Users,
  Zap,
  Lock,
  ArrowRight,
  Globe,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-btc-orange/5 blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-btc-orange/30 bg-btc-orange/5 text-btc-orange text-sm mb-8">
            <Zap className="w-4 h-4" />
            <span>Built on Lightning + Fedimint + Cashu — Feb 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-sovereign-white leading-tight mb-6">
            Spin up your own{" "}
            <span className="text-btc-orange">private Bitcoin economy</span>{" "}
            in minutes
          </h1>

          <p className="text-lg sm:text-xl text-sovereign-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            One prompt. Private Fedimint federations, Cashu mints, Lightning AI
            agent rails, and built-in privacy defaults. The parallel voluntary
            economy — for humans and autonomous agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="/create" className="sovereign-btn text-lg !px-8 !py-4">
              Create Your Community
              <ArrowRight className="w-5 h-5" />
            </a>
            <a href="/dashboard" className="sovereign-btn-outline text-lg !px-8 !py-4">
              View Dashboard
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-2xl font-bold text-btc-orange">21M</div>
              <div className="text-xs text-sovereign-muted mt-1">
                Fixed supply
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-btc-orange">L402</div>
              <div className="text-xs text-sovereign-muted mt-1">
                Agent commerce
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-btc-orange">0 KYC</div>
              <div className="text-xs text-sovereign-muted mt-1">
                No identity required
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* Three pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center text-sovereign-white mb-4">
          The sovereign bridge
        </h2>
        <p className="text-center text-sovereign-muted mb-16 max-w-2xl mx-auto">
          Not another wallet. The actual exit ramp — private money rails where
          humans and AI agents share the same sovereign infrastructure.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* For Humans */}
          <div className="sovereign-card group">
            <div className="w-12 h-12 rounded-xl bg-btc-orange/10 flex items-center justify-center mb-4 group-hover:bg-btc-orange/20 transition-colors">
              <Shield className="w-6 h-6 text-btc-orange" />
            </div>
            <h3 className="text-xl font-bold text-sovereign-white mb-3">
              For Humans
            </h3>
            <p className="text-sovereign-muted text-sm leading-relaxed mb-4">
              Self-custody ecash backed by real BTC. Private transactions inside
              your community. No surveillance, no KYC, no banks. Fedimint
              federations with trusted local guardians.
            </p>
            <ul className="space-y-2 text-sm text-sovereign-muted">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-btc-orange" />
                Silent Payments + CoinJoin defaults
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-btc-orange" />
                Federated e-cash (untraceable inside mint)
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-btc-orange" />
                Local circular economy directory
              </li>
            </ul>
          </div>

          {/* For Agents */}
          <div className="sovereign-card group border-btc-orange/20">
            <div className="w-12 h-12 rounded-xl bg-btc-orange/10 flex items-center justify-center mb-4 group-hover:bg-btc-orange/20 transition-colors">
              <Cpu className="w-6 h-6 text-btc-orange" />
            </div>
            <h3 className="text-xl font-bold text-sovereign-white mb-3">
              For AI Agents
            </h3>
            <p className="text-sovereign-muted text-sm leading-relaxed mb-4">
              Native Lightning rails via MCP. Agents sell data, buy compute, and
              transact in sats — no identity, no banks, no permission needed.
              L402 paywalls for machine-to-machine commerce.
            </p>
            <ul className="space-y-2 text-sm text-sovereign-muted">
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-btc-orange" />
                Lightning Agent Kit (7 skills)
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-btc-orange" />
                L402 paywalls (pay-per-request)
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-btc-orange" />
                MCP server for Claude / any agent
              </li>
            </ul>
          </div>

          {/* For Communities */}
          <div className="sovereign-card group">
            <div className="w-12 h-12 rounded-xl bg-btc-orange/10 flex items-center justify-center mb-4 group-hover:bg-btc-orange/20 transition-colors">
              <Users className="w-6 h-6 text-btc-orange" />
            </div>
            <h3 className="text-xl font-bold text-sovereign-white mb-3">
              For Communities
            </h3>
            <p className="text-sovereign-muted text-sm leading-relaxed mb-4">
              Spin a full private economy for your meetup, town, or network.
              One-click Fedimint federation with chat, merchant directory, and
              agent marketplace. The Bitcoin Beach model, automated.
            </p>
            <ul className="space-y-2 text-sm text-sovereign-muted">
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-btc-orange" />
                Prompt-driven community creation
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-btc-orange" />
                Docker one-command deploy
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-btc-orange" />
                0.2% mint fee = income in sats
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center text-sovereign-white mb-16">
          How it works
        </h2>

        <div className="space-y-12">
          {[
            {
              step: "01",
              title: "Describe your community",
              desc: 'Type a natural language prompt: "Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data."',
            },
            {
              step: "02",
              title: "ArxMint generates everything",
              desc: "AI parses your prompt and generates a full Fedimint federation config (or lightweight Cashu mint), Lightning agent integration, privacy defaults, and Docker deployment.",
            },
            {
              step: "03",
              title: "One-command deploy",
              desc: "Run docker compose up. Your sovereign economy is live — private ecash mint, Lightning node, L402 agent endpoints, cycle dashboard. Share the invite link.",
            },
            {
              step: "04",
              title: "Humans + agents join the same loop",
              desc: "Community members transact in private ecash. AI agents sell services for sats via L402. The same rails, no distinction. The parallel voluntary economy — running.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-btc-orange/10 flex items-center justify-center text-btc-orange font-bold">
                {item.step}
              </div>
              <div>
                <h3 className="text-lg font-bold text-sovereign-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sovereign-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="glow-line" />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-sovereign-white mb-6">
          The parallel system is being built.
          <br />
          <span className="text-btc-orange">Be the one who builds it.</span>
        </h2>
        <p className="text-sovereign-muted mb-10 max-w-xl mx-auto">
          Sound money infrastructure for a parallel voluntary economy.
          Protection from hacks, overreach, and future controls. Not evasion —
          sovereignty.
        </p>
        <a href="/create" className="sovereign-btn text-lg !px-10 !py-4">
          Launch Your Sovereign Community
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>
    </div>
  );
}
