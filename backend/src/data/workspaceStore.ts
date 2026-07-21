import prisma from '@/lib/prisma';

export async function getWorkspace(userId: string) {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  if (!workspace) {
    return { activeDatasetId: null, activeWorkflowId: null };
  }
  return {
    activeDatasetId: workspace.activeDatasetId,
    activeWorkflowId: workspace.activeWorkflowId,
  };
}

export async function setActiveDataset(userId: string, datasetId: string) {
  await prisma.workspaceState.upsert({
    where: { userId },
    update: {
      activeDatasetId: datasetId,
      updatedAt: new Date(),
    },
    create: {
      userId,
      activeDatasetId: datasetId,
      updatedAt: new Date(),
    },
  });
  return { activeDatasetId: datasetId };
}

export async function setActiveWorkflow(userId: string, workflowId: string | null) {
  await prisma.workspaceState.upsert({
    where: { userId },
    update: {
      activeWorkflowId: workflowId,
      updatedAt: new Date(),
    },
    create: {
      userId,
      activeWorkflowId: workflowId,
      updatedAt: new Date(),
    },
  });
  return { activeWorkflowId: workflowId };
}

export async function getActiveWorkflowId(userId: string): Promise<string | null> {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  return workspace?.activeWorkflowId || null;
}
