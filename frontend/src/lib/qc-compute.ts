/**
 * Client-side QC computation library.
 * Mirrors ml-engine/services/qc_statistics.py + qc_insights.py.
 * Runs entirely in the browser — no backend required.
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface SummaryResult {
  count: number;
  mean: number;
  median: number;
  std_dev: number;
  variance: number;
  range: number;
  min: number;
  max: number;
  skewness: number;
  q1: number;
  q3: number;
  outliers: { index: number; value: number; reason: string }[];
  outlier_count: number;
  outlier_indices: number[];
  insights: InsightBlock;
}

export interface InsightBlock {
  status: string;
  label?: string;
  summary: string;
  recommended_actions: string[];
  technical_basis?: string[];
  note?: string;
}

export interface IMRPoint {
  index: number;
  label: string;
  value: number;
  status: "normal" | "violation";
}

export interface IMRResult {
  chart_type: "imr";
  individuals_chart: {
    center_line: number;
    ucl: number;
    lcl: number;
    points: IMRPoint[];
  };
  moving_range_chart: {
    center_line: number;
    ucl: number;
    lcl: number;
    points: IMRPoint[];
  };
  violations: number[];
  trend_detected: boolean;
  stability_score: number;
  stability: InsightBlock & { score: number };
}

export interface CapabilityResult {
  count: number;
  mean: number;
  std_dev: number;
  lsl: number;
  usl: number;
  target?: number;
  cp: number;
  cpk: number;
  cpu: number;
  cpl: number;
  pp: number;
  ppk: number;
  sigma_level: number;
  insights: InsightBlock;
}

export interface AcceptanceSamplingResult {
  lot_size: number;
  aql: number;
  aql_used: number;
  inspection_level: string;
  sample_size: number;
  acceptance_number: number;
  rejection_number: number;
  defects_found?: number;
  decision: "accept" | "reject" | "plan";
  insights: InsightBlock;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const r4 = (n: number) => Math.round(n * 10000) / 10000;

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[], m?: number) {
  const mu = m ?? mean(arr);
  return arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1);
}

function stddev(arr: number[]) {
  return Math.sqrt(variance(arr));
}

function detectTrend(values: number[], run = 6): boolean {
  for (let i = 0; i <= values.length - run; i++) {
    const w = values.slice(i, i + run);
    if (w.every((v, j) => j === 0 || v > w[j - 1])) return true;
    if (w.every((v, j) => j === 0 || v < w[j - 1])) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// 1. QUALITY SUMMARY
// ─────────────────────────────────────────────
export function computeSummary(values: number[], metric = "Value"): SummaryResult {
  const n = values.length;
  const mu = mean(values);
  const med = (() => {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  })();
  const sd = n > 1 ? stddev(values) : 0;
  const vr = n > 1 ? variance(values) : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lf = q1 - 1.5 * iqr;
  const uf = q3 + 1.5 * iqr;

  // Skewness (Fisher)
  const skewness =
    sd > 0 && n > 2
      ? (n / ((n - 1) * (n - 2))) *
        values.reduce((s, v) => s + ((v - mu) / sd) ** 3, 0)
      : 0;

  const outliers = values
    .map((v, i) => {
      if (v < lf)
        return { index: i, value: r4(v), reason: `Below Q1 − 1.5×IQR (${r4(lf)})` };
      if (v > uf)
        return { index: i, value: r4(v), reason: `Above Q3 + 1.5×IQR (${r4(uf)})` };
      return null;
    })
    .filter(Boolean) as { index: number; value: number; reason: string }[];

  const cv = mu !== 0 ? (sd / mu) * 100 : 0;
  const level = cv < 2 ? "low" : cv < 5 ? "moderate" : "high";
  const oc = outliers.length;

  let status: string, summary: string, actions: string[];
  if (oc === 0 && level === "low") {
    status = "good";
    summary = `${metric} average is ${r4(mu)} with low variation (CV=${r4(cv)}%). The process looks consistent.`;
    actions = ["Continue monitoring for sustained stability.", "Consider tightening control limits if Cpk allows."];
  } else if (oc === 0 && level === "moderate") {
    status = "needs_attention";
    summary = `${metric} average is ${r4(mu)}, but variation is moderate (CV=${r4(cv)}%). No outliers detected.`;
    actions = ["Investigate sources of variation (machine, shift, material).", "Run a capability study to confirm process meets spec."];
  } else if (oc > 0 && level !== "high") {
    status = "needs_attention";
    const bl = outliers.slice(0, 5).map((o) => o.index).join(", ");
    summary = `${metric} average is ${r4(mu)} with ${level} variation. ${oc} outlier(s) detected at record(s) ${bl}.`;
    actions = [`Review outlier records (${bl}) for root cause.`, "Check for special causes: machine fault, material change, operator shift.", "Remove confirmed special-cause points before recalculating control limits."];
  } else {
    status = "unstable";
    const bl = outliers.slice(0, 5).map((o) => o.index).join(", ");
    summary = `${metric} average is ${r4(mu)}, but variation is high (CV=${r4(cv)}%) with ${oc} outliers. Process requires investigation.`;
    actions = ["Do not update SOP until variation is reduced.", `Prioritise investigation of records ${bl}.`, "Perform a root-cause analysis by machine, shift, and material batch."];
  }

  return {
    count: n,
    mean: r4(mu),
    median: r4(med),
    std_dev: r4(sd),
    variance: r4(vr),
    range: r4(Math.max(...values) - Math.min(...values)),
    min: r4(Math.min(...values)),
    max: r4(Math.max(...values)),
    skewness: r4(skewness),
    q1: r4(q1),
    q3: r4(q3),
    outliers,
    outlier_count: oc,
    outlier_indices: outliers.map((o) => o.index),
    insights: { status, summary, recommended_actions: actions },
  };
}

// ─────────────────────────────────────────────
// 2. I-MR CONTROL CHART
// ─────────────────────────────────────────────
const IMR_E2 = 2.66;
const IMR_D4 = 3.267;

export function computeIMRChart(measurements: number[], labels: string[]): IMRResult {
  const n = measurements.length;
  const xbar = mean(measurements);
  const mrs = measurements.slice(1).map((v, i) => Math.abs(v - measurements[i]));
  const mrbar = mean(mrs);

  const ucl_i = xbar + IMR_E2 * mrbar;
  const lcl_i = xbar - IMR_E2 * mrbar;
  const ucl_mr = IMR_D4 * mrbar;

  const violations: number[] = [];
  const indPoints: IMRPoint[] = measurements.map((v, i) => {
    const viol = v > ucl_i || v < lcl_i;
    if (viol) violations.push(i);
    return { index: i, label: labels[i] ?? String(i + 1), value: r4(v), status: viol ? "violation" : "normal" };
  });

  const mrPoints: IMRPoint[] = mrs.map((mr, i) => ({
    index: i + 1,
    label: labels[i + 1] ?? String(i + 2),
    value: r4(mr),
    status: mr > ucl_mr ? "violation" : "normal",
  }));

  const trend = detectTrend(measurements);
  const score = Math.max(0, Math.round(100 - (violations.length / n) * 200));

  // Stability insight
  const techBasis: string[] = [];
  if (violations.length > 0) techBasis.push(`${violations.length} point(s) beyond UCL/LCL`);
  if (trend) techBasis.push("6+ consecutive points in one direction (trend rule)");

  let stabStatus: string, stabSummary: string, stabActions: string[];
  if (violations.length === 0 && !trend) {
    stabStatus = "stable";
    stabSummary = `The process appears stable. No points are outside the control limits across ${n} observations.`;
    stabActions = ["Continue monitoring regularly.", "Consider a capability study to confirm process meets specifications."];
  } else if (violations.length === 1 && !trend) {
    stabStatus = "needs_attention";
    stabSummary = `1 point is outside the control limits (point ${violations[0]}). This may be a special cause. Investigate before updating control limits.`;
    stabActions = [`Investigate point ${violations[0]}: check for machine fault, material change, or operator error.`, "If a special cause is confirmed, remove it and recalculate limits.", "Do not adjust process settings based on one signal alone."];
  } else {
    stabStatus = "unstable";
    const vl = violations.slice(0, 5).join(", ");
    stabSummary = `The process is NOT stable. ${violations.length} point(s) are outside the control limits (at ${vl}). Immediate investigation required.`;
    stabActions = [`Investigate out-of-control points: ${vl}.`, "Identify whether a common pattern exists (shift change, machine, material).", "Do not update SOP or control limits until the process is stable for ≥20 consecutive points."];
  }

  return {
    chart_type: "imr",
    individuals_chart: { center_line: r4(xbar), ucl: r4(ucl_i), lcl: r4(lcl_i), points: indPoints },
    moving_range_chart: { center_line: r4(mrbar), ucl: r4(ucl_mr), lcl: 0, points: mrPoints },
    violations,
    trend_detected: trend,
    stability_score: score,
    stability: {
      status: stabStatus,
      score,
      summary: stabSummary,
      recommended_actions: stabActions,
      technical_basis: techBasis,
    },
  };
}

// ─────────────────────────────────────────────
// 3. PROCESS CAPABILITY
// ─────────────────────────────────────────────
export function computeCapability(
  values: number[],
  lsl: number,
  usl: number,
  target?: number
): CapabilityResult {
  const n = values.length;
  const mu = mean(values);
  const sd = stddev(values);
  const tolerance = usl - lsl;
  const cp = sd > 0 ? r4(tolerance / (6 * sd)) : Infinity;
  const cpu = sd > 0 ? r4((usl - mu) / (3 * sd)) : Infinity;
  const cpl = sd > 0 ? r4((mu - lsl) / (3 * sd)) : Infinity;
  const cpk = r4(Math.min(cpu, cpl));
  const sigmaLevel = r4(cpk * 3);

  // Capability insight
  let status: string, label: string, summary: string, actions: string[];
  if (cpk < 1.0) {
    status = "not_capable"; label = "Not Capable";
    summary = `Cpk = ${cpk}. The process is NOT capable — it cannot consistently meet specifications (LSL=${lsl}, USL=${usl}). Defects are likely.`;
    actions = ["Reduce process variation before increasing production volume.", "Identify and eliminate major sources of variation.", "Target Cpk ≥ 1.33 before approving full production."];
  } else if (cpk < 1.33) {
    status = "marginally_capable"; label = "Marginally Capable";
    summary = `Cpk = ${cpk}. The process is marginally capable. It can meet specifications but variation should be reduced for reliability.`;
    actions = ["Reduce process variation before scaling production.", "Investigate batches close to LSL or USL.", "Target Cpk ≥ 1.33 for a reliably capable process."];
  } else if (cpk < 1.67) {
    status = "capable"; label = "Capable";
    summary = `Cpk = ${cpk}. The process is capable and can meet specifications reliably.`;
    actions = ["Maintain current operating conditions.", "Monitor with control charts to sustain capability."];
  } else {
    status = "highly_capable"; label = "Highly Capable";
    summary = `Cpk = ${cpk}. The process is highly capable. Excellent process control.`;
    actions = ["Continue current practices.", "Consider tightening internal specifications for premium quality targets."];
  }

  if (Math.abs(cp - cpk) > 0.1) {
    actions.unshift(`Process mean (${r4(mu)}) is off-centre. Adjust process aim toward target.`);
  }

  return {
    count: n,
    mean: r4(mu),
    std_dev: r4(sd),
    lsl,
    usl,
    target,
    cp,
    cpk,
    cpu,
    cpl,
    pp: cp,
    ppk: cpk,
    sigma_level: sigmaLevel,
    insights: {
      status,
      label,
      summary,
      recommended_actions: actions,
      technical_basis: [
        `Cp = ${cp}  (process spread vs tolerance)`,
        `Cpk = ${cpk}  (worst-case distance to nearest spec limit)`,
        "Cpk < 1.00 → not capable | 1.00–1.33 → marginal | 1.33–1.67 → capable | ≥1.67 → highly capable",
      ],
    },
  };
}

// ─────────────────────────────────────────────
// 4. ACCEPTANCE SAMPLING (simplified AQL lookup)
// ─────────────────────────────────────────────
const LOT_TO_SAMPLE: [number, number, number][] = [
  [2, 8, 2], [9, 15, 3], [16, 25, 5], [26, 50, 8],
  [51, 90, 13], [91, 150, 20], [151, 280, 32], [281, 500, 50],
  [501, 1200, 80], [1201, 3200, 125], [3201, 10000, 200],
  [10001, 35000, 315], [35001, 150000, 500], [150001, 500000, 800],
  [500001, 1e9, 1250],
];

const AQL_TABLE: Record<string, Record<number, [number, number]>> = {
  "0.65": { 2:[0,1],3:[0,1],5:[0,1],8:[0,1],13:[0,1],20:[0,1],32:[0,1],50:[1,2],80:[1,2],125:[2,3],200:[3,4],315:[5,6],500:[7,8],800:[10,11],1250:[14,15] },
  "1.0":  { 2:[0,1],3:[0,1],5:[0,1],8:[0,1],13:[0,1],20:[0,1],32:[1,2],50:[1,2],80:[2,3],125:[3,4],200:[5,6],315:[7,8],500:[10,11],800:[14,15],1250:[21,22] },
  "1.5":  { 2:[0,1],3:[0,1],5:[0,1],8:[0,1],13:[0,1],20:[1,2],32:[1,2],50:[2,3],80:[3,4],125:[5,6],200:[7,8],315:[10,11],500:[14,15],800:[21,22],1250:[21,22] },
  "2.5":  { 2:[0,1],3:[0,1],5:[0,1],8:[0,1],13:[1,2],20:[1,2],32:[2,3],50:[3,4],80:[5,6],125:[7,8],200:[10,11],315:[14,15],500:[21,22],800:[21,22],1250:[21,22] },
  "4.0":  { 2:[0,1],3:[0,1],5:[0,1],8:[1,2],13:[1,2],20:[2,3],32:[3,4],50:[5,6],80:[7,8],125:[10,11],200:[14,15],315:[21,22],500:[21,22],800:[21,22],1250:[21,22] },
  "6.5":  { 2:[0,1],3:[0,1],5:[1,2],8:[1,2],13:[2,3],20:[3,4],32:[5,6],50:[7,8],80:[10,11],125:[14,15],200:[21,22],315:[21,22],500:[21,22],800:[21,22],1250:[21,22] },
};

function nearestAQL(aql: number): string {
  const keys = [0.65, 1.0, 1.5, 2.5, 4.0, 6.5];
  return String(keys.reduce((a, b) => (Math.abs(b - aql) < Math.abs(a - aql) ? b : a)));
}

export function computeAcceptanceSampling(
  lotSize: number,
  aql: number,
  inspectionLevel = "II",
  defectsFound?: number
): AcceptanceSamplingResult {
  let sampleSize = 1250;
  for (const [lo, hi, ss] of LOT_TO_SAMPLE) {
    if (lotSize >= lo && lotSize <= hi) { sampleSize = ss; break; }
  }

  const aqlKey = nearestAQL(aql);
  const row = AQL_TABLE[aqlKey] ?? {};
  const validSizes = Object.keys(row)
    .map(Number)
    .filter((k) => k <= sampleSize)
    .sort((a, b) => b - a);

  const [ac, re] = validSizes.length ? row[validSizes[0]] : [0, 1];
  const decision: "accept" | "reject" | "plan" =
    defectsFound === undefined ? "plan" : defectsFound <= ac ? "accept" : "reject";

  // Insight
  let status: string, summary: string, actions: string[];
  if (decision === "accept") {
    status = "accept";
    summary = `Inspect ${sampleSize} units. With ${defectsFound} defect(s) found, this lot PASSES inspection (acceptance number = ${ac}).`;
    actions = ["Document the inspection result and release the lot.", "If defects are near the acceptance limit, increase monitoring for the next lot."];
  } else if (decision === "reject") {
    status = "reject";
    summary = `With ${defectsFound} defect(s) found in ${sampleSize} units inspected, this lot FAILS inspection (rejection number = ${re}). The lot should be quarantined or sent for 100% inspection / rework.`;
    actions = ["Quarantine the lot and initiate a non-conformance report.", "Investigate root cause before releasing the next production batch.", "Consider 100% inspection or rework depending on defect severity."];
  } else {
    status = "plan";
    summary = `Inspect ${sampleSize} units from this lot. Accept if defects ≤ ${ac}. Reject if defects ≥ ${re}.`;
    actions = ["Conduct inspection and enter the defect count to get a final decision.", "Ensure inspectors are calibrated on the defect classification criteria."];
  }

  return {
    lot_size: lotSize,
    aql,
    aql_used: parseFloat(aqlKey),
    inspection_level: inspectionLevel,
    sample_size: sampleSize,
    acceptance_number: ac,
    rejection_number: re,
    defects_found: defectsFound,
    decision,
    insights: {
      status,
      summary,
      recommended_actions: actions,
      note: "MVP uses a simplified AQL lookup table. Validate against ANSI/ASQ Z1.4 or ISO 2859-1 before regulated production use.",
    },
  };
}

// ─────────────────────────────────────────────
// 5. P-CHART (proportion defective)
// Best for: pass/fail checks, varying batch sizes
// UCL_i = p̄ + 3√(p̄(1-p̄)/nᵢ)
// LCL_i = max(0, p̄ - 3√(p̄(1-p̄)/nᵢ))
// ─────────────────────────────────────────────
export interface PChartPoint {
  index: number;
  label: string;
  defects: number;
  sample_size: number;
  proportion: number;
  ucl: number;
  lcl: number;
  status: "normal" | "violation";
}

export interface PChartResult {
  chart_type: "p";
  center_line: number;
  points: PChartPoint[];
  violations: number[];
  trend_detected: boolean;
  stability_score: number;
  stability: InsightBlock & { score: number };
}

export function computePChart(
  defects: number[],
  sampleSizes: number[],
  labels: string[]
): PChartResult {
  const totalDefects = defects.reduce((a, b) => a + b, 0);
  const totalInspected = sampleSizes.reduce((a, b) => a + b, 0);
  const pBar = totalDefects / totalInspected;

  const violations: number[] = [];
  const points: PChartPoint[] = defects.map((d, i) => {
    const ni = sampleSizes[i];
    const pi = ni > 0 ? d / ni : 0;
    const sigma = ni > 0 ? Math.sqrt((pBar * (1 - pBar)) / ni) : 0;
    const ucl = r4(Math.min(1, pBar + 3 * sigma));
    const lcl = r4(Math.max(0, pBar - 3 * sigma));
    const viol = pi > ucl || (lcl > 0 && pi < lcl);
    if (viol) violations.push(i);
    return {
      index: i,
      label: labels[i] ?? String(i + 1),
      defects: d,
      sample_size: ni,
      proportion: r4(pi),
      ucl,
      lcl,
      status: viol ? "violation" : "normal",
    };
  });

  const proportions = points.map(p => p.proportion);
  const trend = detectTrend(proportions);
  const score = Math.max(0, Math.round(100 - (violations.length / defects.length) * 200));

  const techBasis: string[] = [];
  if (violations.length > 0) techBasis.push(`${violations.length} point(s) beyond control limits`);
  if (trend) techBasis.push("6+ consecutive points trending in one direction");
  techBasis.push(`p̄ = ${r4(pBar)} (overall proportion defective)`);
  techBasis.push("Variable-width limits because sample sizes differ between periods");

  let stabStatus: string, stabSummary: string, stabActions: string[];
  if (violations.length === 0 && !trend) {
    stabStatus = "stable";
    stabSummary = `Defect proportion is stable. Overall defect rate is ${(pBar * 100).toFixed(2)}% across ${defects.length} inspection periods.`;
    stabActions = ["Continue monitoring. The defect rate appears consistent.", "Focus on reducing the overall defect rate rather than reacting to individual periods."];
  } else if (violations.length === 1) {
    stabStatus = "needs_attention";
    stabSummary = `1 period is outside the control limits (period ${violations[0]}). Investigate whether a special cause triggered this spike.`;
    stabActions = [`Check period ${violations[0]}: operator, material batch, machine setup.`, "Do not overreact — one signal may be random. Wait for a second signal before changing the process."];
  } else {
    stabStatus = "unstable";
    const vl = violations.slice(0, 5).join(", ");
    stabSummary = `Defect rate is NOT stable. ${violations.length} periods are outside control limits (${vl}). The process requires investigation.`;
    stabActions = [`Investigate periods: ${vl}.`, "Look for patterns: same operator, material lot, shift, or day of week.", "Stabilise the process before setting tighter quality targets."];
  }

  return {
    chart_type: "p",
    center_line: r4(pBar),
    points,
    violations,
    trend_detected: trend,
    stability_score: score,
    stability: { status: stabStatus, score, summary: stabSummary, recommended_actions: stabActions, technical_basis: techBasis },
  };
}

// ─────────────────────────────────────────────
// 6. C-CHART (count of defects per unit)
// Best for: complex single items, multiple minor flaws
// Assumes constant sample size (1 unit per period)
// CL = c̄   UCL = c̄ + 3√c̄   LCL = max(0, c̄ - 3√c̄)
// ─────────────────────────────────────────────
export interface CChartPoint {
  index: number;
  label: string;
  defects: number;
  ucl: number;
  lcl: number;
  status: "normal" | "violation";
}

export interface CChartResult {
  chart_type: "c";
  center_line: number;
  ucl: number;
  lcl: number;
  points: CChartPoint[];
  violations: number[];
  trend_detected: boolean;
  stability_score: number;
  stability: InsightBlock & { score: number };
}

export function computeCChart(defects: number[], labels: string[]): CChartResult {
  const cBar = mean(defects);
  const sqrtC = Math.sqrt(cBar);
  const ucl = r4(cBar + 3 * sqrtC);
  const lcl = r4(Math.max(0, cBar - 3 * sqrtC));

  const violations: number[] = [];
  const points: CChartPoint[] = defects.map((d, i) => {
    const viol = d > ucl || (lcl > 0 && d < lcl);
    if (viol) violations.push(i);
    return { index: i, label: labels[i] ?? String(i + 1), defects: d, ucl, lcl, status: viol ? "violation" : "normal" };
  });

  const trend = detectTrend(defects);
  const score = Math.max(0, Math.round(100 - (violations.length / defects.length) * 200));

  const techBasis = [
    `c̄ = ${r4(cBar)} (average defects per unit)`,
    `UCL = c̄ + 3√c̄ = ${ucl}`,
    `LCL = max(0, c̄ − 3√c̄) = ${lcl}`,
    "Assumes a constant opportunity area per unit (Poisson distribution)",
  ];
  if (violations.length > 0) techBasis.unshift(`${violations.length} unit(s) beyond control limits`);

  let stabStatus: string, stabSummary: string, stabActions: string[];
  if (violations.length === 0 && !trend) {
    stabStatus = "stable";
    stabSummary = `Defect counts are stable. Average of ${r4(cBar)} defects per unit across ${defects.length} items inspected.`;
    stabActions = ["Continue monitoring. Work on reducing the average defect count over time.", "Use Pareto analysis to identify the most common defect types."];
  } else if (violations.length === 1) {
    stabStatus = "needs_attention";
    stabSummary = `Unit ${violations[0]} has an unusual defect count. This may be a special cause — inspect that item carefully.`;
    stabActions = [`Review unit ${violations[0]}: check tooling condition, material, and operator at that time.`, "If a root cause is found, correct it and remove the point before recalculating limits."];
  } else {
    stabStatus = "unstable";
    const vl = violations.slice(0, 5).join(", ");
    stabSummary = `Defect counts are NOT stable. ${violations.length} units exceed control limits (units: ${vl}).`;
    stabActions = [`Inspect units: ${vl}.`, "Check for worn tooling, inconsistent materials, or operator changes.", "Do not adjust process limits until stable performance is established for 20+ consecutive units."];
  }

  return {
    chart_type: "c",
    center_line: r4(cBar),
    ucl,
    lcl,
    points,
    violations,
    trend_detected: trend,
    stability_score: score,
    stability: { status: stabStatus, score, summary: stabSummary, recommended_actions: stabActions, technical_basis: techBasis },
  };
}
