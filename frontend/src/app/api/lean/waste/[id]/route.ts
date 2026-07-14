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

    const record = await prisma.leanWasteEvent.findUnique({
      where: { id }
    });

    if (!record || record.userId !== userId) {
      return NextResponse.json({ error: 'Waste record not found' }, { status: 404 });
    }

    const updated = await prisma.leanWasteEvent.update({
      where: { id },
      data: {
        wasteType: body.wasteType !== undefined ? body.wasteType : record.wasteType,
        location: body.location !== undefined ? body.location : record.location,
        description: body.description !== undefined ? body.description : record.description,
        estimatedLoss: body.estimatedLoss !== undefined ? Number(body.estimatedLoss) : record.estimatedLoss,
        owner: body.owner !== undefined ? body.owner : record.owner,
        status: body.status !== undefined ? body.status : record.status,
      }
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    console.error('Error updating waste record:', error);
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

    const record = await prisma.leanWasteEvent.findUnique({
      where: { id }
    });

    if (!record || record.userId !== userId) {
      return NextResponse.json({ error: 'Waste record not found' }, { status: 404 });
    }

    await prisma.leanWasteEvent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting waste record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
