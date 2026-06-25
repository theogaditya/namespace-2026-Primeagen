import { getPrisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = getPrisma();

function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function upsertAgents() {
  const emails = ['ankita@gmail.com', 'ani@gmail.com', 'devi@gmail.com'];
  let phone = 9000000001;

  for (const email of emails) {
    const fullName = nameFromEmail(email);
    const hashed = await bcrypt.hash('123123123', 10);

    await prisma.agent.upsert({
      where: { email },
      update: {
        fullName,
        password: hashed,
        phoneNumber: String(phone),
        officialEmail: email,
        department: 'MUNICIPAL_SERVICES',
      },
      create: {
        id: randomUUID(),
        email,
        fullName,
        password: hashed,
        phoneNumber: String(phone),
        officialEmail: email,
        department: 'MUNICIPAL_SERVICES',
      },
    });
    console.log('Upserted agent:', email);
    phone += 1;
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
        orgType: p.orgType,
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
        orgType: p.orgType,
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
