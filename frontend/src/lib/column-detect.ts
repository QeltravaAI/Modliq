export interface DetectedModules {
  optimization: boolean;
  qualityStudio: boolean;
  operations: boolean;
  supplyChain: boolean;
  lean: boolean;
  detectedColumns: {
    supplyChain: string[];
    operations: string[];
    lean: string[];
  };
}

export function detectModules(columns: string[]): DetectedModules {
  const normalized = columns.map(c => c.toLowerCase().trim().replace(/[\s_-]+/g, '_'));

  // Supply Chain columns
  const supplyChainPatterns = [
    'supplier', 'supplier_name', 'vendor', 'material_lot', 'raw_material_lot', 
    'lot_id', 'incoming_quality', 'incoming_defects', 'received_date'
  ];
  const detectedSC = columns.filter((_, idx) => 
    supplyChainPatterns.some(pat => normalized[idx].includes(pat))
  );

  // Operations columns
  const operationsPatterns = [
    'line', 'machine', 'shift', 'operator', 'downtime', 'downtime_minutes', 
    'downtime_reason', 'runtime', 'planned_time', 'cycle_time', 'ideal_cycle_time', 
    'good_count', 'reject_count', 'scrap', 'scrap_rate', 'throughput'
  ];
  const detectedOps = columns.filter((_, idx) =>
    operationsPatterns.some(pat => normalized[idx].includes(pat))
  );
  const detectedOpsNormalized = detectedOps.map(c => c.toLowerCase().trim().replace(/[\s_-]+/g, '_'));

  // Lean columns
  const leanPatterns = [
    'waste_type', 'loss_minutes', 'waiting_time', 'changeover_time', 'wip',
    'inventory', 'rework', 'defects'
  ];
  const detectedLean = columns.filter((_, idx) =>
    leanPatterns.some(pat => normalized[idx].includes(pat))
  );

  return {
    optimization: columns.length > 0,
    qualityStudio: columns.some(c => c.toLowerCase().includes('yield') || c.toLowerCase().includes('defect') || c.toLowerCase().includes('pass')),
    operations: detectedOps.length >= 2,
    supplyChain: detectedSC.length >= 2,
    lean: detectedLean.length >= 1 || detectedOpsNormalized.includes('downtime_reason') || detectedOpsNormalized.includes('downtime_minutes'),
    detectedColumns: {
      supplyChain: detectedSC,
      operations: detectedOps,
      lean: detectedLean
    }
  };
}
