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

    const wasteEvents = await prisma.leanWasteEvent.findMany({ where: { userId } });
    const kaizenActions = await prisma.kaizenAction.findMany({ where: { userId } });
    const audits = await prisma.fiveSAudit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    // Aggregate Waste Types for Pareto
    const wasteLosses: Record<string, number> = {};
    let totalEstimatedLoss = 0;

    wasteEvents.forEach(w => {
      const type = w.wasteType || 'Other';
      const loss = w.estimatedLoss || 0;
      wasteLosses[type] = (wasteLosses[type] || 0) + loss;
      totalEstimatedLoss += loss;
    });

    const wastePareto = Object.entries(wasteLosses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Calculate Kaizen stats
    const openKaizenCount = kaizenActions.filter(a => a.status !== 'Completed').length;
    const completedKaizenCount = kaizenActions.filter(a => a.status === 'Completed').length;
    
    // Group Kaizen actions by status for Kanban visualization
    const kanbanGroups = {
      Backlog: kaizenActions.filter(a => a.status === 'Backlog'),
      Planned: kaizenActions.filter(a => a.status === 'Planned'),
      InProgress: kaizenActions.filter(a => a.status === 'In Progress'),
      Validating: kaizenActions.filter(a => a.status === 'Validating'),
      Completed: kaizenActions.filter(a => a.status === 'Completed'),
    };

    // Calculate latest 5S score
    let latest5sScore = null;
    let categoryBreakdown = null;
    let auditNote = null;

    if (audits.length > 0) {
      const latest = audits[0];
      const sum = latest.sort + latest.setInOrder + latest.shine + latest.standardize + latest.sustain;
      latest5sScore = sum * 4; // Max sum is 25, normalize to 100
      auditNote = latest.notes;

      categoryBreakdown = [
        { name: 'Sort', score: latest.sort * 20 },
        { name: 'Set In Order', score: latest.setInOrder * 20 },
        { name: 'Shine', score: latest.shine * 20 },
        { name: 'Standardize', score: latest.standardize * 20 },
        { name: 'Sustain', score: latest.sustain * 20 },
      ];
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalEstimatedLoss,
        openKaizenCount,
        completedKaizenCount,
        wastePareto,
        kanbanGroups,
        latest5sScore,
        categoryBreakdown,
        auditNote
      }
    });
  } catch (error) {
    console.error('Error computing lean summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
