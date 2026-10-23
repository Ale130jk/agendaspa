import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const services = [
  {
    name: 'Masaje relajante',
    description:
      'Presión suave y constante con aceites tibios para bajar el ritmo y soltar la tensión del día.',
    durationMinutes: 60,
    priceCents: 18_000,
  },
  {
    name: 'Masaje descontracturante',
    description:
      'Trabajo profundo sobre nudos y zonas cargadas. Ideal después de semanas de escritorio o entrenamiento.',
    durationMinutes: 60,
    priceCents: 22_000,
  },
  {
    name: 'Facial hidratante',
    description:
      'Limpieza suave, exfoliación y mascarilla calmante para devolver luminosidad sin agredir la piel.',
    durationMinutes: 45,
    priceCents: 15_000,
  },
  {
    name: 'Aromaterapia',
    description:
      'Masaje de cuerpo completo con mezcla de aceites esenciales elegida contigo al inicio de la sesión.',
    durationMinutes: 90,
    priceCents: 26_000,
  },
  {
    name: 'Exfoliación corporal',
    description:
      'Renovación de la piel con sales minerales y aceite nutritivo. Termina con una ducha tibia.',
    durationMinutes: 45,
    priceCents: 14_000,
  },
];

const staff = [
  {
    email: env.SEED_STAFF_EMAIL,
    password: env.SEED_STAFF_PASSWORD,
    fullName: 'Lucía Ramos',
    phone: '+51 999 111 222',
    bio: 'Terapeuta de masaje relajante y aromaterapia. Trabaja con presión media y ritmo pausado.',
    serviceNames: ['Masaje relajante', 'Facial hidratante', 'Aromaterapia'],
  },
  {
    email: 'mateo@agendaspa.local',
    password: env.SEED_STAFF_PASSWORD,
    fullName: 'Mateo Salazar',
    phone: '+51 999 333 444',
    bio: 'Especialista en trabajo profundo y recuperación muscular. Presión firme, siempre conversada.',
    serviceNames: ['Masaje descontracturante', 'Exfoliación corporal', 'Aromaterapia'],
  },
];

async function upsertUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: 'ADMIN' | 'STAFF' | 'CLIENT';
}) {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
    },
    update: {
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  if (!env.SEED_DEMO) {
    console.info('SEED_DEMO is false. Skipping demo data.');
    return;
  }

  await upsertUser({
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    fullName: 'Administración AgendaSpa',
    phone: '+51 999 000 000',
    role: 'ADMIN',
  });

  const client = await upsertUser({
    email: env.SEED_CLIENT_EMAIL,
    password: env.SEED_CLIENT_PASSWORD,
    fullName: 'Camila Torres',
    phone: '+51 988 777 666',
    role: 'CLIENT',
  });

  const serviceByName = new Map<string, string>();

  for (const service of services) {
    const record = await prisma.service.upsert({
      where: { name: service.name },
      create: service,
      update: {
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        isActive: true,
      },
    });
    serviceByName.set(record.name, record.id);
  }

  for (const member of staff) {
    const user = await upsertUser({
      email: member.email,
      password: member.password,
      fullName: member.fullName,
      phone: member.phone,
      role: 'STAFF',
    });

    const profile = await prisma.staffProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, bio: member.bio },
      update: { bio: member.bio, isActive: true },
    });

    const serviceIds = member.serviceNames
      .map((name) => serviceByName.get(name))
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction([
      prisma.staffService.deleteMany({ where: { staffId: profile.id } }),
      prisma.staffService.createMany({
        data: serviceIds.map((serviceId) => ({ staffId: profile.id, serviceId })),
      }),
      prisma.workingHours.deleteMany({ where: { staffId: profile.id } }),
      prisma.workingHours.createMany({
        data: [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
          { staffId: profile.id, weekday, startMinute: 9 * 60, endMinute: 13 * 60 },
          { staffId: profile.id, weekday, startMinute: 14 * 60, endMinute: 18 * 60 },
        ]),
      }),
    ]);
  }

  console.info('Demo data ready.');
  console.info(`Admin: ${env.SEED_ADMIN_EMAIL}`);
  console.info(`Staff: ${staff.map((member) => member.email).join(', ')}`);
  console.info(`Client: ${client.email}`);
  console.info('Passwords come from SEED_*_PASSWORD environment variables.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
