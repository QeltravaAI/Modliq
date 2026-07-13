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
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Upsert user if not exists
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email,
        }
      });
    }

    return NextResponse.json({
      activeDatasetId: user.activeDatasetId,
      activeDatasetFilename: user.activeDatasetFilename,
      datasetAnalytics: user.datasetAnalytics,
      datasetPreview: user.datasetPreview,
      parsedIntent: user.parsedIntent,
      activeOptimizationJobId: user.activeOptimizationJobId,
      latestOptimizationResult: user.latestOptimizationResult,
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Allowed fields to update
    const updateData: any = {};
    const allowedFields = [
      'activeDatasetId',
      'activeDatasetFilename',
      'datasetAnalytics',
      'datasetPreview',
      'parsedIntent',
      'activeOptimizationJobId',
      'latestOptimizationResult'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: updateData,
      create: {
        id: userId,
        email: session.user.email,
        ...updateData
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
