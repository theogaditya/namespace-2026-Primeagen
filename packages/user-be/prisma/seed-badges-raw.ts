/**
 * Badge Seed Script using Raw SQL
 * 
 * Seeds badges directly using SQL to avoid Prisma client issues.
 * Run with: bun run prisma/seed-badges-raw.ts
 */

import { getPrisma } from "../lib/prisma";

const badges = [
  // FILING BADGES
  { slug: "first_step", name: "First Step", description: "File your first complaint", icon: "Seedling", category: "FILING", rarity: "COMMON", threshold: 1 },
  { slug: "active_reporter", name: "Active Reporter", description: "File 3 complaints", icon: "Clipboard", category: "FILING", rarity: "COMMON", threshold: 3 },
  { slug: "vocal_citizen", name: "Vocal Citizen", description: "File 15 complaints", icon: "Megaphone", category: "FILING", rarity: "UNCOMMON", threshold: 15 },
  { slug: "public_voice", name: "Public Voice", description: "File 50 complaints", icon: "Microphone", category: "FILING", rarity: "RARE", threshold: 50 },
  { slug: "watchdog", name: "Watchdog", description: "File 100 complaints", icon: "Newspaper", category: "FILING", rarity: "EPIC", threshold: 100 },
  { slug: "democracy_champion", name: "Democracy Champion", description: "File 250 complaints", icon: "Building", category: "FILING", rarity: "LEGENDARY", threshold: 250 },
  
  // ENGAGEMENT BADGES
  { slug: "appreciated", name: "Appreciated", description: "Receive 3 total likes", icon: "ThumbsUp", category: "ENGAGEMENT", rarity: "COMMON", threshold: 3 },
  { slug: "rising_star", name: "Rising Star", description: "Receive 10 total likes", icon: "Star", category: "ENGAGEMENT", rarity: "COMMON", threshold: 10 },
  { slug: "trending_voice", name: "Trending Voice", description: "Get 50 likes on a single complaint", icon: "TrendingUp", category: "ENGAGEMENT", rarity: "RARE", threshold: 50 },
  { slug: "community_favorite", name: "Community Favorite", description: "Receive 100 total likes", icon: "Heart", category: "ENGAGEMENT", rarity: "EPIC", threshold: 100 },
  { slug: "influencer", name: "Influencer", description: "Receive 500 total likes", icon: "Crown", category: "ENGAGEMENT", rarity: "LEGENDARY", threshold: 500 },
  
  // RESOLUTION BADGES
  { slug: "problem_identified", name: "Problem Identified", description: "Get 1 complaint resolved", icon: "CheckCircle", category: "RESOLUTION", rarity: "COMMON", threshold: 1 },
  { slug: "fixer", name: "Fixer", description: "Get 3 complaints resolved", icon: "Wrench", category: "RESOLUTION", rarity: "COMMON", threshold: 3 },
  { slug: "problem_solver", name: "Problem Solver", description: "Get 10 complaints resolved", icon: "Lightbulb", category: "RESOLUTION", rarity: "UNCOMMON", threshold: 10 },
  { slug: "change_maker", name: "Change Maker", description: "Get 25 complaints resolved", icon: "Zap", category: "RESOLUTION", rarity: "RARE", threshold: 25 },
  { slug: "impact_legend", name: "Impact Legend", description: "Get 50 complaints resolved", icon: "Trophy", category: "RESOLUTION", rarity: "LEGENDARY", threshold: 50 },
  
  // CATEGORY SPECIALIST BADGES
  { slug: "road_warrior", name: "Road Warrior", description: "File 5 infrastructure complaints", icon: "Road", category: "CATEGORY_SPECIALIST", rarity: "UNCOMMON", threshold: 5 },
  { slug: "water_guardian", name: "Water Guardian", description: "File 5 water supply complaints", icon: "Droplet", category: "CATEGORY_SPECIALIST", rarity: "UNCOMMON", threshold: 5 },
  { slug: "power_ranger", name: "Power Ranger", description: "File 5 electricity complaints", icon: "Zap", category: "CATEGORY_SPECIALIST", rarity: "UNCOMMON", threshold: 5 },
  { slug: "eco_warrior", name: "Eco Warrior", description: "File 5 environment complaints", icon: "Leaf", category: "CATEGORY_SPECIALIST", rarity: "UNCOMMON", threshold: 5 },
  { slug: "health_advocate", name: "Health Advocate", description: "File 5 health complaints", icon: "HeartPulse", category: "CATEGORY_SPECIALIST", rarity: "UNCOMMON", threshold: 5 },
];

async function seedBadges() {
  const prisma = getPrisma();
  
  console.log("🏅 Seeding badges using raw SQL...\n");

  for (const badge of badges) {
    const id = crypto.randomUUID();
    
    try {
      await prisma.$executeRaw`
        INSERT INTO badges (id, slug, name, description, icon, category, rarity, threshold, "createdAt")
        VALUES (${id}, ${badge.slug}, ${badge.name}, ${badge.description}, ${badge.icon}, ${badge.category}::"BadgeCategory", ${badge.rarity}::"BadgeRarity", ${badge.threshold}, NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name = ${badge.name},
          description = ${badge.description},
          icon = ${badge.icon},
          category = ${badge.category}::"BadgeCategory",
          rarity = ${badge.rarity}::"BadgeRarity",
          threshold = ${badge.threshold}
      `;
      console.log(`  ✓ ${badge.name} (${badge.rarity})`);
    } catch (error: any) {
      console.error(`  ✗ Failed to seed ${badge.name}:`, error.message);
    }
  }

  console.log(`\n✅ Seeded ${badges.length} badges!`);
  
  // Verify count
  const count = await prisma.$queryRaw<{count: bigint}[]>`SELECT COUNT(*) as count FROM badges`;
  console.log(`📊 Total badges in database: ${count?.[0]?.count ?? 0}`);
  
  await prisma.$disconnect();
}

seedBadges().catch((e) => {
  console.error("❌ Error seeding badges:", e);
  process.exit(1);
});
