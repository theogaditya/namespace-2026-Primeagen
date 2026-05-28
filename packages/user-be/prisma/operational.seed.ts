import { getPrisma } from "../lib/prisma";
import { randomUUID } from "crypto";

const prisma = getPrisma();

async function main() {
  let jharkhand = await prisma.operating_states.findFirst({ where: { name: 'Jharkhand' } });
  if (!jharkhand) {
    jharkhand = await prisma.operating_states.create({ 
      data: { 
        id: randomUUID(),
        name: 'Jharkhand' 
      } 
    });
    console.log('Created state:', jharkhand.name);
  } else {
    console.log('State already exists:', jharkhand.name);
  }

  const districts = ['Ranchi', 'Jamshedpur', 'Dhanbad'];

  for (const districtName of districts) {
    const existing = await prisma.operating_districts.findFirst({
      where: { name: districtName, stateId: jharkhand.id },
    });

    if (existing) {
      console.log('District already exists:', existing.name);
      continue;
    }

    const created = await prisma.operating_districts.create({
      data: {
        id: randomUUID(),
        name: districtName,
        state: jharkhand.name,
        stateId: jharkhand.id,
      },
    });

    console.log('Created district:', created.name);
  }

  console.log('Operational seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });