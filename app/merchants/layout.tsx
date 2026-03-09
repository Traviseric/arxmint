import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bitcoin Merchant Network — ArxMint",
  description:
    "Join the ArxMint Bitcoin merchant network. Accept Lightning payments with zero fees. Browse founding merchants, apply to join the pilot, and build a local Bitcoin circular economy.",
  keywords: [
    "Bitcoin merchant",
    "Lightning payments",
    "accept Bitcoin",
    "Bitcoin circular economy",
    "Lightning Network merchant",
    "zero fee payments",
    "Bitcoin POS",
  ],
  openGraph: {
    title: "Bitcoin Merchant Network — ArxMint",
    description:
      "Accept Lightning payments with zero fees. Join the ArxMint Bitcoin merchant network and build a local circular economy.",
    siteName: "ArxMint",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitcoin Merchant Network — ArxMint",
    description: "Accept Lightning payments with zero fees. Zero setup. Zero hardware.",
  },
};

export default function MerchantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
