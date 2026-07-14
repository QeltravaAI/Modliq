import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@modliq.com';
  const hashedPassword = await bcrypt.hash('modliqdemo', 10);

  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: 'demo-user-' + Date.now(),
        name: 'Demo User',
        email: demoEmail,
        password: hashedPassword,
        isDemo: true,
      },
    });
    console.log(`Created demo user: ${demoEmail}`);
  } else {
    console.log(`Demo user already exists: ${demoEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
