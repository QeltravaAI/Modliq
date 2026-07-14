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

    const lot = await prisma.materialLot.findUnique({
      where: { id }
    });

    if (!lot || lot.userId !== userId) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    const updated = await prisma.materialLot.update({
      where: { id },
      data: {
        supplierName: body.supplierName !== undefined ? body.supplierName : lot.supplierName,
        lotCode: body.lotCode !== undefined ? body.lotCode : lot.lotCode,
        materialType: body.materialType !== undefined ? body.materialType : lot.materialType,
        receivedDate: body.receivedDate !== undefined ? (body.receivedDate ? new Date(body.receivedDate) : null) : lot.receivedDate,
        incomingStatus: body.incomingStatus !== undefined ? body.incomingStatus : lot.incomingStatus,
        defectRate: body.defectRate !== undefined ? Number(body.defectRate) : lot.defectRate,
        linkedBatchId: body.linkedBatchId !== undefined ? body.linkedBatchId : lot.linkedBatchId,
        linkedYield: body.linkedYield !== undefined ? (body.linkedYield ? Number(body.linkedYield) : null) : lot.linkedYield,
        notes: body.notes !== undefined ? body.notes : lot.notes,
      }
    });

    return NextResponse.json({ success: true, lot: updated });
  } catch (error) {
    console.error('Error updating material lot:', error);
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

    const lot = await prisma.materialLot.findUnique({
      where: { id }
    });

    if (!lot || lot.userId !== userId) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    await prisma.materialLot.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting material lot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
