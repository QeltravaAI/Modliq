import prisma from '@/lib/prisma';

export async function initDb() {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('[db] Failed to connect to Postgres:', err);
  }
}

export async function createOptimizationJobDb(job: {
  id: string;
  userId: string;
  datasetId?: string;
  status: string;
  stage?: string;
  progress?: number;
  requestJson?: string;
  resultJson?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}) {
  await prisma.optimizationJob.create({
    data: {
      id: job.id,
      userId: job.userId,
      datasetId: job.datasetId || null,
      status: job.status,
      stage: job.stage || null,
      progress: job.progress || 0,
      requestJson: job.requestJson || null,
      resultJson: job.resultJson || null,
      error: job.error || null,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
    },
  });
}

export async function getOptimizationJobDb(id: string) {
  const record = await prisma.optimizationJob.findUnique({
    where: { id },
  });
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    datasetId: record.datasetId,
    status: record.status,
    stage: record.stage,
    progress: record.progress,
    requestJson: record.requestJson,
    resultJson: record.resultJson,
    error: record.error,
    createdAt: record.createdAt ? new Date(record.createdAt).getTime() : Date.now(),
    updatedAt: record.updatedAt ? new Date(record.updatedAt).getTime() : Date.now(),
  };
}

export async function updateOptimizationJobDb(id: string, data: {
  status?: string;
  stage?: string;
  progress?: number;
  resultJson?: string;
  error?: string;
}) {
  const update: any = { updatedAt: new Date() };
  if (data.status !== undefined) update.status = data.status;
  if (data.stage !== undefined) update.stage = data.stage;
  if (data.progress !== undefined) update.progress = data.progress;
  if (data.resultJson !== undefined) update.resultJson = data.resultJson;
  if (data.error !== undefined) update.error = data.error;

  await prisma.optimizationJob.update({
    where: { id },
    data: update,
  });
}
