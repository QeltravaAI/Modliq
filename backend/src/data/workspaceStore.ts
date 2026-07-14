import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path.join(process.cwd(), 'uploads');
const STORE_PATH = path.join(STORE_DIR, 'workspace-store.json');

function ensureDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create workspace store directory:', err);
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
    console.error('Failed to load workspace store:', err);
  }
  return {};
}

function saveStore() {
  try {
    ensureDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(workspaces, null, 2));
  } catch (err) {
    console.error('Failed to persist workspace store:', err);
  }
}

const workspaces: Record<string, { activeDatasetId: string | null }> = loadStore();

export const workspaceStore = {
  getWorkspace: (userId: string) => {
    if (!workspaces[userId]) {
      workspaces[userId] = { activeDatasetId: null };
    }
    return workspaces[userId];
  },
  setActiveDataset: (userId: string, datasetId: string) => {
    if (!workspaces[userId]) {
      workspaces[userId] = { activeDatasetId: null };
    }
    const workspace = workspaces[userId]!;
    workspace.activeDatasetId = datasetId;
    saveStore();
    return workspace;
  },
};
