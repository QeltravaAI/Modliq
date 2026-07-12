const datasets: Record<string, any> = {};

export const datasetStore = {
  saveDataset: (datasetId: string, data: any) => {
    datasets[datasetId] = data;
    return datasets[datasetId];
  },
  getDataset: (datasetId: string) => {
    return datasets[datasetId];
  },
  getAllDatasets: () => {
    return Object.values(datasets);
  },
};
