const workspaces: Record<string, { activeDatasetId: string | null }> = {};

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
    return workspace;
  },
};
