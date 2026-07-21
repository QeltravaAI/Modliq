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
    let suppliers = await prisma.supplier.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    });

    // Auto seed default suppliers if none exist
    if (suppliers.length === 0) {
      const defaults = [
        { userId, name: 'Supplier A', category: 'Raw Metals', notes: 'Primary supplier for base alloy material.' },
        { userId, name: 'Supplier B', category: 'Chemical Components', notes: 'Secondary supplier. Monitored for defect rates.' },
        { userId, name: 'Supplier C', category: 'Packaging Materials', notes: 'Adhoc packaging component supplier.' }
      ];
      await prisma.supplier.createMany({ data: defaults });
      suppliers = await prisma.supplier.findMany({
        where: { userId },
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
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

    const supplier = await prisma.supplier.create({
      data: {
        userId,
        name: body.name,
        category: body.category || null,
        notes: body.notes || null,
      }
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
