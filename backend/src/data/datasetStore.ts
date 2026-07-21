import prisma from '@/lib/prisma';

export async function saveDataset(datasetId: string, data: any) {
  try {
    const userId = data.userId || 'demo-user-static-backend';
    const payload = {
      ...data,
      userId,
      analytics: typeof data.analytics === 'object' ? JSON.stringify(data.analytics) : data.analytics,
      preview: typeof data.preview === 'object' ? JSON.stringify(data.preview) : data.preview,
    };

    const version = {
      datasetId,
      versionId: `${datasetId}@v${Date.now()}`,
      data: JSON.stringify(payload),
      createdAt: new Date(),
    };

    await prisma.dataset.upsert({
      where: { id: datasetId },
      update: {
        ...payload,
        updatedAt: new Date(),
      },
      create: {
        id: datasetId,
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.datasetVersion.create({
      data: version,
    });

    return payload;
  } catch (err) {
    console.error(`[datasetStore] Error saving dataset ${datasetId}:`, err);
    return data;
  }
}

export async function getDataset(datasetId: string) {
  const record = await prisma.dataset.findUnique({
    where: { id: datasetId },
  });
  return record || null;
}

export async function getAllDatasets() {
  return await prisma.dataset.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDatasetVersions(datasetId: string) {
  return await prisma.datasetVersion.findMany({
    where: { datasetId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDatasetVersion(datasetId: string, versionId: string) {
  return await prisma.datasetVersion.findFirst({
    where: { datasetId, versionId },
  });
}
