// Allow this page to be embedded in iframes on any domain
export const metadata = {
  other: {
    "X-Frame-Options": "ALLOWALL",
  },
};

export default function CheckoutEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
