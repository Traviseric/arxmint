// ============================================================
// ArxMint — Bazaar Seed Catalog
// Ported from teneo-marketplace catalog.json
// ============================================================

import type { BazaarProduct, BazaarCollection } from "@/lib/types";

// Approximate conversion rate for MVP (1 USD ≈ 1000 sats)
const SATS_PER_USD = 1000;

function usdToSats(usd: number): number {
  return Math.round(usd * SATS_PER_USD);
}

export const SEED_PRODUCTS: BazaarProduct[] = [
  {
    id: "consciousness-revolution",
    merchantId: "seed-teneo",
    title: "The Consciousness Revolution",
    author: "Dr. Marcus Reid & Teneo AI",
    description: "How AI is revealing the true nature of human awareness",
    longDescription:
      "This groundbreaking work reveals how artificial intelligence is uncovering the hidden mechanics of consciousness itself.",
    priceSats: usdToSats(29.99),
    priceUsd: 29.99,
    originalPriceUsd: 49.99,
    category: "AI & Consciousness",
    coverImage:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 412,
    rating: 4.9,
    badge: "AI ENHANCED",
  },
  {
    id: "pattern-code",
    merchantId: "seed-teneo",
    title: "The Pattern Code",
    author: "Alexandra Sterling & Teneo AI",
    description: "Decoding the hidden algorithms that govern reality",
    longDescription:
      "Discover the mathematical patterns that underlie all existence. This AI-enhanced exploration reveals how reality operates on fundamental algorithms.",
    priceSats: usdToSats(34.99),
    priceUsd: 34.99,
    originalPriceUsd: 54.99,
    category: "Science & Reality",
    coverImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 389,
    rating: 4.8,
    badge: "BESTSELLER",
  },
  {
    id: "simulation-theory-decoded",
    merchantId: "seed-teneo",
    title: "Simulation Theory Decoded",
    author: "Professor Zhang Wei & Teneo AI",
    description: "AI reveals the computational nature of our universe",
    longDescription:
      "This work reveals compelling evidence that our universe operates on computational principles, analyzed from millions of data points.",
    priceSats: usdToSats(39.99),
    priceUsd: 39.99,
    originalPriceUsd: 59.99,
    category: "Future Paradigms",
    coverImage:
      "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 445,
    rating: 4.7,
    badge: "CONTROVERSIAL",
  },
  {
    id: "collective-unconscious-mapped",
    merchantId: "seed-teneo",
    title: "The Collective Unconscious: Mapped by AI",
    author: "Dr. Elena Vasquez & Teneo AI",
    description: "First complete map of humanity's shared psyche",
    longDescription:
      "Using advanced neural networks, Teneo AI has created the first comprehensive map of Jung's collective unconscious.",
    priceSats: usdToSats(44.99),
    priceUsd: 44.99,
    originalPriceUsd: 64.99,
    category: "AI & Consciousness",
    coverImage:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 523,
    rating: 4.9,
    badge: "ACADEMIC",
  },
  {
    id: "quantum-success-formula",
    merchantId: "seed-teneo",
    title: "The Quantum Success Formula",
    author: "Michael Chen & Teneo AI",
    description: "AI discovers the quantum mechanics of achievement",
    longDescription:
      "Teneo's quantum AI has uncovered the hidden quantum principles that govern success and achievement.",
    priceSats: usdToSats(32.99),
    priceUsd: 32.99,
    originalPriceUsd: 52.99,
    category: "Hidden Patterns",
    coverImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 356,
    rating: 4.8,
    badge: "PRACTICAL",
  },
  {
    id: "future-human-ai-merge",
    merchantId: "seed-teneo",
    title: "The Future Human: AI-Enhanced Evolution",
    author: "Dr. Kenji Nakamura & Teneo AI",
    description: "The inevitable merger of human and artificial intelligence",
    longDescription:
      "This visionary work reveals the inevitable path of human-AI integration and the transformations that will redefine humanity.",
    priceSats: usdToSats(49.99),
    priceUsd: 49.99,
    originalPriceUsd: 69.99,
    category: "Future Paradigms",
    coverImage:
      "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=400&h=600&fit=crop",
    format: ["ebook", "audiobook", "hardcover"],
    pages: 478,
    rating: 4.9,
    badge: "FUTURE",
  },
];

export const SEED_COLLECTIONS: BazaarCollection[] = [
  {
    id: "truth-seeker-collection",
    merchantId: "seed-teneo",
    name: "Truth Seeker Collection",
    title: "Complete Revolutionary Library",
    description: "Every paradigm-shifting book created with Teneo AI",
    productIds: [
      "consciousness-revolution",
      "pattern-code",
      "simulation-theory-decoded",
      "collective-unconscious-mapped",
      "quantum-success-formula",
      "future-human-ai-merge",
    ],
    priceSats: usdToSats(149.99),
    priceUsd: 149.99,
    originalPriceUsd: 374.94,
    savings: 60,
    badge: "Save 60%",
  },
  {
    id: "consciousness-trilogy",
    merchantId: "seed-teneo",
    name: "Consciousness Trilogy",
    title: "The Complete Consciousness Collection",
    description: "Master the AI revelations about human awareness",
    productIds: [
      "consciousness-revolution",
      "collective-unconscious-mapped",
      "future-human-ai-merge",
    ],
    priceSats: usdToSats(89.99),
    priceUsd: 89.99,
    originalPriceUsd: 164.97,
    savings: 45,
    badge: "Essential Reading",
  },
];
