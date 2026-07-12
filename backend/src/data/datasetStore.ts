import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'uploads', 'dataset-store.json');

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load dataset store:', err);
  }
  return {};
}

function saveStore() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(datasets, null, 2));
  } catch (err) {
    console.error('Failed to persist dataset store:', err);
  }
}

const datasets: Record<string, any> = loadStore();

export const datasetStore = {
  saveDataset: (datasetId: string, data: any) => {
    datasets[datasetId] = data;
    saveStore();
    return datasets[datasetId];
  },
  getDataset: (datasetId: string) => {
    return datasets[datasetId];
  },
  getAllDatasets: () => {
    return Object.values(datasets);
  },
};
