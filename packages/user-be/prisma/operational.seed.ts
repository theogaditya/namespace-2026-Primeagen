import { getPrisma } from "../lib/prisma";
import { randomUUID } from "crypto";

const prisma = getPrisma();

const OPERATING_DATA = [
  {
    state: "Jharkhand",
    districts: ["Ranchi", "Jamshedpur", "Dhanbad"],
  },
  {
    state: "Odisha",
    districts: ["Khorda", "Puri", "Cuttack"],
  },
  {
    state: "West Bengal",
    districts: ["Kolkata", "Darjeeling", "Hooghly", "Murshidabad"],
  },
  {
    state: "Bihar",
    districts: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  },
  {
    state: "Uttar Pradesh",
    districts: ["Lucknow", "Kanpur", "Varanasi", "Agra"],
  },
];

async function main() {
  for (const group of OPERATING_DATA) {
    let stateRecord = await prisma.operating_states.findFirst({
      where: { name: group.state },
    });

    if (!stateRecord) {
      stateRecord = await prisma.operating_states.create({
        data: {
          id: randomUUID(),
          name: group.state,
        },
      });
      console.log(`Created state: ${stateRecord.name}`);
    } else {
      console.log(`State already exists: ${stateRecord.name}`);
    }

    for (const districtName of group.districts) {
      const existing = await prisma.operating_districts.findFirst({
        where: { name: districtName, stateId: stateRecord.id },
      });

      if (existing) {
        console.log(`District already exists: ${existing.name}`);
        continue;
      }

      const created = await prisma.operating_districts.create({
        data: {
          id: randomUUID(),
          name: districtName,
          state: stateRecord.name,
          stateId: stateRecord.id,
        },
      });

      console.log(`Created district: ${created.name}`);
    }
  }

  console.log("Operational seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });