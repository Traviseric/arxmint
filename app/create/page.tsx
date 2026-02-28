import { CreateCommunityForm } from "@/components/create-community-form";
import { Zap } from "lucide-react";

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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
            <Zap className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
              Prompt-Driven Creation
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
            Forge your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
              sovereign community.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary font-light max-w-2xl mx-auto leading-relaxed">
            Describe your community in plain English. ArxMint generates a
            complete Fedimint/Cashu deployment with Lightning agent rails,
            privacy defaults, and Docker configuration — ready to launch.
          </p>
        </div>

        {/* Form */}
        <div className="glass-heavy border border-border-default rounded-xl p-4 sm:p-8 max-w-3xl mx-auto glow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 w-full overflow-hidden">
            <CreateCommunityForm />
          </div>
        </div>
      </div>
    </div>
  );
}
