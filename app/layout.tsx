import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArxMint — Private Bitcoin Economies for Humans & Agents",
  description:
    "Spin up your own private Bitcoin economy in minutes. Fedimint federations, Cashu mints, Lightning AI agents — censorship-resistant rails for the parallel voluntary economy.",
  keywords: [
    "Bitcoin",
    "sovereignty",
    "Fedimint",
    "Cashu",
    "Lightning",
    "AI agents",
    "L402",
    "ecash",
    "privacy",
    "circular economy",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-sovereign-black font-mono">
        {/* Nav */}
        <nav className="fixed top-0 w-full z-50 border-b border-sovereign-border bg-sovereign-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-btc-orange flex items-center justify-center text-sovereign-black font-bold text-sm">
                AM
              </div>
              <span className="text-lg font-bold text-sovereign-white">
                Arx<span className="text-btc-orange">Mint</span>
              </span>
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/create"
                className="text-sm text-sovereign-muted hover:text-btc-orange transition-colors"
              >
                Create
              </a>
              <a
                href="/dashboard"
                className="text-sm text-sovereign-muted hover:text-btc-orange transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/create"
                className="sovereign-btn text-sm !px-4 !py-2"
              >
                Launch Community
              </a>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="pt-16">{children}</main>

        {/* Footer */}
        <footer className="border-t border-sovereign-border py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-sovereign-muted">
              <p>
                ArxMint — Financial privacy as a human right.
              </p>
              <p>
                Censorship-resistant rails for humans + autonomous AI agents.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
