"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path_1.default.join(process.cwd(), 'uploads');
const STORE_PATH = path_1.default.join(STORE_DIR, 'workspace-store.json');
function ensureDir() {
    try {
        if (!fs_1.default.existsSync(STORE_DIR)) {
            fs_1.default.mkdirSync(STORE_DIR, { recursive: true });
        }
    }
    catch (err) {
        console.error('Failed to create workspace store directory:', err);
    }
}
function loadStore() {
    try {
        ensureDir();
        if (fs_1.default.existsSync(STORE_PATH)) {
            const raw = fs_1.default.readFileSync(STORE_PATH, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch (err) {
        console.error('Failed to load workspace store:', err);
    }
    return {};
}
function saveStore() {
    try {
        ensureDir();
        fs_1.default.writeFileSync(STORE_PATH, JSON.stringify(workspaces, null, 2));
    }
    catch (err) {
        console.error('Failed to persist workspace store:', err);
    }
}
const workspaces = loadStore();
exports.workspaceStore = {
    getWorkspace: (userId) => {
        if (!workspaces[userId]) {
            workspaces[userId] = { activeDatasetId: null };
        }
        return workspaces[userId];
    },
    setActiveDataset: (userId, datasetId) => {
        if (!workspaces[userId]) {
            workspaces[userId] = { activeDatasetId: null };
        }
        const workspace = workspaces[userId];
        workspace.activeDatasetId = datasetId;
        saveStore();
        return workspace;
    },
};
//# sourceMappingURL=workspaceStore.js.map