import prisma from '@/lib/prisma';

export async function getDashboardMetrics(userId: string) {
  const totalDatasets = await prisma.dataset.count({
    where: { userId },
  });

  // Real run history is derived from persisted optimization runs (one row per run).
  // This is computed from the database, not a separately maintained in-memory counter.
  const totalRuns = await prisma.optimizationRun.count({
    where: { userId },
  });

  const recentRuns = await prisma.optimizationRun.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentActivity = recentRuns.map((run) => ({
    title: `Optimization run: ${run.template_id || 'Yield'}`,
    time: run.createdAt.toISOString(),
  }));

  const uploadedDatasets = await prisma.dataset.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { filename: true },
  });

  return {
    totalDatasets,
    totalRuns,
    activeModels: 0,
    predictionsToday: 0,
    averageAccuracy: 0,
    uploadedDatasets: uploadedDatasets.map((d) => d.filename),
    recentActivity,
    modelAccuracy: [],
    modelResults: [],
    latestTrainingResult: null,
  };
}
