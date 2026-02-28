import fs from "fs";
import path from "path";
import { WhitepaperContent } from "./whitepaper-content";
import { FileText, Github } from "lucide-react";

export const metadata = {
  title: "ArxMint — Whitepaper",
  description:
    "A Unified Framework for Human and AI Agent Commerce in Sovereign Bitcoin Circular Economies.",
};

export default function WhitepaperPage() {
  const filePath = path.join(process.cwd(), "docs", "whitepaper.md");
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden min-h-screen selection:bg-accent/30">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
      </div>

      {/* Hero */}
      <div className="relative z-10 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
              Technical Whitepaper
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
            A Unified Framework for Human and AI Agent Commerce in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
              Sovereign Bitcoin Circular Economies.
            </span>
          </h1>
          <p className="text-lg text-text-secondary font-light max-w-2xl mx-auto leading-relaxed mb-8">
            Version 1.0 — February 2026
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/Traviseric/arxmint/blob/master/docs/whitepaper.md"
              target="_blank"
              rel="noopener noreferrer"
              className="antigravity-btn-outline !px-4 !py-2 !text-sm"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Whitepaper Content */}
      <div className="relative z-10 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-heavy border border-border-default rounded-xl p-6 sm:p-10 lg:p-16">
            <WhitepaperContent content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
