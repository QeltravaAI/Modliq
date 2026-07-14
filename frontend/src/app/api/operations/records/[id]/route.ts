import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    // Check ownership
    const record = await prisma.operationsRecord.findUnique({
      where: { id }
    });

    if (!record || record.userId !== userId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updated = await prisma.operationsRecord.update({
      where: { id },
      data: {
        batchId: body.batchId !== undefined ? body.batchId : record.batchId,
        line: body.line !== undefined ? body.line : record.line,
        machine: body.machine !== undefined ? body.machine : record.machine,
        shift: body.shift !== undefined ? body.shift : record.shift,
        product: body.product !== undefined ? body.product : record.product,
        plannedTimeMinutes: body.plannedTimeMinutes !== undefined ? Number(body.plannedTimeMinutes) : record.plannedTimeMinutes,
        runtimeMinutes: body.runtimeMinutes !== undefined ? Number(body.runtimeMinutes) : record.runtimeMinutes,
        downtimeMinutes: body.downtimeMinutes !== undefined ? Number(body.downtimeMinutes) : record.downtimeMinutes,
        downtimeReason: body.downtimeReason !== undefined ? body.downtimeReason : record.downtimeReason,
        idealCycleTimeSeconds: body.idealCycleTimeSeconds !== undefined ? Number(body.idealCycleTimeSeconds) : record.idealCycleTimeSeconds,
        totalCount: body.totalCount !== undefined ? Number(body.totalCount) : record.totalCount,
        goodCount: body.goodCount !== undefined ? Number(body.goodCount) : record.goodCount,
        rejectCount: body.rejectCount !== undefined ? Number(body.rejectCount) : record.rejectCount,
        yieldValue: body.yieldValue !== undefined ? Number(body.yieldValue) : record.yieldValue,
        scrapRate: body.scrapRate !== undefined ? Number(body.scrapRate) : record.scrapRate,
      }
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    console.error('Error updating operations record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const record = await prisma.operationsRecord.findUnique({
      where: { id }
    });

    if (!record || record.userId !== userId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    await prisma.operationsRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting operations record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
