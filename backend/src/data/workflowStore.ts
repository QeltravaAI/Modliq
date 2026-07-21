import prisma from '@/lib/prisma';

export async function listWorkflows(userId: string) {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  return {
    activeWorkflowId: workspace?.activeWorkflowId || null,
  };
}

export async function getWorkflow(userId: string, workflowId: string) {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  if (!workspace || workspace.activeWorkflowId !== workflowId) {
    return null;
  }
  return {
    id: workflowId,
    userId,
    activeWorkflowId: workflowId,
  };
}

export async function createWorkflow(userId: string, name?: string) {
  const workflowId = `wf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
  return {
    id: workflowId,
    userId,
    name: name || `Workflow ${Date.now()}`,
    activeWorkflowId: workflowId,
  };
}

export async function updateWorkflow(userId: string, workflowId: string, updates: any) {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  if (!workspace || workspace.activeWorkflowId !== workflowId) {
    return null;
  }
  return prisma.workspaceState.update({
    where: { userId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });
}

export async function deleteWorkflow(userId: string, workflowId: string) {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  if (!workspace || workspace.activeWorkflowId !== workflowId) {
    return false;
  }
  await prisma.workspaceState.update({
    where: { userId },
    data: {
      activeWorkflowId: null,
      updatedAt: new Date(),
    },
  });
  return true;
}

export async function getActiveWorkflowId(userId: string): Promise<string | null> {
  const workspace = await prisma.workspaceState.findUnique({
    where: { userId },
  });
  return workspace?.activeWorkflowId || null;
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
