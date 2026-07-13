import { getPrisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = getPrisma();

async function main() {
  const usersToSeed = [
    { name: 'Aditya Hota', email: 'adityahota99@gmail.com', pass: '123123123' },
    { name: 'Ritesh Kumar Singh', email: 'rihankumar2004@gmail.com', pass: '123123123' },
    { name: 'testing', email: 'testuser@gmail.com', pass: '123123123' },
  ];

  let phoneNum = 9900000001;

  for (const u of usersToSeed) {
    const hashed = await bcrypt.hash(u.pass, 10);
    const phoneNumber = String(phoneNum++);
    
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        password: hashed,
      },
      create: {
        id: randomUUID(),
        name: u.name,
        email: u.email,
        password: hashed,
        phoneNumber,
        aadhaarId: 'A' + randomUUID().substring(1, 12).replace(/-/g, ''), // Fake aadhaar
        dateOfBirth: new Date('1990-01-01'),
        status: 'ACTIVE',
      },
    });
    
    console.log(`Upserted dummy user: ${u.email}`);
  }
}

main()
  .then(async () => {
    console.log('Dummy seeding finished.');
    const p = getPrisma();
    await p.$disconnect();
  })
  .catch(async (e) => {
    console.error('Dummy seeding failed:', e);
    const p = getPrisma();
    await p.$disconnect();
    process.exit(1);
  });
