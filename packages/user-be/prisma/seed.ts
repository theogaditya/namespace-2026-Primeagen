import { getPrisma } from "../lib/prisma";

async function main() {
  const prisma = getPrisma();

  const depts = [
    { name: "Infrastructure",         subCategories: [], learnedSubCategories: [], assignedDepartment: "Infrastructure" },
    { name: "Education",              subCategories: [], learnedSubCategories: [], assignedDepartment: "Education" },
    { name: "Revenue",                subCategories: [], learnedSubCategories: [], assignedDepartment: "Revenue" },
    { name: "Health",                 subCategories: [], learnedSubCategories: [], assignedDepartment: "Health" },
    { name: "Water Supply & Sanitation", subCategories: [], learnedSubCategories: [], assignedDepartment: "Water Supply & Sanitation" },
    { name: "Electricity & Power",    subCategories: [], learnedSubCategories: [], assignedDepartment: "Electricity & Power" },
    { name: "Transportation",         subCategories: [], learnedSubCategories: [], assignedDepartment: "Transportation" },
    { name: "Municipal Services",     subCategories: [], learnedSubCategories: [], assignedDepartment: "Municipal Services" },
    { name: "Police Services",        subCategories: [], learnedSubCategories: [], assignedDepartment: "Police Services" },
    { name: "Environment",            subCategories: [], learnedSubCategories: [], assignedDepartment: "Environment" },
    { name: "Housing & Urban Development", subCategories: [], learnedSubCategories: [], assignedDepartment: "Housing & Urban Development" },
    { name: "Social Welfare",         subCategories: [], learnedSubCategories: [], assignedDepartment: "Social Welfare" },
    { name: "Public Grievances",      subCategories: [], learnedSubCategories: [], assignedDepartment: "Public Grievances" },
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
