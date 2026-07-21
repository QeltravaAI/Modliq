import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
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

    const userId = payload.userId;
    let records = await prisma.leanWasteEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Seed default lean wastes if empty
    if (records.length === 0) {
      const defaults = [
        { userId, wasteType: 'Defects', location: 'Line 2 Packaging', description: 'Batch rejects on sealing mechanism.', estimatedLoss: 2500 },
        { userId, wasteType: 'Waiting', location: 'Line 1 Mixing', description: 'Waiting for raw material lot verification.', estimatedLoss: 1200 },
        { userId, wasteType: 'Motion', location: 'Assembly Bay A', description: 'Operators walking back and forth to tool lockers.', estimatedLoss: 600 }
      ];
      await prisma.leanWasteEvent.createMany({ data: defaults });
      records = await prisma.leanWasteEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching lean waste records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const userId = payload.userId;
    const body = await request.json();

    const record = await prisma.leanWasteEvent.create({
      data: {
        userId,
        wasteType: body.wasteType,
        location: body.location || null,
        description: body.description,
        estimatedLoss: body.estimatedLoss !== undefined ? Number(body.estimatedLoss) : null,
        owner: body.owner || null,
        status: body.status || 'Open',
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error creating lean waste record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
