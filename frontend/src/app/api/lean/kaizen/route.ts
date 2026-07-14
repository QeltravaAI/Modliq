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
    let actions = await prisma.kaizenAction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Seed default Kaizen actions if empty
    if (actions.length === 0) {
      const defaults = [
        { userId, title: 'Standardize pre-changeover staging', problem: 'Changeover delay due to missing raw materials.', rootCause: 'No standard process for staging before shutdown.', countermeasure: 'Create a pre-changeover layout map.', owner: 'Shift Lead A', priority: 'High', status: 'Backlog', impactArea: 'Operations' },
        { userId, title: 'Calibrate Mixer 1 temperature sensor', problem: 'Temperature readings fluctuating +/- 5 degrees.', rootCause: 'Sensor calibration overdue.', countermeasure: 'Recalibrate and implement a weekly verification check.', owner: 'Maintenance tech', priority: 'High', status: 'In Progress', impactArea: 'Quality' }
      ];
      await prisma.kaizenAction.createMany({ data: defaults });
      actions = await prisma.kaizenAction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ success: true, actions });
  } catch (error) {
    console.error('Error fetching Kaizen actions:', error);
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

    const action = await prisma.kaizenAction.create({
      data: {
        userId,
        title: body.title,
        problem: body.problem || null,
        rootCause: body.rootCause || null,
        countermeasure: body.countermeasure || null,
        owner: body.owner || null,
        priority: body.priority || 'Medium',
        status: body.status || 'Backlog',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        impactArea: body.impactArea || null,
        linkedDatasetId: body.linkedDatasetId || null,
        linkedBatchId: body.linkedBatchId || null,
      }
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error creating Kaizen action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
