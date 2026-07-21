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

    const suppliers = await prisma.supplier.findMany({ where: { userId } });
    const lots = await prisma.materialLot.findMany({ where: { userId } });

    if (lots.length === 0) {
      return NextResponse.json({
        success: true,
        summary: null
      });
    }

    // Aggregators per supplier
    const supplierStats: Record<string, {
      name: string;
      totalLots: number;
      acceptedLots: number;
      rejectedLots: number;
      defectRateSum: number;
      yieldSum: number;
      yieldCount: number;
    }> = {};

    lots.forEach(lot => {
      const sName = lot.supplierName || 'Unknown Supplier';
      if (!supplierStats[sName]) {
        supplierStats[sName] = {
          name: sName,
          totalLots: 0,
          acceptedLots: 0,
          rejectedLots: 0,
          defectRateSum: 0,
          yieldSum: 0,
          yieldCount: 0
        };
      }

      const stat = supplierStats[sName];
      stat.totalLots++;
      if (lot.incomingStatus === 'ACCEPTED') {
        stat.acceptedLots++;
      } else {
        stat.rejectedLots++;
      }

      if (lot.defectRate !== null) {
        stat.defectRateSum += lot.defectRate;
      }
      if (lot.linkedYield !== null) {
        stat.yieldSum += lot.linkedYield;
        stat.yieldCount++;
      }
    });

    const scorecard = Object.values(supplierStats).map(s => {
      const acceptanceRate = s.totalLots > 0 ? (s.acceptedLots / s.totalLots) * 100 : 100;
      const avgDefectRate = s.totalLots > 0 ? (s.defectRateSum / s.totalLots) * 100 : 0.0;
      const avgYield = s.yieldCount > 0 ? (s.yieldSum / s.yieldCount) : 95.0; // Fallback to 95.0%

      // Score Calculation
      // 40% incoming quality score (100 - avgDefectRate * 500, capped 0-100)
      const qualityScore = Math.max(0, 100 - (avgDefectRate * 5)); 
      // 30% production yield score (avgYield normalized: e.g., mapping 80-100 yield to 0-100 score)
      const yieldScore = Math.max(0, Math.min(100, (avgYield - 80) * 5));
      // 20% on-time delivery score (fixed 95 for MVP)
      const deliveryScore = 95.0;
      // 10% rejection rate score (acceptanceRate)
      const rejectionScore = acceptanceRate;

      const totalScore = Math.round(
        (qualityScore * 0.4) + (yieldScore * 0.3) + (deliveryScore * 0.2) + (rejectionScore * 0.1)
      );

      // Risk status: Score >= 90: Excellent; 75–89: Good; 60–74: Needs Review; <60: High Risk
      const riskStatus = totalScore >= 90 ? 'Excellent' : totalScore >= 75 ? 'Good' : totalScore >= 60 ? 'Needs Review' : 'High Risk';

      return {
        supplierName: s.name,
        totalLots: s.totalLots,
        acceptedLots: s.acceptedLots,
        rejectedLots: s.rejectedLots,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        avgDefectRate: Math.round(avgDefectRate * 100) / 100,
        avgYield: Math.round(avgYield * 10) / 10,
        score: totalScore,
        status: riskStatus
      };
    }).sort((a, b) => a.score - b.score); // Worst first to highlight risk

    // Supplier alerts
    const alerts: string[] = [];
    scorecard.forEach(s => {
      if (s.status === 'High Risk') {
        alerts.push(`Supplier ${s.supplierName} is classified as High Risk (Score: ${s.score})`);
      }
      if (s.acceptanceRate < 85) {
        alerts.push(`Supplier ${s.supplierName} acceptance rate is below target (${s.acceptanceRate}%)`);
      }
    });

    lots.forEach(l => {
      if (l.defectRate && l.defectRate > 0.08) {
        alerts.push(`Material lot ${l.lotCode} (${l.supplierName}) failed incoming inspection with ${Math.round(l.defectRate * 100)}% defects`);
      }
      if (l.linkedYield && l.linkedYield < 88.0) {
        alerts.push(`Material lot ${l.lotCode} associated with low production batch yield (${l.linkedYield}%)`);
      }
    });

    // Supplier Yield Correlation Recharts data
    const supplierYieldChart = scorecard.map(s => ({
      name: s.supplierName,
      yield: s.avgYield,
      defects: s.avgDefectRate
    }));

    return NextResponse.json({
      success: true,
      summary: {
        scorecard,
        alerts: alerts.slice(0, 5), // return top 5 alerts
        supplierYieldChart,
        totalLotsAnalyzed: lots.length,
        averageScrapRate: lots.length > 0 ? (lots.filter(l => l.incomingStatus === 'REJECTED').length / lots.length) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error computing supply chain summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
