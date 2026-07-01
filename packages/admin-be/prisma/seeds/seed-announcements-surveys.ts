import { getPrisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = getPrisma();

async function ensureMunicipalAdmin(municipality: string) {
  const admin = await prisma.departmentMunicipalAdmin.findFirst({
    where: { municipality: { equals: municipality, mode: 'insensitive' } },
  });
  if (admin) return admin;

  // Create a lightweight municipal admin if not found
  const email = `seed-${municipality.toLowerCase()}@example.com`;
  const hashed = await bcrypt.hash('seeded', 10);
  const created = await prisma.departmentMunicipalAdmin.create({
    data: {
      id: randomUUID(),
      fullName: `${municipality} Admin`,
      officialEmail: email,
      phoneNumber: '9000009999',
      password: hashed,
      department: 'MUNICIPAL_SERVICES',
      municipality,
    },
  });
  return created;
}

async function ensureCivicPartnerForMunicipality(municipality: string) {
  const email = `survey-${municipality.toLowerCase()}@example.com`;
  const existing = await prisma.civicPartner.findUnique({ where: { officialEmail: email } });
  if (existing) return existing;

  const hashed = await bcrypt.hash('seeded', 10);
  const created = await prisma.civicPartner.create({
    data: {
      id: randomUUID(),
      orgName: `${municipality} Community`,
      orgId: randomUUID(),
      officialEmail: email,
      password: hashed,
      phoneNumber: '9000010000',
      orgType: 'NGO',
      registrationNo: randomUUID(),
      state: 'Odisha',
      isVerified: true,
      verifiedAt: new Date(),
    },
  });
  return created;
}

async function seedAnnouncementsForMunicipality(municipality: string, createdById: string) {
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // +7 days

  const templates = [
    {
      title: `${municipality}: Road maintenance on Main St`,
      content: `Planned maintenance on Main St between 9am-5pm. Expect lane closures and minor delays. Please follow diversion signs.`,
      priority: 2,
    },
    {
      title: `${municipality}: Free health camp this weekend`,
      content: `A free health and vaccination camp is being organised at the community centre. All residents welcome.`,
      priority: 1,
    },
    {
      title: `${municipality}: Water supply interruption`,
      content: `Temporary interruption to water supply due to pipeline repair. Water tankers will be provided at designated points.`,
      priority: 3,
    },
  ];

  for (const t of templates) {
    await prisma.announcement.upsert({
      where: { id: `${municipality}-${t.title}` },
      update: {
        title: t.title,
        content: t.content,
        isActive: true,
        priority: t.priority,
        startsAt: now,
        expiresAt: later,
        municipality,
        createdById,
      },
      create: {
        id: `${municipality}-${t.title}`,
        title: t.title,
        content: t.content,
        municipality,
        isActive: true,
        priority: t.priority,
        startsAt: now,
        expiresAt: later,
        createdById,
      },
    });
    console.log(`Upserted announcement for ${municipality}: ${t.title}`);
  }
}

async function seedSurveysForMunicipality(municipality: string, civicPartnerId: string) {
  const now = new Date();
  const ends = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14); // 2 weeks

  const surveys = [
    {
      title: `${municipality} - Citizen Satisfaction Survey`,
      description: `Help us improve municipal services by sharing your feedback across departments.`,
      category: 'Community',
      content: 'A short 5-question survey about municipal services in your area.',
      questions: [
        { text: 'Overall how satisfied are you with municipal services?', type: 'RATING', options: [], required: true },
        { text: 'Which service needs the most improvement?', type: 'MCQ', options: ['Water', 'Electricity', 'Roads', 'Sanitation'], required: true },
        { text: 'Which days are convenient for community meetings?', type: 'CHECKBOX', options: ['Weekdays', 'Weekends', 'Evenings'], required: false },
        { text: 'Would you attend local town-hall meetings?', type: 'YES_NO', options: [], required: true },
        { text: 'Any other suggestions?', type: 'TEXT', options: [], required: false },
      ],
    },

    {
      title: `${municipality} - Road Safety Audit`,
      description: `Quick audit about road safety hotspots and suggestions.`,
      category: 'Transport',
      content: '5 quick questions to map road safety concerns in your neighbourhood.',
      questions: [
        { text: 'Have you experienced unsafe crossings in your area?', type: 'YES_NO', options: [], required: true },
        { text: 'Select the problem areas you face', type: 'CHECKBOX', options: ['Poor lighting', 'No zebra crossings', 'Speeding vehicles', 'Potholes'], required: true },
        { text: 'Rate pedestrian friendliness', type: 'RATING', options: [], required: true },
        { text: 'Which intersections need immediate attention?', type: 'TEXT', options: [], required: false },
        { text: 'Would you volunteer for community road safety drives?', type: 'YES_NO', options: [], required: false },
      ],
    },

    {
      title: `${municipality} - Water Supply Feedback`,
      description: `Understand frequency and quality of water supply.`,
      category: 'Water',
      content: 'Short survey for residents about water availability and quality.',
      questions: [
        { text: 'How many days per week do you get piped water?', type: 'MCQ', options: ['0', '1-2', '3-4', '5+'], required: true },
        { text: 'Is the water quality satisfactory?', type: 'YES_NO', options: [], required: true },
        { text: 'Any common complaints about water?', type: 'TEXT', options: [], required: false },
        { text: 'Would you like to register for tanker supplies?', type: 'YES_NO', options: [], required: false },
        { text: 'Rate your overall water service', type: 'RATING', options: [], required: true },
      ],
    },

    {
      title: `${municipality} - Health & Vaccination Drive`,
      description: `Gauge community interest for an upcoming health camp.`,
      category: 'Health',
      content: 'We plan a health camp—your inputs help scheduling and services.',
      questions: [
        { text: 'Will you attend the health camp?', type: 'YES_NO', options: [], required: true },
        { text: 'Which services would you like?', type: 'CHECKBOX', options: ['General checkup', 'Vaccination', 'Dental', 'Eye checkup'], required: true },
        { text: 'Any accessibility needs?', type: 'TEXT', options: [], required: false },
        { text: 'Preferred timings', type: 'MCQ', options: ['Morning', 'Afternoon', 'Evening'], required: true },
        { text: 'How did you hear about this?', type: 'MCQ', options: ['SMS', 'Posters', 'Word of mouth', 'Social Media'], required: false },
      ],
    },

    {
      title: `${municipality} - Green Spaces & Environment`,
      description: `Collect preferences for community green space improvements.`,
      category: 'Environment',
      content: 'Help us prioritise parks, tree-planting and cleanliness drives.',
      questions: [
        { text: 'Do you use local parks frequently?', type: 'YES_NO', options: [], required: false },
        { text: 'Which facilities would you like in parks?', type: 'CHECKBOX', options: ['Walking track', 'Playground', 'Benches', 'Lighting'], required: true },
        { text: 'Rate cleanliness of public spaces', type: 'RATING', options: [], required: true },
        { text: 'Suggest a location for tree-planting', type: 'TEXT', options: [], required: false },
        { text: 'Would you join local clean-up drives?', type: 'YES_NO', options: [], required: false },
      ],
    },
  ];

  for (const s of surveys) {
    const surveyId = `${municipality}-${s.title}`;
    // Ensure parent survey exists with nested questions
    await prisma.survey.upsert({
      where: { id: surveyId },
      update: {
        title: s.title,
        description: s.description,
        category: s.category,
        content: s.content,
        status: 'PUBLISHED',
        isPublic: true,
        startsAt: now,
        endsAt: ends,
        lastUpdated: new Date(),
      },
      create: {
        id: surveyId,
        civicPartnerId,
        title: s.title,
        description: s.description,
        category: s.category,
        content: s.content,
        status: 'PUBLISHED',
        isPublic: true,
        startsAt: now,
        endsAt: ends,
        createdAt: now,
        lastUpdated: new Date(),
        questions: {
          create: s.questions.map((q: any, idx: number) => ({
            id: randomUUID(),
            questionText: q.text,
            questionType: q.type,
            options: q.options,
            isRequired: q.required,
            order: idx + 1,
          })),
        },
      },
    });
    console.log(`Upserted survey for ${municipality}: ${s.title}`);
  }
}

async function main() {
  try {
    const municipalities = ['Puri', 'Khorda', 'Cuttack'];

    for (const m of municipalities) {
      const admin = await ensureMunicipalAdmin(m);
      await seedAnnouncementsForMunicipality(m, admin.id);

      const partner = await ensureCivicPartnerForMunicipality(m);
      await seedSurveysForMunicipality(m, partner.id);
    }

    console.log('Seeding announcements and surveys completed.');
  } catch (err) {
    console.error('Seeding announcements/surveys failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main };
