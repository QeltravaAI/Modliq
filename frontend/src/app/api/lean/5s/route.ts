import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let audits = await prisma.fiveSAudit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Seed default 5S audit if empty
    if (audits.length === 0) {
      const defaults = [
        { userId, area: 'Mixing Room', sort: 4, setInOrder: 3, shine: 4, standardize: 3, sustain: 2, notes: 'Need visual labels for clean tools.' }
      ];
      await prisma.fiveSAudit.createMany({ data: defaults });
      audits = await prisma.fiveSAudit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ success: true, audits });
  } catch (error) {
    console.error('Error fetching 5S audits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const audit = await prisma.fiveSAudit.create({
      data: {
        userId,
        area: body.area || 'All Areas',
        sort: Number(body.sort) || 5,
        setInOrder: Number(body.setInOrder) || 5,
        shine: Number(body.shine) || 5,
        standardize: Number(body.standardize) || 5,
        sustain: Number(body.sustain) || 5,
        notes: body.notes || null,
      }
    });

    return NextResponse.json({ success: true, audit });
  } catch (error) {
    console.error('Error creating 5S audit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
