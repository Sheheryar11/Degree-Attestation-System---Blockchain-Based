import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@das.gov.pk' },
    update: {},
    create: {
      email: 'admin@das.gov.pk',
      passwordHash: hash,
      role: Role.ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });

  const officerHash = await bcrypt.hash('Officer@123', 12);
  const officer = await prisma.user.upsert({
    where: { email: 'officer@das.gov.pk' },
    update: {},
    create: {
      email: 'officer@das.gov.pk',
      passwordHash: officerHash,
      role: Role.OFFICER,
      isEmailVerified: true,
      isActive: true,
    },
  });

  const registrarHash = await bcrypt.hash('Registrar@123', 12);
  const registrar = await prisma.user.upsert({
    where: { email: 'registrar@das.gov.pk' },
    update: {},
    create: {
      email: 'registrar@das.gov.pk',
      passwordHash: registrarHash,
      role: Role.REGISTRAR,
      isEmailVerified: true,
      isActive: true,
    },
  });

  const studentHash = await bcrypt.hash('Student@123', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@das.gov.pk' },
    update: {},
    create: {
      email: 'student@das.gov.pk',
      passwordHash: studentHash,
      role: Role.STUDENT,
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('Seeded users:');
  console.log(`  ADMIN:     admin@das.gov.pk     / Admin@123`);
  console.log(`  OFFICER:   officer@das.gov.pk   / Officer@123`);
  console.log(`  REGISTRAR: registrar@das.gov.pk / Registrar@123`);
  console.log(`  STUDENT:   student@das.gov.pk   / Student@123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
