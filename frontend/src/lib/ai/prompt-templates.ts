export const SYSTEM_GUARDRAIL = `
You are Modliq AI Copilot, a manufacturing process, quality, operations, supply chain, and lean improvement assistant.
You help engineers and managers interpret manufacturing data and generate safe, practical action plans.

Strict Safety and Guardrail Rules:
1. Do not invent data. Use ONLY the provided context.
2. If information is missing, say "insufficient data".
3. Do not guarantee production outcomes. Always recommend controlled validation (e.g. pilot trial) before production rollout.
4. Never override hard constraints.
5. Never fabricate supplier, batch, machine, material lot, or shift names.
6. Distinguish calculated facts from AI suggestions.
7. Always include this safety disclaimer at the end or in a dedicated fields: "AI-generated recommendation. Validate before production use."
8. Keep manufacturing safety and quality review in the loop.
9. Deterministic calculations (OEE, Cp, Cpk, SPC, health score, etc.) are already computed by Modliq. Explain and interpret them; do not recalculate them unless asked.
10. JSON response formats must strictly match the requested JSON schema.
`;

export function getSystemPrompt(jsonMode = true): string {
  let prompt = SYSTEM_GUARDRAIL;
  if (jsonMode) {
    prompt += `\nYou must output a valid JSON object matching the requested schema. Do not include markdown formatting or wrapper tags like \`\`\`json. Return only the raw JSON.`;
  }
  return prompt;
}

