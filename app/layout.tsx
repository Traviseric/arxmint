import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { StorageHydrator } from "@/components/storage-hydrator";
import Image from "next/image";
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
  title: "ArxMint — The Sovereign Payment Network",
  description:
    "The sovereign payment network. Self-hosted Bitcoin infrastructure — the open-source Stripe alternative. Near-zero fees, instant settlement, no chargebacks. Three questions, one command, live in 15 minutes.",
  metadataBase: new URL("https://arxmint.com"),
  openGraph: {
    title: "ArxMint — The Sovereign Payment Network",
    description:
      "The sovereign payment network. Self-hosted Bitcoin payment infrastructure. The open-source Stripe alternative. Near-zero fees, instant settlement, no KYC, no chargebacks.",
    url: "https://arxmint.com",
    siteName: "ArxMint",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArxMint — The Sovereign Payment Network",
    description:
      "The sovereign payment network. Self-hosted Bitcoin payment infrastructure. The open-source Stripe alternative. Near-zero fees, instant settlement, no KYC, no chargebacks.",
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-btc-orange focus:text-black focus:font-medium focus:text-sm"
        >
          Skip to main content
        </a>
        <StorageHydrator />
        <NavBar />

        {/* Main content */}
        <main id="main" className="pt-16">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border-default py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-4">
                <Image src="/images/wordmark.png" alt="ArxMint Wordmark" width={96} height={18} className="opacity-80" />
                <p className="hidden md:block text-text-muted text-xs border-l border-border-default pl-4">Financial privacy as a human right.</p>
              </div>
              <p className="text-xs">Censorship-resistant rails for humans + autonomous AI agents.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
