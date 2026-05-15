import { getPrisma } from "../lib/prisma";

async function main() {
  const prisma = getPrisma();

  const depts = [
    { name: "Infrastructure",         subCategories: [], learnedSubCategories: [], assignedDepartment: "INFRASTRUCTURE" },
    { name: "Education",              subCategories: [], learnedSubCategories: [], assignedDepartment: "EDUCATION" },
    { name: "Revenue",                subCategories: [], learnedSubCategories: [], assignedDepartment: "REVENUE" },
    { name: "Health",                 subCategories: [], learnedSubCategories: [], assignedDepartment: "HEALTH" },
    { name: "Water Supply & Sanitation", subCategories: [], learnedSubCategories: [], assignedDepartment: "WATER_SUPPLY_SANITATION" },
    { name: "Electricity & Power",    subCategories: [], learnedSubCategories: [], assignedDepartment: "ELECTRICITY_POWER" },
    { name: "Transportation",         subCategories: [], learnedSubCategories: [], assignedDepartment: "TRANSPORTATION" },
    { name: "Municipal Services",     subCategories: [], learnedSubCategories: [], assignedDepartment: "MUNICIPAL_SERVICES" },
    { name: "Police Services",        subCategories: [], learnedSubCategories: [], assignedDepartment: "POLICE_SERVICES" },
    { name: "Environment",            subCategories: [], learnedSubCategories: [], assignedDepartment: "ENVIRONMENT" },
    { name: "Housing & Urban Development", subCategories: [], learnedSubCategories: [], assignedDepartment: "HOUSING_URBAN_DEVELOPMENT" },
    { name: "Social Welfare",         subCategories: [], learnedSubCategories: [], assignedDepartment: "SOCIAL_WELFARE" },
    { name: "Public Grievances",      subCategories: [], learnedSubCategories: [], assignedDepartment: "PUBLIC_GRIEVANCES" },
  ];

  for (const dept of depts) {
    const { name, subCategories, learnedSubCategories, assignedDepartment } = dept;
    await prisma.category.upsert({
      where: { name },
      create: {
        name,
        subCategories,
        learnedSubCategories,
        assignedDepartment,
      },
      update: {
        subCategories,
        learnedSubCategories,
        assignedDepartment,
      },
    });
    console.log(`Upserted category: ${name}`);
  }
}

main()
  .then(async () => {
    console.log("Seeding finished.");
    const prisma = getPrisma();
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    const prisma = getPrisma();
    await prisma.$disconnect();
    process.exit(1);
  });
