"use client";

// ============================================================
// ArxMint — Bazaar Marketplace
// Browse and buy products with Bitcoin Lightning.
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Star, Zap, Package } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { BazaarProduct, BazaarCollection } from "@/lib/types";

const CATEGORIES = [
  "All",
  "AI & Consciousness",
  "Science & Reality",
  "Future Paradigms",
  "Hidden Patterns",
];

function FormatBadge({ format }: { format: string }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-neutral-200 text-neutral-500">
      {format}
    </span>
  );
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
      <span className="text-xs text-text-muted ml-1">{rating}</span>
    </div>
  );
}

function ProductCard({ product }: { product: BazaarProduct }) {
  return (
    <Link href={`/bazaar/${product.id}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-neutral-200 rounded-xl overflow-hidden cursor-pointer group h-full flex flex-col"
      >
        {/* Cover image */}
        <div className="relative w-full aspect-[2/3] bg-neutral-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.coverImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
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
          {product.author && (
            <p className="text-xs text-neutral-500 mb-2">{product.author}</p>
          )}
          <p className="text-xs text-neutral-600 leading-relaxed mb-3 line-clamp-2">
            {product.description}
          </p>

          {product.rating && <StarRating rating={product.rating} />}

          {/* Formats */}
          <div className="flex flex-wrap gap-1 mt-2">
            {product.format.map((f) => (
              <FormatBadge key={f} format={f} />
            ))}
          </div>

          {/* Price */}
          <div className="mt-auto pt-3 flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-[#F7931A]">
                {product.priceSats.toLocaleString()} sats
              </span>
              {product.originalPriceUsd && (
                <span className="text-xs text-neutral-400 line-through ml-2">
                  ${product.originalPriceUsd}
                </span>
              )}
            </div>
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

function CollectionCard({ collection, products }: { collection: BazaarCollection; products: BazaarProduct[] }) {
  const collectionProducts = products.filter((p) =>
    collection.productIds.includes(p.id)
  );

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#F7931A]/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-[#F7931A]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              {collection.title}
            </h3>
            {collection.badge && (
              <span className="inline-flex px-2 py-0.5 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/20 text-[#F7931A] text-[10px] font-mono uppercase tracking-wider">
                {collection.badge}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          {collection.description}
        </p>

        {/* Mini book covers */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {collectionProducts.map((p) => (
            <Link
              key={p.id}
              href={`/bazaar/${p.id}`}
              className="flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.coverImage}
                alt={p.title}
                className="w-16 h-24 object-cover rounded-md border border-neutral-200 hover:border-[#F7931A]/40 transition-colors"
              />
            </Link>
          ))}
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div>
            <span className="text-xl font-bold text-[#F7931A]">
              {collection.priceSats.toLocaleString()} sats
            </span>
            {collection.originalPriceUsd && (
              <span className="text-sm text-neutral-400 line-through ml-2">
                ${collection.originalPriceUsd}
              </span>
            )}
          </div>
          <Link
            href={`/pay/seed-teneo?amount=${collection.priceSats}&memo=${encodeURIComponent(collection.title)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F7931A] text-white text-sm font-medium hover:bg-[#F7931A]/90 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Buy Collection
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BazaarPage() {
  const [products, setProducts] = useState<BazaarProduct[]>([]);
  const [collections, setCollections] = useState<BazaarCollection[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");

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
        const res = await fetch("/api/bazaar");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setCollections(data.collections);
        }
      } catch {
        // Graceful degradation
      }
    }
    load();
  }, []);

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div
      data-theme="merchant"
      className="relative overflow-x-hidden min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Full-bleed light background */}
      <div
        className="fixed inset-0 z-0"
        style={{ background: "#fafafa" }}
      />

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
              Buy and sell with Bitcoin Lightning. Zero fees. No middlemen.
              Every purchase settles instantly in sats.
            </p>
          </ScrollReveal>
        </section>

        {/* Category filter pills */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <ScrollReveal delay={0.4}>
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORIES.map((cat) => (
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

        {/* Product grid */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {filtered.length === 0 ? (
            <ScrollReveal>
              <div className="bg-white border border-neutral-200 border-dashed rounded-xl p-16 text-center">
                <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">
                  No products in this category yet.
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

        {/* Collections */}
        {collections.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
                Collections
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collections.map((collection, i) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <CollectionCard
                    collection={collection}
                    products={products}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
