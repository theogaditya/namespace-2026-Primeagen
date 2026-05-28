/**
 * Debug script to check and manually award badges
 * Run with: bun run prisma/debug-badges.ts
 */

import { getPrisma } from "../lib/prisma";

const userId = "33b338e4-386b-4b9c-986c-87fbf86c6b59";

async function debugBadges() {
  const prisma = getPrisma();
  
  console.log("🔍 Debugging badges for user:", userId);
  console.log("=".repeat(50));
  
  // 1. Check total complaints
  const complaints = await prisma.$queryRaw<{count: bigint}[]>`
    SELECT COUNT(*) as count FROM "Complaint" WHERE "complainantId" = ${userId}
  `;
  console.log("\n📋 Total complaints:", Number(complaints[0]?.count || 0));
  
  // 2. Check badges in DB
  const badges = await prisma.$queryRaw<any[]>`SELECT id, slug, name, threshold FROM badges ORDER BY threshold`;
  console.log("\n🏅 Badges in database:", badges.length);
  badges.slice(0, 5).forEach(b => console.log(`   - ${b.name} (threshold: ${b.threshold})`));
  
  // 3. Check user's current badges
  const userBadges = await prisma.$queryRaw<any[]>`
    SELECT ub.*, b.name, b.slug 
    FROM user_badges ub 
    JOIN badges b ON ub."badgeId" = b.id 
    WHERE ub."userId" = ${userId}
  `;
  console.log("\n🎖️ User's badges:", userBadges.length);
  userBadges.forEach(ub => console.log(`   - ${ub.name}`));
  
  // 4. Award "First Step" badge if user has >= 1 complaint
  const complaintCount = Number(complaints[0]?.count || 0);
  
  if (complaintCount >= 1) {
    console.log("\n✨ User qualifies for badges! Awarding...");
    
    // Get first_step badge
    const firstStepBadge = await prisma.$queryRaw<any[]>`
      SELECT id, name FROM badges WHERE slug = 'first_step'
    `;
    
    if (firstStepBadge.length > 0) {
      const badgeId = firstStepBadge[0].id;
      
      // Check if already awarded
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM user_badges WHERE "userId" = ${userId} AND "badgeId" = ${badgeId}
      `;
      
      if (existing.length === 0) {
        // Award badge
        const newId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO user_badges (id, "userId", "badgeId", "earnedAt", notified)
          VALUES (${newId}, ${userId}, ${badgeId}, NOW(), false)
        `;
        console.log(`   ✅ Awarded "First Step" badge!`);
      } else {
        console.log(`   ℹ️ "First Step" badge already awarded`);
      }
    }
    
    // Award "Active Reporter" if >= 3 complaints
    if (complaintCount >= 3) {
      const activeReporterBadge = await prisma.$queryRaw<any[]>`
        SELECT id, name FROM badges WHERE slug = 'active_reporter'
      `;
      
      if (activeReporterBadge.length > 0) {
        const badgeId = activeReporterBadge[0].id;
        const existing = await prisma.$queryRaw<any[]>`
          SELECT id FROM user_badges WHERE "userId" = ${userId} AND "badgeId" = ${badgeId}
        `;
        
        if (existing.length === 0) {
          const newId = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO user_badges (id, "userId", "badgeId", "earnedAt", notified)
            VALUES (${newId}, ${userId}, ${badgeId}, NOW(), false)
          `;
          console.log(`   ✅ Awarded "Active Reporter" badge!`);
        } else {
          console.log(`   ℹ️ "Active Reporter" badge already awarded`);
        }
      }
    }
  }
  
  // 5. Final check
  const finalBadges = await prisma.$queryRaw<any[]>`
    SELECT b.name, b.slug, ub."earnedAt"
    FROM user_badges ub 
    JOIN badges b ON ub."badgeId" = b.id 
    WHERE ub."userId" = ${userId}
    ORDER BY ub."earnedAt" DESC
  `;
  console.log("\n📊 Final user badges:", finalBadges.length);
  finalBadges.forEach(ub => console.log(`   - ${ub.name} (earned: ${ub.earnedAt})`));
  
  await prisma.$disconnect();
}

debugBadges().catch(console.error);
