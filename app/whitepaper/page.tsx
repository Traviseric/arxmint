import fs from "fs";
import path from "path";
import { WhitepaperContent } from "./whitepaper-content";
import { FileText, Github, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata = {
  title: "ArxMint — Sovereign Payment Network Whitepaper",
  description:
    "A Unified Framework for Human and AI Agent Commerce in Sovereign Bitcoin Circular Economies.",
};

export default function WhitepaperPage() {
  const filePath = path.join(process.cwd(), "docs", "whitepaper.md");
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (_error) {
    content = "# Whitepaper not found";
  }

  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden min-h-screen selection:bg-accent/30">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/roadmap_bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.07] mix-blend-screen" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-base via-bg-base/80 to-transparent z-10" />
      </div>

      {/* Hero */}
      <div className="relative z-10 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Technical Whitepaper
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-6 drop-shadow-md">
              A Unified Framework for Human and AI Agent Commerce in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                Sovereign Bitcoin Circular Economies.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg text-text-primary font-medium max-w-2xl mx-auto leading-relaxed mb-8 drop-shadow">
              Version 1.1 - <span className="text-text-secondary font-light">March 2026</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/Traviseric/arxmint/blob/master/docs/reference/whitepaper.md"
                target="_blank"
                rel="noopener noreferrer"
                className="antigravity-btn !px-6 !py-3 !text-sm w-full sm:w-auto"
              >
                <Github className="w-4 h-4 mr-2" />
                View Source on GitHub
              </a>
              <a
                href="/roadmap"
                className="antigravity-btn-outline !px-6 !py-3 !text-sm w-full sm:w-auto text-text-secondary"
              >
                View Roadmap
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Whitepaper Content */}
      <div className="relative z-10 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal delay={0.4} direction="up">
            <div className="glass-heavy border border-border-default rounded-xl p-6 sm:p-10 lg:p-16 glow-card whitepaper-static-card relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10 w-full overflow-hidden">
                <WhitepaperContent content={content} />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
