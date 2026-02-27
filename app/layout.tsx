import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "ArxMint — Sovereign Bitcoin Economies",
  description:
    "Spin up your own private Bitcoin economy in minutes. Fedimint federations, Cashu mints, Lightning AI agents — censorship-resistant rails for the parallel voluntary economy.",
  metadataBase: new URL("https://arxmint.com"),
  openGraph: {
    title: "ArxMint — Sovereign Bitcoin Economies",
    description:
      "Your Bitcoin economy, one prompt away. Private Fedimint/Cashu mints with Lightning AI agent rails.",
    url: "https://arxmint.com",
    siteName: "ArxMint",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArxMint — Sovereign Bitcoin Economies",
    description:
      "Your Bitcoin economy, one prompt away. Private Fedimint/Cashu mints with Lightning AI agent rails.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-bg-base text-text-primary font-sans selection:bg-accent/30 selection:text-white`}>
        <NavBar />

        {/* Main content */}
        <main className="pt-16">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border-default py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
              <p>ArxMint — Financial privacy as a human right.</p>
              <p>Censorship-resistant rails for humans + autonomous AI agents.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
