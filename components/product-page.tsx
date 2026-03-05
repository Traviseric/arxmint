"use client";

// ============================================================
// ArxMint — Product Detail Page (Client Component)
// Full product view with cover, metadata, and Lightning checkout.
// ============================================================

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Zap, BookOpen, Headphones, BookMarked } from "lucide-react";
import { motion } from "framer-motion";
import type { BazaarProduct } from "@/lib/types";

const FORMAT_ICONS: Record<string, typeof BookOpen> = {
  ebook: BookOpen,
  audiobook: Headphones,
  hardcover: BookMarked,
};

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

export function ProductPage({ product }: { product: BazaarProduct }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  const checkoutUrl = `/pay/${product.merchantId}?amount=${product.priceSats}&memo=${encodeURIComponent(product.title)}`;

  return (
    <div
      data-theme="merchant"
      className="relative min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Full-bleed light background */}
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
          {/* Cover image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-100 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.coverImage}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {product.badge && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/70 text-white text-xs font-mono uppercase tracking-wider">
                  {product.badge}
                </div>
              )}
            </div>
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight mb-2">
              {product.title}
            </h1>

            {product.author && (
              <p className="text-base text-neutral-500 mb-4">
                by {product.author}
              </p>
            )}

            {product.rating && (
              <div className="mb-4">
                <StarRating rating={product.rating} />
              </div>
            )}

            <p className="text-base text-neutral-700 leading-relaxed mb-6">
              {product.longDescription || product.description}
            </p>

            {/* Formats */}
            <div className="mb-6">
              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Available Formats
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.format.map((f) => {
                  const Icon = FORMAT_ICONS[f] || BookOpen;
                  return (
                    <div
                      key={f}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-600"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{f}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pages */}
            {product.pages && (
              <p className="text-sm text-neutral-500 mb-6">
                {product.pages} pages
              </p>
            )}

            {/* Price + CTA */}
            <div className="mt-auto bg-white border border-neutral-200 rounded-xl p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-[#F7931A]">
                  {product.priceSats.toLocaleString()} sats
                </span>
                {product.priceUsd && (
                  <span className="text-sm text-neutral-400">
                    ~${product.priceUsd}
                  </span>
                )}
                {product.originalPriceUsd && (
                  <span className="text-sm text-neutral-400 line-through">
                    ${product.originalPriceUsd}
                  </span>
                )}
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

            {/* Merchant link */}
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <Link
                href="/merchants"
                className="text-sm text-[#F7931A] hover:text-[#F7931A]/80 transition-colors"
              >
                About the Merchant &rarr;
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
