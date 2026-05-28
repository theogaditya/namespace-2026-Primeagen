/**
 * Badge Seed Data
 * 
 * Seeds all achievement badges into the database.
 * Run with: npx prisma db seed
 * 
 * NOTE: This file will have TypeScript errors until you run:
 *   npx prisma migrate dev --name add_badges
 *   npx prisma generate
 */

// Using string literals for enums since they won't exist until migration
type BadgeCategory = "FILING" | "ENGAGEMENT" | "RESOLUTION" | "CATEGORY_SPECIALIST";
type BadgeRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

interface BadgeSeedData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  threshold: number;
}

const badges: BadgeSeedData[] = [
  // ============================================
  // FILING BADGES - Complaint filing milestones
  // ============================================
  {
    slug: "first_step",
    name: "First Step",
    description: "File your first complaint",
    icon: "Seedling",
    category: "FILING",
    rarity: "COMMON",
    threshold: 1,
  },
  {
    slug: "active_reporter",
    name: "Active Reporter",
    description: "File 3 complaints",
    icon: "Clipboard",
    category: "FILING",
    rarity: "COMMON",
    threshold: 3,
  },
  {
    slug: "vocal_citizen",
    name: "Vocal Citizen",
    description: "File 15 complaints",
    icon: "Megaphone",
    category: "FILING",
    rarity: "UNCOMMON",
    threshold: 15,
  },
  {
    slug: "public_voice",
    name: "Public Voice",
    description: "File 50 complaints",
    icon: "Microphone",
    category: "FILING",
    rarity: "RARE",
    threshold: 50,
  },
  {
    slug: "watchdog",
    name: "Watchdog",
    description: "File 100 complaints",
    icon: "Newspaper",
    category: "FILING",
    rarity: "EPIC",
    threshold: 100,
  },
  {
    slug: "democracy_champion",
    name: "Democracy Champion",
    description: "File 250 complaints",
    icon: "Building",
    category: "FILING",
    rarity: "LEGENDARY",
    threshold: 250,
  },

  // ============================================
  // ENGAGEMENT BADGES - Likes received
  // ============================================
  {
    slug: "appreciated",
    name: "Appreciated",
    description: "Receive 3 total likes",
    icon: "ThumbsUp",
    category: "ENGAGEMENT",
    rarity: "COMMON",
    threshold: 3,
  },
  {
    slug: "rising_star",
    name: "Rising Star",
    description: "Receive 10 total likes",
    icon: "Star",
    category: "ENGAGEMENT",
    rarity: "COMMON",
    threshold: 10,
  },
  {
    slug: "trending_voice",
    name: "Trending Voice",
    description: "Get 50+ likes on a single complaint",
    icon: "Flame",
    category: "ENGAGEMENT",
    rarity: "RARE",
    threshold: 50, // Special: checked per complaint, not total
  },
  {
    slug: "community_favorite",
    name: "Community Favorite",
    description: "Receive 500 total likes",
    icon: "Gem",
    category: "ENGAGEMENT",
    rarity: "EPIC",
    threshold: 500,
  },
  {
    slug: "influencer",
    name: "Influencer",
    description: "Receive 2000 total likes",
    icon: "Crown",
    category: "ENGAGEMENT",
    rarity: "LEGENDARY",
    threshold: 2000,
  },

  // ============================================
  // RESOLUTION BADGES - Complaints resolved
  // ============================================
  {
    slug: "problem_identified",
    name: "Problem Identified",
    description: "First complaint resolved",
    icon: "CheckCircle",
    category: "RESOLUTION",
    rarity: "COMMON",
    threshold: 1,
  },
  {
    slug: "fixer",
    name: "Fixer",
    description: "3 complaints resolved",
    icon: "Wrench",
    category: "RESOLUTION",
    rarity: "COMMON",
    threshold: 3,
  },
  {
    slug: "problem_solver",
    name: "Problem Solver",
    description: "10 complaints resolved",
    icon: "Tool",
    category: "RESOLUTION",
    rarity: "UNCOMMON",
    threshold: 10,
  },
  {
    slug: "change_maker",
    name: "Change Maker",
    description: "50 complaints resolved",
    icon: "Trophy",
    category: "RESOLUTION",
    rarity: "RARE",
    threshold: 50,
  },
  {
    slug: "impact_legend",
    name: "Impact Legend",
    description: "100 complaints resolved",
    icon: "Sparkles",
    category: "RESOLUTION",
    rarity: "EPIC",
    threshold: 100,
  },

  // ============================================
  // CATEGORY BADGES - Department specialists
  // ============================================
  {
    slug: "road_warrior",
    name: "Road Warrior",
    description: "5 complaints in Roads/Transport",
    icon: "Car",
    category: "CATEGORY_SPECIALIST",
    rarity: "UNCOMMON",
    threshold: 5,
  },
  {
    slug: "water_guardian",
    name: "Water Guardian",
    description: "5 complaints in Water/Sanitation",
    icon: "Droplet",
    category: "CATEGORY_SPECIALIST",
    rarity: "UNCOMMON",
    threshold: 5,
  },
  {
    slug: "power_ranger",
    name: "Power Ranger",
    description: "5 complaints in Electricity",
    icon: "Zap",
    category: "CATEGORY_SPECIALIST",
    rarity: "UNCOMMON",
    threshold: 5,
  },
  {
    slug: "eco_warrior",
    name: "Eco Warrior",
    description: "5 complaints in Environment",
    icon: "Tree",
    category: "CATEGORY_SPECIALIST",
    rarity: "UNCOMMON",
    threshold: 5,
  },
  {
    slug: "health_advocate",
    name: "Health Advocate",
    description: "5 complaints in Healthcare",
    icon: "Heart",
    category: "CATEGORY_SPECIALIST",
    rarity: "UNCOMMON",
    threshold: 5,
  },
];

// This will be imported after prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

async function seedBadges() {
  // Dynamic import to avoid errors before prisma generate
  const { getPrisma } = await import("../lib/prisma");
  
  prisma = getPrisma();
  
  console.log("🏅 Seeding badges...");

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
      create: badge,
    });
    console.log(`  ✓ ${badge.name} (${badge.rarity})`);
  }

  console.log(`\n✅ Seeded ${badges.length} badges successfully!`);
}

// Run if called directly
seedBadges()
  .catch((e) => {
    console.error("❌ Error seeding badges:", e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma?.$disconnect) {
      await prisma.$disconnect();
    }
  });

export { seedBadges, badges };