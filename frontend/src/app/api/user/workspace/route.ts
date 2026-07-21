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
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user && payload.email) {
      user = await prisma.user.findUnique({
        where: { email: payload.email }
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: payload.email,
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
      healthReport: (user as any).healthReport ? JSON.parse((user as any).healthReport) : null,
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

    // Allowed fields to update
    const updateData: any = {};
    const allowedFields = [
      'activeDatasetId',
      'activeDatasetFilename',
      'datasetAnalytics',
      'datasetPreview',
      'parsedIntent',
      'activeOptimizationJobId',
      'latestOptimizationResult',
      'healthReport',
    ];

    const jsonFields = ['datasetAnalytics', 'datasetPreview', 'parsedIntent', 'latestOptimizationResult', 'healthReport'];

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
    if (!user && payload.email) {
      user = await prisma.user.findUnique({ where: { email: payload.email } });
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
          email: payload.email,
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
