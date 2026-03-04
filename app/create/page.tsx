import { MerchantSetupWizard } from "@/components/merchant-setup-wizard";
import { Zap } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function CreatePage() {
  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden min-h-screen selection:bg-accent/30 pt-32 pb-24">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/roadmap_bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.07] mix-blend-screen" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-base via-bg-base/80 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-bg-base via-bg-base/50 to-transparent z-10" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-accent/30 bg-accent/5 mb-8">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono text-accent uppercase tracking-widest">
                Beta Preview
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 drop-shadow-md">
              Set Up Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                Payment Node.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-primary font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              Three questions. One command. Self-hosted Bitcoin payments
              with near-zero fees, instant settlement, and no middleman.
            </p>
          </ScrollReveal>
        </div>

        {/* Wizard */}
        <ScrollReveal delay={0.4} direction="up">
          <div className="glass-heavy border border-border-default rounded-xl p-4 sm:p-8 max-w-3xl mx-auto glow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 w-full overflow-hidden">
              <MerchantSetupWizard />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
