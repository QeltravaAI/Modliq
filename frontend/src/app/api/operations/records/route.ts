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
    let records = await prisma.operationsRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Smart auto-population from active dataset if empty
    if (records.length === 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.datasetPreview) {
        try {
          const preview = JSON.parse(user.datasetPreview);
          const rows = Array.isArray(preview) ? preview : (preview.rows || []);
          
          // Detect if operations columns exist in the rows
          const firstRow = rows[0] || {};
          const keys = Object.keys(firstRow).map(k => k.toLowerCase().replace(/[\s_-]+/g, '_'));
          
          const hasLine = keys.some(k => k.includes('line'));
          const hasDowntime = keys.some(k => k.includes('downtime'));
          
          if (hasLine || hasDowntime) {
            // Bulk insert up to 100 rows to avoid SQLite blockages
            // Bulk insert up to 100 rows to avoid SQLite blockages
            const toInsert = rows.slice(0, 100).map((row: any) => {
              const rKeys = Object.keys(row);
              
              const getStr = (patterns: string[]): string | null => {
                const foundKey = rKeys.find(k => {
                  const nk = k.toLowerCase().replace(/[\s_-]+/g, '_');
                  return patterns.some(p => nk.includes(p));
                });
                return foundKey ? String(row[foundKey]) : null;
              };

              const getNum = (patterns: string[], fallback = 0): number => {
                const foundKey = rKeys.find(k => {
                  const nk = k.toLowerCase().replace(/[\s_-]+/g, '_');
                  return patterns.some(p => nk.includes(p));
                });
                if (!foundKey) return fallback;
                const parsed = Number(row[foundKey]);
                return isNaN(parsed) ? fallback : parsed;
              };

              const yieldVal = getNum(['yield'], 95);
              const plannedTime = getNum(['planned_time'], 480);
              const downtime = getNum(['downtime_minutes', 'downtime'], 0);
              const totalCount = getNum(['total_count', 'total'], 1000);
              const goodCount = getNum(['good_count', 'good'], Math.round(totalCount * (yieldVal / 100)));
              const rejectCount = getNum(['reject_count', 'reject', 'defect_count'], totalCount - goodCount);
              const scrapRate = totalCount > 0 ? (rejectCount / totalCount) : 0;

              return {
                userId,
                datasetId: user.activeDatasetId,
                batchId: getStr(['batch_id', 'batch']),
                line: getStr(['line']) || 'Line 1',
                machine: getStr(['machine']) || 'Mixer 1',
                shift: getStr(['shift']) || 'A',
                product: getStr(['product']) || 'Product Alpha',
                plannedTimeMinutes: plannedTime,
                runtimeMinutes: Math.max(0, plannedTime - downtime),
                downtimeMinutes: downtime,
                downtimeReason: getStr(['downtime_reason', 'reason']) || (downtime > 0 ? 'Mechanical' : null),
                idealCycleTimeSeconds: getNum(['ideal_cycle_time', 'cycle_time'], 30),
                totalCount: Math.round(totalCount),
                goodCount: Math.round(goodCount),
                rejectCount: Math.round(rejectCount),
                yieldValue: yieldVal,
                scrapRate: scrapRate,
              };
            });

            if (toInsert.length > 0) {
              await prisma.operationsRecord.createMany({ data: toInsert });
              // Fetch again to return
              records = await prisma.operationsRecord.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
              });
            }
          }
        } catch (err) {
          console.error('Error auto-populating operations records:', err);
        }
      }
    }

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Error getting operations records:', error);
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

    const record = await prisma.operationsRecord.create({
      data: {
        userId,
        datasetId: body.datasetId || null,
        batchId: body.batchId || null,
        line: body.line || 'Line 1',
        machine: body.machine || 'Mixer 1',
        shift: body.shift || 'A',
        product: body.product || 'Product Alpha',
        plannedTimeMinutes: Number(body.plannedTimeMinutes) || 480,
        runtimeMinutes: Number(body.runtimeMinutes) || 480,
        downtimeMinutes: Number(body.downtimeMinutes) || 0,
        downtimeReason: body.downtimeReason || null,
        idealCycleTimeSeconds: Number(body.idealCycleTimeSeconds) || 30,
        totalCount: Number(body.totalCount) || 1000,
        goodCount: Number(body.goodCount) || 1000,
        rejectCount: Number(body.rejectCount) || 0,
        yieldValue: Number(body.yieldValue) || 100.0,
        scrapRate: Number(body.scrapRate) || 0.0,
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error creating operations record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
