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

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
    }

    if (!user) {
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
      datasetAnalytics: user.datasetAnalytics ? JSON.parse(user.datasetAnalytics) : null,
      datasetPreview: user.datasetPreview ? JSON.parse(user.datasetPreview) : null,
      parsedIntent: user.parsedIntent ? JSON.parse(user.parsedIntent) : null,
      activeOptimizationJobId: user.activeOptimizationJobId,
      latestOptimizationResult: user.latestOptimizationResult ? JSON.parse(user.latestOptimizationResult) : null,
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

    const jsonFields = ['datasetAnalytics', 'datasetPreview', 'parsedIntent', 'latestOptimizationResult'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (jsonFields.includes(field)) {
          updateData[field] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    } else {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email,
          ...updateData
        }
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
