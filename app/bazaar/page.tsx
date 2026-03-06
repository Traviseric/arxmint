"use client";

// ============================================================
// ArxMint — Bazaar Marketplace
// Fetches product catalog from OpenBazaar.ai, renders storefront.
// Payments route through ArxMint's /pay/ checkout.
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Star, Zap, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

const OPENBAZAAR_API = "https://openbazaar.ai/api/storefront";

interface StorefrontProduct {
  id: string;
  title: string;
  description: string;
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
          className={`w-3 h-3 ${
            i < Math.floor(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-neutral-300"
          }`}
        />
      ))}
      <span className="text-xs text-neutral-400 ml-1">{rating}</span>
    </div>
  );
}

function ProductCard({ product }: { product: StorefrontProduct }) {
  const displayPrice =
    product.currency === "sats"
      ? `${product.price.toLocaleString()} sats`
      : `$${(product.price / 100).toFixed(2)}`;

  return (
    <Link href={`/bazaar/${product.id}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden cursor-pointer group h-full flex flex-col"
      >
        {/* Product image */}
        <div className="relative w-full aspect-square bg-neutral-100 overflow-hidden">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <ShoppingBag className="w-12 h-12" />
            </div>
          )}
          {product.badge && (
            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-mono uppercase tracking-wider">
              {product.badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-1 group-hover:text-[#F7931A] transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed mb-3 line-clamp-2">
            {product.description}
          </p>

          {product.rating && <StarRating rating={product.rating} />}

          {/* Variants preview */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.variants.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-neutral-200 text-neutral-500"
                >
                  {v.options.length} {v.name.toLowerCase()}s
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mt-auto pt-3 flex items-center justify-between">
            <span className="text-base font-bold text-[#F7931A]">
              {displayPrice}
            </span>
            <div className="flex items-center gap-1 text-xs text-[#F7931A] font-medium">
              <Zap className="w-3 h-3" />
              Buy
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function BazaarPage() {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        const res = await fetch(`${OPENBAZAAR_API}/catalog`);
        if (res.ok) {
          const data = await res.json();
          const active = (data.products || []).filter(
            (p: StorefrontProduct) => p.active
          );
          setProducts(active);
          setCategories(data.categories || []);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const allCategories = ["All", ...categories];

  return (
    <div
      data-theme="merchant"
      className="relative overflow-x-hidden min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Full-bleed light background */}
      <div className="fixed inset-0 z-0" style={{ background: "#fafafa" }} />

      {/* Background ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-[#F7931A]/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[#F7931A]/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Decentralized Commerce
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
              The Open{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                Bazaar
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
              ArxMint gear, paid with Bitcoin Lightning. Zero fees. No middlemen.
              Every purchase settles instantly in sats.
            </p>
          </ScrollReveal>
        </section>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <ScrollReveal delay={0.4}>
              <div className="flex flex-wrap gap-2 justify-center">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? "bg-[#F7931A] text-white"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:border-[#F7931A]/40 hover:text-[#F7931A]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </ScrollReveal>
          </section>
        )}

        {/* Product grid */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-neutral-500 text-sm">Loading catalog...</p>
            </div>
          ) : error ? (
            <ScrollReveal>
              <div className="bg-white border border-neutral-200 border-dashed rounded-xl p-16 text-center">
                <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 mb-2">
                  Store is being set up. Check back soon.
                </p>
                <p className="text-neutral-400 text-sm">
                  Powered by{" "}
                  <a
                    href="https://openbazaar.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F7931A] hover:underline"
                  >
                    OpenBazaar.ai
                  </a>
                </p>
              </div>
            </ScrollReveal>
          ) : filtered.length === 0 ? (
            <ScrollReveal>
              <div className="bg-white border border-neutral-200 border-dashed rounded-xl p-16 text-center">
                <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">
                  {activeCategory === "All"
                    ? "Products coming soon. Stay tuned."
                    : "No products in this category yet."}
                </p>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Powered by OpenBazaar.ai */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 text-center">
            <p className="text-sm text-neutral-600 mb-3">
              This store is built with{" "}
              <a
                href="https://openbazaar.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F7931A] font-semibold hover:underline"
              >
                OpenBazaar.ai
              </a>{" "}
              — the open-source marketplace builder.
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Fork it. Build your own. Payments by ArxMint.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://openbazaar.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-sm text-neutral-700 hover:border-[#F7931A]/40 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                OpenBazaar.ai
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/Traviseric/openbazaar-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-sm text-neutral-700 hover:border-[#F7931A]/40 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Source Code
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
