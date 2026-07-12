"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.datasetStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const STORE_PATH = path_1.default.join(process.cwd(), 'uploads', 'dataset-store.json');
function loadStore() {
    try {
        if (fs_1.default.existsSync(STORE_PATH)) {
            const raw = fs_1.default.readFileSync(STORE_PATH, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch (err) {
        console.error('Failed to load dataset store:', err);
    }
    return {};
}
function saveStore() {
    try {
        const dir = path_1.default.dirname(STORE_PATH);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(STORE_PATH, JSON.stringify(datasets, null, 2));
    }
    catch (err) {
        console.error('Failed to persist dataset store:', err);
    }
}
const datasets = loadStore();
exports.datasetStore = {
    saveDataset: (datasetId, data) => {
        datasets[datasetId] = data;
        saveStore();
        return datasets[datasetId];
    },
    getDataset: (datasetId) => {
        return datasets[datasetId];
    },
    getAllDatasets: () => {
        return Object.values(datasets);
    },
};
//# sourceMappingURL=datasetStore.js.map