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

    // Fetch records
    const records = await prisma.operationsRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        summary: null
      });
    }

    let oeeSum = 0;
    let availSum = 0;
    let perfSum = 0;
    let qualSum = 0;
    let totalPlanned = 0;
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalGood = 0;
    let totalRejects = 0;
    let totalItems = 0;

    const downtimeReasons: Record<string, number> = {};
    const lineOee: Record<string, { count: number; oee: number; yield: number; downtime: number }> = {};
    const shiftOee: Record<string, { count: number; oee: number; yield: number; downtime: number }> = {};
    const machineDowntime: Record<string, number> = {};

    records.forEach(r => {
      const planned = r.plannedTimeMinutes || 480;
      const downtime = r.downtimeMinutes || 0;
      const runtime = Math.max(0, planned - downtime);
      const total = r.totalCount || 1000;
      const good = r.goodCount || Math.round(total * 0.95);
      const reject = r.rejectCount || (total - good);
      const idealCycle = r.idealCycleTimeSeconds || 30;

      // OEE Component Math
      const avail = planned > 0 ? Math.min(1, runtime / planned) : 1;
      const perf = runtime > 0 ? Math.min(1, (idealCycle * total) / (runtime * 60)) : 1;
      const qual = total > 0 ? Math.min(1, good / total) : 1;
      const oee = avail * perf * qual;

      oeeSum += oee;
      availSum += avail;
      perfSum += perf;
      qualSum += qual;

      totalPlanned += planned;
      totalRuntime += runtime;
      totalDowntime += downtime;
      totalGood += good;
      totalRejects += reject;
      totalItems += total;

      // Downtime Pareto Grouping
      if (r.downtimeReason && downtime > 0) {
        downtimeReasons[r.downtimeReason] = (downtimeReasons[r.downtimeReason] || 0) + downtime;
      }
      if (r.machine && downtime > 0) {
        machineDowntime[r.machine] = (machineDowntime[r.machine] || 0) + downtime;
      }

      // Grouping by Line
      if (r.line) {
        const curr = lineOee[r.line] || { count: 0, oee: 0, yield: 0, downtime: 0 };
        lineOee[r.line] = {
          count: curr.count + 1,
          oee: curr.oee + oee,
          yield: curr.yield + (r.yieldValue || (good / total) * 100),
          downtime: curr.downtime + downtime
        };
      }

      // Grouping by Shift
      if (r.shift) {
        const curr = shiftOee[r.shift] || { count: 0, oee: 0, yield: 0, downtime: 0 };
        shiftOee[r.shift] = {
          count: curr.count + 1,
          oee: curr.oee + oee,
          yield: curr.yield + (r.yieldValue || (good / total) * 100),
          downtime: curr.downtime + downtime
        };
      }
    });

    // Bottleneck Machine: Machine with highest total downtime minutes
    let bottleneckMachine = null;
    let maxDowntime = 0;
    Object.entries(machineDowntime).forEach(([m, d]) => {
      if (d > maxDowntime) {
        maxDowntime = d;
        bottleneckMachine = m;
      }
    });

    const count = records.length;
    const avgOee = oeeSum / count;
    const avgAvail = availSum / count;
    const avgPerf = perfSum / count;
    const avgQual = qualSum / count;

    // Status bands: 85%+ = World Class; 70-84% = Good; 60-69% = Needs Improvement; <60% = Critical
    const oeeStatus = avgOee >= 0.85 ? 'World Class' : avgOee >= 0.70 ? 'Good' : avgOee >= 0.60 ? 'Needs Improvement' : 'Critical';

    // Format Pareto Chart Data
    const paretoData = Object.entries(downtimeReasons)
      .map(([reason, minutes]) => ({ name: reason, value: minutes }))
      .sort((a, b) => b.value - a.value);

    // Cumulative Pareto Calculation
    const totalMinutes = paretoData.reduce((s, item) => s + item.value, 0);
    let accum = 0;
    const paretoWithPercent = paretoData.map(item => {
      accum += item.value;
      return {
        ...item,
        percentage: totalMinutes > 0 ? Math.round((item.value / totalMinutes) * 100) : 0,
        cumulative: totalMinutes > 0 ? Math.round((accum / totalMinutes) * 100) : 0
      };
    });

    // Format Line Comparisons
    const lineComparison = Object.entries(lineOee).map(([name, data]) => ({
      name,
      oee: Math.round((data.oee / data.count) * 1000) / 10,
      yield: Math.round((data.yield / data.count) * 10) / 10,
      downtime: Math.round(data.downtime / data.count)
    }));

    // Format Shift Comparisons
    const shiftComparison = Object.entries(shiftOee).map(([name, data]) => ({
      name: `Shift ${name}`,
      oee: Math.round((data.oee / data.count) * 1000) / 10,
      yield: Math.round((data.yield / data.count) * 10) / 10,
      downtime: Math.round(data.downtime / data.count)
    }));

    return NextResponse.json({
      success: true,
      summary: {
        oee: Math.round(avgOee * 1000) / 10,
        status: oeeStatus,
        availability: Math.round(avgAvail * 1000) / 10,
        performance: Math.round(avgPerf * 1000) / 10,
        quality: Math.round(avgQual * 1000) / 10,
        scrapRate: totalItems > 0 ? Math.round((totalRejects / totalItems) * 10000) / 100 : 0.0,
        totalGoodCount: totalGood,
        totalPlannedMinutes: totalPlanned,
        totalRuntimeMinutes: totalRuntime,
        totalDowntimeMinutes: totalDowntime,
        bottleneckMachine: bottleneckMachine || 'N/A',
        bottleneckDowntime: maxDowntime,
        paretoChart: paretoWithPercent,
        lineComparison,
        shiftComparison
      }
    });
  } catch (error) {
    console.error('Error computing operations summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
