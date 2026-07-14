import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path.join(process.cwd(), 'uploads');
const STORE_PATH = path.join(STORE_DIR, 'optimization-store.json');

function ensureDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create optimization store directory:', err);
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
    console.error('Failed to load optimization store:', err);
  }
  return {};
}

function saveStore() {
  try {
    ensureDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to persist optimization store:', err);
  }
}

const store: Record<string, any> = loadStore();

export const optimizationData = {
  save: (id: string, data: any) => {
    store[id] = data;
    saveStore();
    return store[id];
  },
  get: (id: string) => {
    return store[id];
  },
  list: () => {
    return Object.entries(store).map(([id, data]) => ({ id, ...data }));
  },
};
