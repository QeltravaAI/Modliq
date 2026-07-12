"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.datasetStore = void 0;
const datasets = {};
exports.datasetStore = {
    saveDataset: (datasetId, data) => {
        datasets[datasetId] = data;
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