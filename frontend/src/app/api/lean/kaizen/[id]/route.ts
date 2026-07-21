import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('modliq_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = payload.userId;
    const body = await request.json();

    const action = await prisma.kaizenAction.findUnique({
      where: { id }
    });

    if (!action || action.userId !== userId) {
      return NextResponse.json({ error: 'Kaizen action not found' }, { status: 404 });
    }

    const updated = await prisma.kaizenAction.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : action.title,
        problem: body.problem !== undefined ? body.problem : action.problem,
        rootCause: body.rootCause !== undefined ? body.rootCause : action.rootCause,
        countermeasure: body.countermeasure !== undefined ? body.countermeasure : action.countermeasure,
        owner: body.owner !== undefined ? body.owner : action.owner,
        priority: body.priority !== undefined ? body.priority : action.priority,
        status: body.status !== undefined ? body.status : action.status,
        dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : action.dueDate,
        impactArea: body.impactArea !== undefined ? body.impactArea : action.impactArea,
        linkedDatasetId: body.linkedDatasetId !== undefined ? body.linkedDatasetId : action.linkedDatasetId,
        linkedBatchId: body.linkedBatchId !== undefined ? body.linkedBatchId : action.linkedBatchId,
      }
    });

    return NextResponse.json({ success: true, action: updated });
  } catch (error) {
    console.error('Error updating Kaizen action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('modliq_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = payload.userId;

    const action = await prisma.kaizenAction.findUnique({
      where: { id }
    });

    if (!action || action.userId !== userId) {
      return NextResponse.json({ error: 'Kaizen action not found' }, { status: 404 });
    }

    await prisma.kaizenAction.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Kaizen action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
