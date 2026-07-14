import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WorkspaceAIContext {
  activeDatasetId: string | null;
  activeDatasetFilename: string | null;
  datasetPreviewSummary: {
    columns: string[];
    rowCount: number;
    rows: any[];
  } | null;
  datasetHealth: {
    score: number;
    status: string;
    warningCount: number;
    warnings: string[];
  } | null;
  goal: any | null;
  optimizationResult: any | null;
  operations: {
    recordsCount: number;
    avgOee: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    bottleneckMachine: string | null;
    topDowntimeReasons: string[];
  } | null;
  supplyChain: {
    lotsCount: number;
    suppliersCount: number;
    highRiskSuppliersCount: number;
    underperformingLots: string[];
  } | null;
  lean: {
    openKaizenCount: number;
    totalEstimatedLoss: number;
    latestFiveSAuditScore: number | null;
  } | null;
}

export async function buildWorkspaceAIContext(userId: string): Promise<WorkspaceAIContext> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return {
        activeDatasetId: null,
        activeDatasetFilename: null,
        datasetPreviewSummary: null,
        datasetHealth: null,
        goal: null,
        optimizationResult: null,
        operations: null,
        supplyChain: null,
        lean: null
      };
    }

    // 1. Dataset Preview & Analytics
    let datasetPreviewSummary = null;
    if (user.datasetPreview) {
      try {
        const preview = JSON.parse(user.datasetPreview);
        const rows = Array.isArray(preview) ? preview : (preview.rows || []);
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        datasetPreviewSummary = {
          columns,
          rowCount: rows.length,
          rows: rows.slice(0, 30) // Cap to max 30 rows for prompt length safety
        };
      } catch (e) {
        console.error('Failed to parse datasetPreview:', e);
      }
    }

    // 2. Health Report
    let datasetHealth = null;
    if (user.healthReport) {
      try {
        const report = typeof user.healthReport === 'string' ? JSON.parse(user.healthReport) : user.healthReport;
        datasetHealth = {
          score: report.score || 0,
          status: report.status || 'UNKNOWN',
          warningCount: (report.warnings || []).length,
          warnings: (report.warnings || []).slice(0, 15).map((w: any) => typeof w === 'string' ? w : w.message) // Limit warnings count
        };
      } catch (e) {
        console.error('Failed to parse healthReport:', e);
      }
    }

    // 3. Goal & Optimization
    let goal = null;
    if (user.parsedIntent) {
      try {
        goal = JSON.parse(user.parsedIntent);
      } catch (e) {}
    }

    let optimizationResult = null;
    if (user.latestOptimizationResult) {
      try {
        optimizationResult = JSON.parse(user.latestOptimizationResult);
      } catch (e) {}
    }

    // 4. Operations Summary
    const opRecords = await prisma.operationsRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let operations = null;
    if (opRecords.length > 0) {
      let oeeSum = 0;
      let availSum = 0;
      let perfSum = 0;
      let qualSum = 0;
      const downtimeMinutes: Record<string, number> = {};
      const machineDowntime: Record<string, number> = {};

      opRecords.forEach(r => {
        // Availability
        const avail = r.plannedTimeMinutes && r.runtimeMinutes ? Math.min(1, r.runtimeMinutes / r.plannedTimeMinutes) : 1;
        // Performance
        const perf = r.runtimeMinutes && r.idealCycleTimeSeconds && r.totalCount
          ? Math.min(1, (r.idealCycleTimeSeconds * r.totalCount) / (r.runtimeMinutes * 60))
          : 1;
        // Quality
        const qual = r.totalCount && r.goodCount ? Math.min(1, r.goodCount / r.totalCount) : 1;
        const oee = avail * perf * qual;

        oeeSum += oee;
        availSum += avail;
        perfSum += perf;
        qualSum += qual;

        if (r.downtimeReason && r.downtimeMinutes) {
          downtimeMinutes[r.downtimeReason] = (downtimeMinutes[r.downtimeReason] || 0) + r.downtimeMinutes;
        }
        if (r.machine && r.downtimeMinutes) {
          machineDowntime[r.machine] = (machineDowntime[r.machine] || 0) + r.downtimeMinutes;
        }
      });

      // Find bottleneck machine
      let bottleneckMachine = null;
      let maxDowntime = 0;
      Object.entries(machineDowntime).forEach(([m, d]) => {
        if (d > maxDowntime) {
          maxDowntime = d;
          bottleneckMachine = m;
        }
      });

      operations = {
        recordsCount: opRecords.length,
        avgOee: oeeSum / opRecords.length,
        avgAvailability: availSum / opRecords.length,
        avgPerformance: perfSum / opRecords.length,
        avgQuality: qualSum / opRecords.length,
        bottleneckMachine,
        topDowntimeReasons: Object.keys(downtimeMinutes).sort((a, b) => downtimeMinutes[b] - downtimeMinutes[a]).slice(0, 5)
      };
    }

    // 5. Supply Chain Summary
    const lots = await prisma.materialLot.findMany({ where: { userId } });
    const suppliers = await prisma.supplier.findMany({ where: { userId } });

    let supplyChain = null;
    if (lots.length > 0 || suppliers.length > 0) {
      const underperformingLots = lots
        .filter(l => (l.defectRate && l.defectRate > 0.05) || (l.linkedYield && l.linkedYield < 85))
        .map(l => `${l.lotCode} (${l.supplierName || 'Unknown'})`)
        .slice(0, 10);

      // Compute supplier risk metrics
      const supplierLots: Record<string, number> = {};
      const supplierDefectSum: Record<string, number> = {};
      lots.forEach(l => {
        if (l.supplierName) {
          supplierLots[l.supplierName] = (supplierLots[l.supplierName] || 0) + 1;
          if (l.defectRate) {
            supplierDefectSum[l.supplierName] = (supplierDefectSum[l.supplierName] || 0) + l.defectRate;
          }
        }
      });

      let highRiskSuppliersCount = 0;
      Object.entries(supplierLots).forEach(([name, count]) => {
        const avgDefect = (supplierDefectSum[name] || 0) / count;
        if (avgDefect > 0.08) {
          highRiskSuppliersCount++;
        }
      });

      supplyChain = {
        lotsCount: lots.length,
        suppliersCount: suppliers.length,
        highRiskSuppliersCount,
        underperformingLots
      };
    }

    // 6. Lean Summary
    const kaizenCount = await prisma.kaizenAction.count({
      where: { userId, status: { not: 'Completed' } }
    });
    const wasteEvents = await prisma.leanWasteEvent.findMany({ where: { userId } });
    const totalEstimatedLoss = wasteEvents.reduce((sum, w) => sum + (w.estimatedLoss || 0), 0);

    const latestAudit = await prisma.fiveSAudit.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let latestFiveSAuditScore = null;
    if (latestAudit) {
      latestFiveSAuditScore = (latestAudit.sort + latestAudit.setInOrder + latestAudit.shine + latestAudit.standardize + latestAudit.sustain) * 4; // Normalized to 100
    }

    const lean = {
      openKaizenCount: kaizenCount,
      totalEstimatedLoss,
      latestFiveSAuditScore
    };

    return {
      activeDatasetId: user.activeDatasetId,
      activeDatasetFilename: user.activeDatasetFilename,
      datasetPreviewSummary,
      datasetHealth,
      goal,
      optimizationResult,
      operations,
      supplyChain,
      lean
    };
  } catch (error) {
    console.error('buildWorkspaceAIContext failed:', error);
    return {
      activeDatasetId: null,
      activeDatasetFilename: null,
      datasetPreviewSummary: null,
      datasetHealth: null,
      goal: null,
      optimizationResult: null,
      operations: null,
      supplyChain: null,
      lean: null
    };
  }
}
