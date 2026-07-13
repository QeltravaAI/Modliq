import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path.join(process.cwd(), 'uploads');
const STORE_PATH = path.join(STORE_DIR, 'dataset-store.json');

function ensureDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create dataset store directory:', err);
  }
}

function loadStore() {
  try {
    ensureDir();
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
    ensureDir();
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
