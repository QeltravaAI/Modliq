import prisma from '@/lib/prisma';

export async function saveOptimization(id: string, data: any) {
  const toStore = { ...data };
  if (toStore.result && typeof toStore.result === 'object') {
    toStore.result = JSON.stringify(toStore.result);
  }
  await prisma.optimizationRun.upsert({
    where: { id },
    update: {
      ...toStore,
      updatedAt: new Date(),
    },
    create: {
      id,
      ...toStore,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return data;
}

export async function getOptimization(id: string) {
  return await prisma.optimizationRun.findUnique({
    where: { id },
  });
}

export async function listOptimizations() {
  return await prisma.optimizationRun.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
