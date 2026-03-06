"use client";

// ============================================================
// ArxMint — Bazaar Product Detail
// Fetches single product from OpenBazaar.ai, renders detail view.
// ============================================================

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Zap,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

const OPENBAZAAR_API = "https://openbazaar.ai/api/storefront";
const MERCHANT_ID = "arxmint-store";

interface StorefrontProduct {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  variants?: { id: string; name: string; options: string[] }[];
  fulfillment: string;
  active: boolean;
  badge?: string;
  rating?: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.floor(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-neutral-300"
          }`}
        />
      ))}
      <span className="text-sm text-neutral-500 ml-1">{rating}</span>
    </div>
  );
}

export default function BazaarProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${OPENBAZAAR_API}/product/${id}`);
        if (res.ok) {
          setProduct(await res.json());
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div
        data-theme="merchant"
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#fafafa" }}
      >
        <div className="w-8 h-8 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div
        data-theme="merchant"
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "#fafafa", color: "#171717" }}
      >
        <ShoppingBag className="w-12 h-12 text-neutral-300 mb-4" />
        <p className="text-neutral-500 mb-4">Product not found.</p>
        <Link
          href="/bazaar"
          className="text-[#F7931A] hover:underline text-sm"
        >
          Back to Bazaar
        </Link>
      </div>
    );
  }

  const displayPrice =
    product.currency === "sats"
      ? `${product.price.toLocaleString()} sats`
      : `$${(product.price / 100).toFixed(2)}`;

  // Build checkout URL — if price is in USD cents, convert to approximate sats
  const amountSats =
    product.currency === "sats"
      ? product.price
      : Math.round((product.price / 100) * 1000); // ~1000 sats per USD for MVP

  const checkoutUrl = `/pay/${MERCHANT_ID}?amount=${amountSats}&memo=${encodeURIComponent(product.title)}`;

  return (
    <div
      data-theme="merchant"
      className="relative min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      <div className="fixed inset-0 z-0" style={{ background: "#fafafa" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/bazaar"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#F7931A] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bazaar
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 shadow-lg">
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                  <ShoppingBag className="w-16 h-16" />
                </div>
              )}
              {product.badge && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/70 text-white text-xs font-mono uppercase tracking-wider">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Additional images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {product.images.slice(1).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt={`${product.title} ${i + 2}`}
                    className="w-20 h-20 rounded-lg object-cover border border-neutral-200"
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              {product.category}
            </span>

            <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight mb-4">
              {product.title}
            </h1>

            {product.rating && (
              <div className="mb-4">
                <StarRating rating={product.rating} />
              </div>
            )}

            <p className="text-base text-neutral-700 leading-relaxed mb-6">
              {product.longDescription || product.description}
            </p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                {product.variants.map((v) => (
                  <div key={v.id} className="mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                      {v.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((opt) => (
                        <span
                          key={opt}
                          className="inline-flex px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-600"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-neutral-400 mb-6 uppercase tracking-wider">
              {product.fulfillment === "pod"
                ? "Print-on-demand — ships in 3-7 business days"
                : product.fulfillment === "digital"
                  ? "Digital download — instant delivery"
                  : "Physical product"}
            </div>

            {/* Price + CTA */}
            <div className="mt-auto bg-white border border-neutral-200 rounded-xl p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-[#F7931A]">
                  {displayPrice}
                </span>
              </div>

              <Link
                href={checkoutUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#F7931A] text-white font-medium hover:bg-[#F7931A]/90 transition-colors text-base"
              >
                <Zap className="w-5 h-5" />
                Pay with Bitcoin
              </Link>

              <p className="text-xs text-neutral-400 text-center mt-3">
                Instant Lightning settlement. No account required.
              </p>
            </div>

            {/* Powered by */}
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <Link
                href="/merchants"
                className="text-sm text-[#F7931A] hover:text-[#F7931A]/80 transition-colors"
              >
                About the Merchant &rarr;
              </Link>
              <a
                href="https://openbazaar.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-[#F7931A] transition-colors"
              >
                Powered by OpenBazaar.ai
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
