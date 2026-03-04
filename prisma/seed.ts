// ============================================================
// ArxMint — Prisma Seed
// Run: npx prisma db seed
// ============================================================

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SEED_PLEDGES = [
  {
    businessName: "Glacier Ice Cream",
    contactName: "Tony Karnes",
    email: "tony@glacierparlor.com",
    location: "Fort Collins, CO",
    category: "food-drink",
    website: "https://www.glacierparlor.com",
    reason:
      "Ready to accept Bitcoin for ice cream. Zero fees, instant settlement — the way payments should work. Glacier serves the best homemade ice cream in Colorado and we want to be first to accept sats.",
    emailOptIn: true,
    featured: true,
  },
];

async function main() {
  for (const pledge of SEED_PLEDGES) {
    const existing = await db.merchantPledge.findFirst({
      where: { businessName: pledge.businessName },
    });
    if (existing) {
      console.log(`Skipping "${pledge.businessName}" — already exists`);
      continue;
    }
    const created = await db.merchantPledge.create({ data: pledge });
    console.log(`Seeded: ${created.businessName} (${created.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
