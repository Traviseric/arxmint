#!/usr/bin/env node
// Generate merchant logos via image-engine AI-invoke API
// Usage: node scripts/generate-merchant-logos.js

const fs = require("fs");
const path = require("path");

const API_URL = "https://www.bookcovergenerator.ai/api/ai-invoke/generate-app-asset";
const SERVICE_KEY = "te_svc_orchestrator_flux";

const MERCHANTS = [
  {
    slug: "conversos",
    name: "Conversos",
    prompt: "Modern minimalist logo for 'Conversos' — an AI chat intelligence platform. Speech bubble merging with neural network nodes. Dark background, orange and white accents. Tech-forward, clean, recognizable at small sizes.",
  },
  {
    slug: "profileengine",
    name: "ProfileEngine",
    prompt: "Modern minimalist logo for 'ProfileEngine' — an AI psychological profiling platform. Abstract human silhouette with layered rings representing personality layers. Dark background, orange and blue-white accents. Clean, professional.",
  },
  {
    slug: "marketingos",
    name: "MarketingOS",
    prompt: "Modern minimalist logo for 'MarketingOS' — an AI marketing automation platform. Abstract megaphone or growth chart merged with circuit lines. Dark background, orange and white accents. Bold, clean, tech-forward.",
  },
  {
    slug: "analyticsos",
    name: "AnalyticsOS",
    prompt: "Modern minimalist logo for 'AnalyticsOS' — a behavioral web analytics platform. Abstract eye or graph merged with data points. Dark background, orange and teal accents. Clean, data-driven aesthetic.",
  },
  {
    slug: "detection-lab",
    name: "Detection Lab",
    prompt: "Modern minimalist logo for 'Detection Lab' — a behavioral biometrics and bot detection engine. Abstract fingerprint or shield with scanning lines. Dark background, orange and red accents. Security-focused, sharp, professional.",
  },
  {
    slug: "formforge",
    name: "FormForge",
    prompt: "Modern minimalist logo for 'FormForge' — a drop-in form API platform. Abstract form/document shape being forged with a hammer or anvil motif. Dark background, orange and white accents. Clean, utilitarian.",
  },
  {
    slug: "domainos",
    name: "DomainOS",
    prompt: "Modern minimalist logo for 'DomainOS' — an AI domain intelligence platform. Abstract globe or brain merged with a .com cursor. Dark background, orange and white accents. Smart, discovery-oriented.",
  },
  {
    slug: "faviforge",
    name: "FaviForge",
    prompt: "Modern minimalist logo for 'FaviForge' — an AI favicon generator. Tiny pixel grid forming a larger icon shape, forge/spark motif. Dark background, orange and white accents. Crisp, pixel-perfect aesthetic.",
  },
  {
    slug: "video-engine",
    name: "Video Engine",
    prompt: "Modern minimalist logo for 'Video Engine' — an AI video production platform. Abstract play button merged with film reel or engine gear. Dark background, orange and white accents. Cinematic, bold.",
  },
  {
    slug: "audio-engine",
    name: "Audio Engine",
    prompt: "Modern minimalist logo for 'Audio Engine' — an AI audio production platform. Abstract sound wave merged with engine gear or headphones. Dark background, orange and purple accents. Musical, clean.",
  },
  {
    slug: "revenue-engine",
    name: "RevenueEngine",
    prompt: "Modern minimalist logo for 'RevenueEngine' — a cross-service revenue intelligence platform. Abstract ascending bar chart merged with engine/gear motif. Dark background, orange and green accents. Growth-oriented, professional.",
  },
];

const OUTPUT_DIR = path.join(__dirname, "..", "public", "images", "merchants");

async function generateLogo(merchant) {
  console.log(`Generating: ${merchant.name} (${merchant.slug})...`);

  const outputPath = path.join(OUTPUT_DIR, `${merchant.slug}.png`);
  if (fs.existsSync(outputPath)) {
    console.log(`  SKIP: ${merchant.slug}.png already exists`);
    return { slug: merchant.slug, status: "skipped" };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": SERVICE_KEY,
      },
      body: JSON.stringify({
        prompt: merchant.prompt,
        appName: merchant.name,
        assetType: "app_icon",
        aspectRatio: "ASPECT_1_1",
        provider: "nanobanana",
        quality: "STANDARD",
        category: "productivity",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  FAIL: ${merchant.slug} — ${res.status}: ${err}`);
      return { slug: merchant.slug, status: "failed", error: err };
    }

    const data = await res.json();
    const imageUrl = data.url || data.result?.imageUrl || data.result?.cachedUrl || data.imageUrl;

    if (!imageUrl) {
      console.error(`  FAIL: ${merchant.slug} — no imageUrl in response`);
      return { slug: merchant.slug, status: "failed", error: "no imageUrl" };
    }

    // Download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`  FAIL: ${merchant.slug} — could not download image`);
      return { slug: merchant.slug, status: "failed", error: "download failed" };
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`  OK: ${merchant.slug}.png (${(buffer.length / 1024).toFixed(1)} KB)`);
    return { slug: merchant.slug, status: "ok", size: buffer.length };
  } catch (e) {
    console.error(`  FAIL: ${merchant.slug} — ${e.message}`);
    return { slug: merchant.slug, status: "failed", error: e.message };
  }
}

async function main() {
  console.log(`Generating ${MERCHANTS.length} merchant logos via image-engine...\n`);

  // Run 3 at a time to avoid rate limits
  const results = [];
  for (let i = 0; i < MERCHANTS.length; i += 3) {
    const batch = MERCHANTS.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(generateLogo));
    results.push(...batchResults);
  }

  console.log("\n--- Summary ---");
  const ok = results.filter(r => r.status === "ok").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const failed = results.filter(r => r.status === "failed").length;
  console.log(`OK: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed:");
    results.filter(r => r.status === "failed").forEach(r =>
      console.log(`  ${r.slug}: ${r.error}`)
    );
  }
}

main().catch(console.error);
