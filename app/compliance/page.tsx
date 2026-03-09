import { FileText, Shield, HelpCircle, ExternalLink, Mail, ChevronRight } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance — ArxMint",
  description:
    "ArxMint compliance documentation for merchant procurement teams: legal position paper, security overview, and FAQ covering Bitcoin Lightning payment acceptance.",
};

const GITHUB_BASE =
  "https://github.com/Traviseric/arxmint/blob/master/docs/compliance-kit";

const documents = [
  {
    icon: FileText,
    title: "Legal Position Paper",
    description:
      "Plain-language legal analysis of Bitcoin Lightning payment acceptance: regulatory status, money transmission, GDPR/CCPA, and tax treatment across major jurisdictions.",
    href: `${GITHUB_BASE}/legal-position-paper.md`,
    length: "~1,800 words",
    audience: "Legal counsel, compliance officers",
  },
  {
    icon: Shield,
    title: "Security Overview",
    description:
      "Technical security document for IT review: architecture diagram, data flows, authentication, encryption standards, PCI-DSS scope analysis, and planned audit timeline.",
    href: `${GITHUB_BASE}/security-overview.md`,
    length: "~1,600 words",
    audience: "IT security teams, CTOs",
  },
  {
    icon: HelpCircle,
    title: "Merchant Procurement FAQ",
    description:
      "20 most common questions from procurement teams: legality, money transmission, AML/KYC, GDPR, chargebacks, tax accounting, security audits, and disaster recovery.",
    href: `${GITHUB_BASE}/faq.md`,
    length: "20 Q&A pairs",
    audience: "Procurement teams, finance directors",
  },
];

const highlights = [
  {
    label: "PCI-DSS scope",
    value: "Out of scope",
    note: "Bitcoin Lightning does not involve cardholder data",
  },
  {
    label: "Customer PII collected",
    value: "None by default",
    note: "Payments are pseudonymous — no name, email, or card numbers",
  },
  {
    label: "Money transmitter license",
    value: "Not required",
    note: "Merchant acceptance ≠ money transmission (FinCEN FIN-2013-G001)",
  },
  {
    label: "Chargebacks",
    value: "Impossible",
    note: "Lightning payments are final — no chargeback fraud risk",
  },
  {
    label: "Data plane owner",
    value: "You (self-hosted)",
    note: "ArxMint never holds funds or customer data",
  },
  {
    label: "External security audit",
    value: "Planned",
    note: "Roadmap 6.1 — budget allocated, scheduling in progress",
  },
];

export default function CompliancePage() {
  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-accent/4 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/50 via-bg-base/80 to-bg-base" />
      </div>

      <div className="relative z-10 w-full">

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center sm:text-left">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Compliance
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
              Compliance{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                Documentation
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-2xl leading-relaxed">
              Resources for merchant procurement teams, legal counsel, and IT security reviewers.
              Bitcoin Lightning is simpler to approve than it looks.
            </p>
          </ScrollReveal>
        </section>

        {/* Compliance Highlights */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <ScrollReveal delay={0.1}>
            <h2 className="text-xl font-semibold text-text-primary mb-6">At a Glance</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map((h, i) => (
              <ScrollReveal key={h.label} delay={0.05 * i}>
                <div className="glass rounded-xl p-5 border border-border-default h-full">
                  <div className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-2">
                    {h.label}
                  </div>
                  <div className="text-base font-semibold text-accent mb-1">{h.value}</div>
                  <div className="text-xs text-text-secondary leading-relaxed">{h.note}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Documents */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <ScrollReveal delay={0.1}>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Documents</h2>
            <p className="text-sm text-text-secondary mb-8">
              All documents are published on GitHub and updated as regulations evolve.
            </p>
          </ScrollReveal>

          <StaggerContainer staggerDelay={0.12}>
            <div className="space-y-4">
              {documents.map((doc) => (
                <StaggerItem key={doc.title}>
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass rounded-xl p-6 border border-border-default hover:border-accent/30 glow-card transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                        <doc.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-text-secondary leading-relaxed mb-3">
                              {doc.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {doc.length}
                              </span>
                              <span className="text-border-default">·</span>
                              <span>{doc.audience}</span>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-text-secondary shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                        </div>
                      </div>
                    </div>
                  </a>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </section>

        {/* Disclaimer */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScrollReveal>
            <div className="glass rounded-xl p-6 border border-border-default bg-bg-surface/50">
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Disclaimer:</strong> All compliance documents
                are provided for informational purposes only and do not constitute legal or financial
                advice. Laws and regulations vary by jurisdiction and change frequently. Merchants,
                operators, and users should consult qualified legal counsel before making compliance
                decisions. ArxMint does not provide legal services.
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <ScrollReveal>
            <div className="glass rounded-2xl p-8 sm:p-12 border border-border-default text-center">
              <Mail className="w-8 h-8 text-accent mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-text-primary mb-3">
                Request a Compliance Review Call
              </h2>
              <p className="text-text-secondary mb-8 max-w-lg mx-auto">
                Have specific questions for your legal or IT team? We&apos;ll schedule a 30-minute
                call to walk through any compliance concerns before you sign off on the integration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:travis@arxmint.com?subject=Compliance Review Request&body=Hi Travis, I'd like to schedule a compliance review call. Here's what we need to cover: "
                  className="antigravity-btn inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email travis@arxmint.com
                </a>
                <a
                  href="/merchants"
                  className="antigravity-btn-outline inline-flex items-center gap-2"
                >
                  Join the Merchant Network
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </div>
    </div>
  );
}
