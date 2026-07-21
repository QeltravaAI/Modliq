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

    const audit = await prisma.fiveSAudit.findUnique({
      where: { id }
    });

    if (!audit || audit.userId !== userId) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const updated = await prisma.fiveSAudit.update({
      where: { id },
      data: {
        area: body.area !== undefined ? body.area : audit.area,
        sort: body.sort !== undefined ? Number(body.sort) : audit.sort,
        setInOrder: body.setInOrder !== undefined ? Number(body.setInOrder) : audit.setInOrder,
        shine: body.shine !== undefined ? Number(body.shine) : audit.shine,
        standardize: body.standardize !== undefined ? Number(body.standardize) : audit.standardize,
        sustain: body.sustain !== undefined ? Number(body.sustain) : audit.sustain,
        notes: body.notes !== undefined ? body.notes : audit.notes,
      }
    });

    return NextResponse.json({ success: true, audit: updated });
  } catch (error) {
    console.error('Error updating 5S audit:', error);
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

    const audit = await prisma.fiveSAudit.findUnique({
      where: { id }
    });

    if (!audit || audit.userId !== userId) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    await prisma.fiveSAudit.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting 5S audit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
