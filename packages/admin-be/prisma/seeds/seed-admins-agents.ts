import { getPrisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = getPrisma();

function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// All departments that field agents belong to, mapped to a short abbreviation used in email generation.
const AGENT_DEPARTMENTS: { dept: string; abbr: string }[] = [
  { dept: 'INFRASTRUCTURE',           abbr: 'infra'    },
  { dept: 'EDUCATION',                abbr: 'edu'      },
  { dept: 'REVENUE',                  abbr: 'rev'      },
  { dept: 'HEALTH',                   abbr: 'health'   },
  { dept: 'WATER_SUPPLY_SANITATION',  abbr: 'wss'      },
  { dept: 'ELECTRICITY_POWER',        abbr: 'elec'     },
  { dept: 'TRANSPORTATION',           abbr: 'trans'    },
  { dept: 'MUNICIPAL_SERVICES',       abbr: 'muni'     },
  { dept: 'POLICE_SERVICES',          abbr: 'police'   },
  { dept: 'ENVIRONMENT',              abbr: 'env'      },
  { dept: 'HOUSING_URBAN_DEVELOPMENT',abbr: 'housing'  },
  { dept: 'SOCIAL_WELFARE',           abbr: 'welfare'  },
  { dept: 'PUBLIC_GRIEVANCES',        abbr: 'griev'    },
];

const MUNICIPALITIES = ['Cuttack', 'Khorda', 'Puri'];

// Generates a display name from an email local-part like "infra.cuttack.1"
function agentNameFromSlug(slug: string): string {
  // "infra.cuttack.1" → "Infra Cuttack 1"
  return slug
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function upsertAgents() {
  // 2 agents × 13 departments × 3 municipalities = 78 agents total
  let phone = 9100000001;

  for (const municipality of MUNICIPALITIES) {
    const muniSlug = municipality.toLowerCase();

    for (const { dept, abbr } of AGENT_DEPARTMENTS) {
      for (let idx = 1; idx <= 2; idx++) {
        const slug = `${abbr}.${muniSlug}.${idx}`;
        const email = `${slug}@gov.in`;
        const fullName = agentNameFromSlug(slug);
        const hashed = await bcrypt.hash('123123123', 10);

        await prisma.agent.upsert({
          where: { officialEmail: email },
          update: {
            fullName,
            password: hashed,
            phoneNumber: String(phone),
            email,
            municipality,
            department: dept as any,
          },
          create: {
            id: randomUUID(),
            email,
            fullName,
            password: hashed,
            phoneNumber: String(phone),
            officialEmail: email,
            department: dept as any,
            municipality,
          },
        });

        console.log(`Upserted agent: ${email}  (${dept} / ${municipality})`);
        phone += 1;
      }
    }
  }
}

async function upsertMunicipalAdmins() {
  const emails = ['sourab@gmail.com', 'muni@gmail.com', 'roshan@gmail.com'];
  const municipalities = ['Puri', 'Khordha', 'Cuttack'];
  let phone = 9000000101;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const fullName = nameFromEmail(email as string);
    const hashed = await bcrypt.hash('123123123', 10);

    await prisma.departmentMunicipalAdmin.upsert({
      where: { officialEmail: email },
      update: {
        fullName,
        password: hashed,
        phoneNumber: String(phone),
        department: 'MUNICIPAL_SERVICES',
        municipality: municipalities[i] ?? 'Unknown',
      },
      create: {
        id: randomUUID(),
        fullName,
        officialEmail: email as string,
        phoneNumber: String(phone),
        password: hashed,
        department: 'MUNICIPAL_SERVICES',
        municipality: municipalities[i] ?? 'Unknown',
      },
    });
    console.log('Upserted municipal admin:', email);
    phone += 1;
  }
}

async function upsertStateAdmins() {
  const emails = ['pani@gmail.com', 'suprit@gmail.com'];
  const state = 'Jharkhand';
  let phone = 9000000201;

  for (const email of emails) {
    const fullName = nameFromEmail(email);
    const hashed = await bcrypt.hash('123123123', 10);

    await prisma.departmentStateAdmin.upsert({
      where: { officialEmail: email },
      update: {
        fullName,
        password: hashed,
        phoneNumber: String(phone),
        department: 'MUNICIPAL_SERVICES',
        state,
      },
      create: {
        id: randomUUID(),
        fullName,
        officialEmail: email,
        phoneNumber: String(phone),
        password: hashed,
        department: 'MUNICIPAL_SERVICES',
        state,
      },
    });
    console.log('Upserted state admin:', email);
    phone += 1;
  }
}

async function upsertCivicPartners() {
  const partners = [
    { email: 'adi@gmail.com', password: '123123123', state: 'Odisha', orgType: 'NGO' },
    { email: 'ritesh@gmail.com', password: '123123123', state: 'Jharkhand', orgType: 'NGO' },
  ];

  let phone = 9000000301;

  for (const p of partners) {
    const orgName = nameFromEmail(p.email);
    const hashed = await bcrypt.hash(p.password, 10);

    await prisma.civicPartner.upsert({
      where: { officialEmail: p.email },
      update: {
        orgName,
        password: hashed,
        phoneNumber: String(phone),
        officialEmail: p.email,
        orgType: p.orgType as any,
        registrationNo: randomUUID(),
        state: p.state,
        isVerified: true,
        verifiedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        orgName,
        orgId: randomUUID(),
        officialEmail: p.email,
        password: hashed,
        phoneNumber: String(phone),
        orgType: p.orgType as any,
        registrationNo: randomUUID(),
        state: p.state,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    console.log('Upserted civic partner:', p.email);
    phone += 1;
  }
}

async function main() {
  try {
    console.log('Seeding admin-be: agents and admins...');
    await upsertAgents();
    await upsertMunicipalAdmins();
    await upsertStateAdmins();
    await upsertCivicPartners();
    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main };
