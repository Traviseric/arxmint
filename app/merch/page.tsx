"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Zap,
  CreditCard,
  Loader2,
  CheckCircle,
  ChevronDown,
  Package,
  Minus,
  Plus,
  ArrowLeft,
  X,
} from "lucide-react";
import { MERCH_PRODUCTS, formatUsd, formatSats, type MerchProduct, type MerchVariant } from "@/lib/merch/products";

type CartItem = {
  product: MerchProduct;
  variant: MerchVariant;
  quantity: number;
};

type ShippingAddress = {
  email: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type Category = "all" | "sticker" | "apparel" | "hat";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  sticker: "Stickers",
  apparel: "Tees",
  hat: "Hats",
};

export default function MerchPage() {
  const [category, setCategory] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState<ShippingAddress>({
    email: "", fullName: "", street: "", city: "", state: "", zip: "",
  });
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingLightning, setLoadingLightning] = useState(false);
  const [lightningData, setLightningData] = useState<{
    invoice: string; sessionId: string; totalSats: number;
  } | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Check URL params for success redirect from Stripe
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const stripeSuccess = params?.get("success") === "1";

  const filtered = category === "all"
    ? MERCH_PRODUCTS
    : MERCH_PRODUCTS.filter((p) => p.category === category);

  const addToCart = useCallback((product: MerchProduct) => {
    const variantId = selectedVariants[product.id] || product.variants[0].id;
    const variant = product.variants.find((v) => v.id === variantId)!;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant.id === variant.id,
      );
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
    setShowCart(true);
  }, [selectedVariants]);

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotalUsd = cart.reduce((sum, item) => sum + item.variant.priceUsd * item.quantity, 0);
  const cartTotalSats = cart.reduce((sum, item) => sum + item.variant.priceSats * item.quantity, 0);

  const shippingComplete =
    shipping.email.includes("@") &&
    shipping.fullName.length > 0 &&
    shipping.street.length > 0 &&
    shipping.city.length > 0 &&
    shipping.state.length === 2 &&
    shipping.zip.length >= 5;

  // Stripe checkout
  const handleStripeCheckout = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            variantId: item.variant.id,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Stripe checkout error:", err);
    } finally {
      setLoadingStripe(false);
    }
  };

  // Lightning checkout
  const handleLightningCheckout = async () => {
    if (!shippingComplete) {
      setShowShipping(true);
      return;
    }
    setLoadingLightning(true);
    try {
      const res = await fetch("/api/merch/lightning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            variantId: item.variant.id,
            quantity: item.quantity,
          })),
          shipping,
        }),
      });
      const data = await res.json();
      if (data.invoice) {
        setLightningData(data);
      }
    } catch (err) {
      console.error("Lightning checkout error:", err);
    } finally {
      setLoadingLightning(false);
    }
  };

  // Success state (from Stripe redirect or Lightning confirmation)
  if (stripeSuccess || orderSuccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Order Confirmed</h1>
          <p className="text-[var(--text-secondary)] mb-2">
            Your ArxMint merch is on its way. Printful will print and ship directly to you.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            You&apos;ll receive tracking info via email once shipped.
          </p>
          <Link href="/merch" className="antigravity-btn inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Back to Merch
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-1 inline-block">
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
              arxmint.com
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[var(--accent)]" />
              ArxMint Merch
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Rep the citadel. Pay with Lightning or card.
            </p>
          </div>

          {/* Cart button */}
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--accent)]/50 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-[var(--text-secondary)]" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent)] text-black text-xs font-bold flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category pills */}
        <div className="flex gap-2 mb-8">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const selectedVarId = selectedVariants[product.id] || product.variants[0].id;
            const selectedVar = product.variants.find((v) => v.id === selectedVarId) || product.variants[0];

            return (
              <div
                key={product.id}
                className="sovereign-card group"
              >
                {/* Product image placeholder */}
                <div className="aspect-square bg-[var(--bg-elevated)] rounded-lg mb-4 flex items-center justify-center border border-[var(--border-default)] overflow-hidden">
                  <Package className="w-16 h-16 text-[var(--text-muted)] opacity-30 group-hover:opacity-50 transition-opacity" />
                </div>

                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Variant selector */}
                {product.variants.length > 1 && (
                  <div className="relative mb-3">
                    <select
                      value={selectedVarId}
                      onChange={(e) =>
                        setSelectedVariants((prev) => ({ ...prev, [product.id]: e.target.value }))
                      }
                      className="sovereign-input w-full appearance-none pr-8 text-sm"
                    >
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-xl font-mono font-bold text-[var(--accent)]">
                    {formatUsd(selectedVar.priceUsd)}
                  </span>
                  <span className="text-sm font-mono text-[var(--text-muted)]">
                    ~{formatSats(selectedVar.priceSats)}
                  </span>
                </div>

                {/* Add to cart */}
                <button
                  onClick={() => addToCart(product)}
                  className="antigravity-btn w-full !py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart slide-over */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-default)] h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Cart</h2>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-[var(--text-muted)] text-center py-12">Your cart is empty</p>
              ) : (
                <>
                  {/* Cart items */}
                  <div className="space-y-4 mb-6">
                    {cart.map((item, index) => (
                      <div
                        key={`${item.product.id}-${item.variant.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]"
                      >
                        <div className="w-14 h-14 rounded bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-[var(--text-muted)] opacity-30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{item.variant.label}</p>
                          <p className="text-sm font-mono text-[var(--accent)]">
                            {formatUsd(item.variant.priceUsd)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="p-1 rounded hover:bg-[var(--bg-base)]"
                          >
                            <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </button>
                          <span className="w-6 text-center text-sm font-mono text-[var(--text-primary)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="p-1 rounded hover:bg-[var(--bg-base)]"
                          >
                            <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 rounded hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4 text-[var(--text-muted)] hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-[var(--border-default)] pt-4 mb-6">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-[var(--text-secondary)]">Total</span>
                      <span className="text-xl font-mono font-bold text-[var(--text-primary)]">
                        {formatUsd(cartTotalUsd)}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-sm font-mono text-[var(--text-muted)]">
                        ~{formatSats(cartTotalSats)}
                      </span>
                    </div>
                  </div>

                  {/* Shipping form (for Lightning) */}
                  {showShipping && !lightningData && (
                    <div className="border border-[var(--border-default)] rounded-lg p-4 mb-4 space-y-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Shipping Address</p>
                      <input
                        type="email"
                        placeholder="Email"
                        value={shipping.email}
                        onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                        className="sovereign-input w-full text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={shipping.fullName}
                        onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                        className="sovereign-input w-full text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={shipping.street}
                        onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                        className="sovereign-input w-full text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          value={shipping.city}
                          onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                          className="sovereign-input flex-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="CO"
                          value={shipping.state}
                          onChange={(e) =>
                            setShipping({ ...shipping, state: e.target.value.toUpperCase().slice(0, 2) })
                          }
                          className="sovereign-input w-16 text-center text-sm"
                          maxLength={2}
                        />
                        <input
                          type="text"
                          placeholder="ZIP"
                          value={shipping.zip}
                          onChange={(e) =>
                            setShipping({ ...shipping, zip: e.target.value.replace(/\D/g, "").slice(0, 5) })
                          }
                          className="sovereign-input w-20 text-center text-sm"
                          maxLength={5}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lightning invoice display */}
                  {lightningData && (
                    <div className="border border-[var(--accent)]/30 rounded-lg p-4 mb-4 bg-[var(--accent)]/5">
                      <p className="text-sm font-medium text-[var(--accent)] mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Lightning Invoice — {formatSats(lightningData.totalSats)}
                      </p>
                      <div className="bg-[var(--bg-base)] rounded p-2 mb-2">
                        <p className="text-xs font-mono text-[var(--text-muted)] break-all">
                          {lightningData.invoice.slice(0, 40)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(lightningData.invoice)}
                          className="flex-1 text-sm py-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/50 text-[var(--text-secondary)]"
                        >
                          Copy Invoice
                        </button>
                        <a
                          href={`lightning:${lightningData.invoice}`}
                          className="flex-1 text-sm py-2 rounded-lg text-center bg-[var(--accent)] text-black font-medium"
                        >
                          Open Wallet
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Payment buttons */}
                  {!lightningData && (
                    <div className="space-y-3">
                      <button
                        onClick={handleLightningCheckout}
                        disabled={loadingLightning}
                        className="w-full py-3 rounded-xl bg-[var(--accent)] text-black font-semibold flex items-center justify-center gap-2 hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
                      >
                        {loadingLightning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        {showShipping && !shippingComplete
                          ? "Enter shipping address above"
                          : `Pay ${formatSats(cartTotalSats)} with Lightning`}
                      </button>

                      <button
                        onClick={handleStripeCheckout}
                        disabled={loadingStripe}
                        className="w-full py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] font-medium flex items-center justify-center gap-2 hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                      >
                        {loadingStripe ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        Pay {formatUsd(cartTotalUsd)} with Card
                      </button>

                      <p className="text-xs text-[var(--text-muted)] text-center">
                        Stripe collects shipping. Lightning requires address above.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] mt-16 py-8">
        <p className="text-center text-sm text-[var(--text-muted)]">
          Powered by{" "}
          <Link href="/" className="text-[var(--accent)] hover:underline">
            ArxMint
          </Link>
          {" "}&middot; Printed & shipped by Printful &middot; Lightning + Card accepted
        </p>
      </footer>
    </div>
  );
}