export function datasetHealthPrompt(report: any): string {
  return `
Analyze this dataset health report for a manufacturing user:
${JSON.stringify(report, null, 2)}

Provide an insight payload in JSON format matching this schema:
{
  "title": "Dataset Health Explanation",
  "summary": "High-level summary of readiness",
  "keyFindings": ["Warning/strength 1", "Warning/strength 2"],
  "risks": ["Risk of proceeding 1", "Risk of proceeding 2"],
  "recommendations": ["What to fix before optimization 1", "What to fix before optimization 2"],
  "nextActions": [
    { "action": "Specific clean up action", "priority": "High" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function goalCoachPrompt(rawGoal: string, columns: string[]): string {
  return `
A manufacturing operator has written this optimization goal:
"${rawGoal}"

The uploaded dataset has these columns:
${JSON.stringify(columns)}

Help the operator refine this into a precise manufacturing optimization goal (maximize/minimize a target, keep parameters within specified bounds/constraints, identify potential input features).
Provide an insight payload in JSON format matching this schema:
{
  "title": "Goal Coaching",
  "summary": "Constructive coaching feedback on the raw goal",
  "keyFindings": ["Identified target column candidate(s)", "Identified constraint candidate(s)"],
  "risks": ["Ambiguity or safety risks in raw goal"],
  "recommendations": [
    "Refined Goal Proposal: e.g. Maximize Yield while maintaining Temperature below 90°C and Pressure below 460 kPa."
  ],
  "nextActions": [
    { "action": "Confirm target selection in the dropdown", "priority": "High" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function optimizationPrompt(result: any): string {
  return `
Analyze these process optimization settings and expected outputs:
${JSON.stringify(result, null, 2)}

Interpret what these recommended parameters mean for the process, which variables are the primary drivers, and what safety checks to run.
Provide an response in JSON format matching this schema:
{
  "title": "Optimization Settings Explanation",
  "summary": "General summary of settings shift compared to historic baseline",
  "keyFindings": ["Key setting shift 1", "Key setting shift 2"],
  "risks": ["Constraint warning or process capability risk"],
  "recommendations": ["Adjustment recommendation 1", "Trial validation recommendation"],
  "nextActions": [
    { "action": "Verify recommended settings on target machine", "priority": "High" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function qualityPrompt(qualitySummary: any): string {
  return `
Analyze these quality engineering results (SPC control chart limits, capability metrics, etc.):
${JSON.stringify(qualitySummary, null, 2)}

Explain:
1. Process stability (e.g. outliers, control limit violations).
2. Process capability (Cp/Cpk interpretation).
3. Risk of out-of-spec products reaching customers.
Provide a response in JSON format matching this schema:
{
  "title": "Quality SPC & Capability Interpretation",
  "summary": "Overall quality summary of the process capability",
  "keyFindings": ["Capability Cp/Cpk status", "SPC control limit violation analysis"],
  "risks": ["Quality risk or scrap rate increase warning"],
  "recommendations": ["Calibration checks", "Process centering adjustments"],
  "nextActions": [
    { "action": "Investigate shift/operator correlations", "priority": "Medium" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function operationsPrompt(opsSummary: any): string {
  return `
Analyze this operations summary including OEE (Availability, Performance, Quality), downtime, and bottlenecks:
${JSON.stringify(opsSummary, null, 2)}

Focus on explaining OEE losses, identifying the highest-impact downtime categories, and explaining line or shift performance gaps.
Provide a response in JSON format matching this schema:
{
  "title": "Operations Performance Review",
  "summary": "Overall plant operational efficiency review",
  "keyFindings": ["OEE performance gaps", "Downtime drivers summary"],
  "risks": ["Bottleneck constraints", "Line capacity limitations"],
  "recommendations": ["Preventive maintenance action items", "Operator changeover standardizations"],
  "nextActions": [
    { "action": "Audit downtime logs on Bottleneck Machine", "priority": "High" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function supplyChainPrompt(scSummary: any): string {
  return `
Analyze this supply chain scorecard and material lot traceability summary:
${JSON.stringify(scSummary, null, 2)}

Provide supplier risk scorecard insights, lot traceability analysis, and correlations between material lots and linked yield/scrap.
Provide a response in JSON format matching this schema:
{
  "title": "Supply Chain Risk Review",
  "summary": "Overall raw material supply quality review",
  "keyFindings": ["Supplier performance comparisons", "Defect-prone material lot identifiers"],
  "risks": ["Production risk linked to specific lots/vendors", "Defect rate escalation risk"],
  "recommendations": ["Vendor inspection instructions", "Lot holding or sorting actions"],
  "nextActions": [
    { "action": "Flag underperforming lots in the warehouse", "priority": "Critical" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function leanPrompt(leanSummary: any): string {
  return `
Analyze this Lean manufacturing context (waste metrics, Kaizen items, 5S audit, takt times):
${JSON.stringify(leanSummary, null, 2)}

Explain where waste reduction opportunities lie, prioritize Kaizen boards, suggest 5S audit improvements, and comment on cycle time vs takt time gaps.
Provide a response in JSON format matching this schema:
{
  "title": "Lean Improvement Coach",
  "summary": "Overall continuous improvement roadmap suggestions",
  "keyFindings": ["Top waste categories by value", "Takt vs cycle time gap analysis"],
  "risks": ["Overprocessing waste risk", "Capacity/takt time bottlenecks"],
  "recommendations": ["Kaizen prioritization list", "Standard Work sheets updates"],
  "nextActions": [
    { "action": "Set up a 5S visual check sheet for weaker areas", "priority": "Medium" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function rootCausePrompt(issue: string, context: any): string {
  return `
Perform a structured Root Cause Analysis (RCA) on this manufacturing issue:
Issue: "${issue}"

Current Workspace Context:
${JSON.stringify(context, null, 2)}

Formulate likely hypotheses (e.g. supplier lot changes, line differences, setting variations) and provide containment/preventative lists.
Provide a response in JSON format matching this schema:
{
  "success": true,
  "likelyCauses": [
    { "cause": "Hypothetical cause description", "evidence": "Corroborative data pattern or context evidence", "confidence": "High" }
  ],
  "recommendedChecks": ["Additional inspection or calibration task"],
  "containmentActions": ["Immediate lock or sort action"],
  "correctiveActions": ["Adjustment to solve root cause"],
  "preventiveActions": ["Audit, standard, or automation to prevent recurrence"]
}
`;
}

export function capaPrompt(problemStatement: string, evidence: any): string {
  return `
Generate a formal Corrective Action Preventive Action (CAPA) document for:
Problem Statement: "${problemStatement}"
Evidence:
${JSON.stringify(evidence, null, 2)}

Provide a structured response in JSON format matching this schema:
{
  "success": true,
  "problemStatement": "${problemStatement}",
  "containment": ["Containment action 1", "Containment action 2"],
  "rootCauseHypotheses": ["Root cause hypothesis 1", "Root cause hypothesis 2"],
  "correctiveActions": ["Corrective action 1", "Corrective action 2"],
  "preventiveActions": ["Preventive action 1", "Preventive action 2"],
  "verificationPlan": ["Verification method and schedule"],
  "ownerRoles": ["Operator", "Quality Engineer", "Maintenance Supervisor"]
}
`;
}

export function sopPrompt(datasetName: string, goal: any, optimizationResult: any, qualityContext?: any): string {
  return `
Create a structured standard Operating Procedure (SOP) / Trial Plan for the manufacturing dataset "${datasetName}".
Optimization Goal:
${JSON.stringify(goal, null, 2)}

Optimization Results:
${JSON.stringify(optimizationResult, null, 2)}

Additional Quality Context:
${JSON.stringify(qualityContext, null, 2)}

Generate a detailed SOP document containing these sections. Organize into logical headings and content:
1. Purpose & Scope
2. Setpoint Parameters (recommended settings + safe boundaries)
3. Quality Control Plan (validation, sampling rate, SPC limits)
4. Out-of-Control Action Plan (rollback criteria, corrective checklist)

Provide a response in JSON format matching this schema:
{
  "success": true,
  "title": "Standard Operating Procedure: ${datasetName} Process Settings Optimization",
  "sections": [
    { "heading": "1. Purpose & Scope", "content": "Detailed text..." },
    { "heading": "2. Setpoint Parameters", "content": "Detailed text listing settings..." },
    { "heading": "3. Quality Control Plan", "content": "Detailed text..." },
    { "heading": "4. Out-of-Control Action Plan", "content": "Detailed text..." }
  ]
}
`;
}

export function dashboardSummaryPrompt(context: any): string {
  return `
Provide a high-level executive summary summarizing:
- Dataset health readiness
- Process optimization settings/improvements
- Quality studio capability & stability
- Operations performance (OEE, downtime, bottleneck)
- Supply chain status (lot risks, supplier quality)
- Lean actions (Kaizen progress, waste value)

Workspace Context:
${JSON.stringify(context, null, 2)}

Provide a response in JSON format matching this schema:
{
  "title": "Executive AI Summary",
  "summary": "General paragraph summary of plant intelligence status",
  "keyFindings": ["Dataset readiness & score description", "OEE bottlenecks summary", "Supplier risk flags"],
  "risks": ["Active process drift or material lot risk warning"],
  "recommendations": ["High-priority operational actions", "Standardizations to deploy"],
  "nextActions": [
    { "action": "Approve recommended settings trial plan", "priority": "High" }
  ],
  "disclaimer": "AI-generated recommendation. Validate before production use."
}
`;
}

export function chatPrompt(message: string, workspaceContext: any): string {
  return `
You are Modliq AI Copilot. The user is asking a conversational question:
"${message}"

Use the following manufacturing context to answer accurately:
${JSON.stringify(workspaceContext, null, 2)}

Provide a friendly, engineering-focused answer in JSON format matching this schema:
{
  "success": true,
  "answer": "Detailed answer matching the prompt. Use bullet points or short paragraphs.",
  "suggestedActions": ["Suggested next action 1", "Suggested next action 2"],
  "referencedData": ["Referenced column, OEE metric, or supplier name"]
}
`;
}
