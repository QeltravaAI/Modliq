export const dashboardData = {
  totalDatasets: 0,
  activeModels: 0,
  predictionsToday: 0,
  averageAccuracy: 0,
  uploadedDatasets: [] as string[],
  recentActivity: [] as { title: string; time: string }[],
  modelAccuracy: [] as { model: string; accuracy: number }[],
  modelResults: [] as any[],
  latestTrainingResult: null as any,
};
