"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceStore = void 0;
const workspaces = {};
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
        return workspace;
    },
};
//# sourceMappingURL=workspaceStore.js.map