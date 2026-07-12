"""
QC Insight Engine — deterministic, rule-based business explanations.
No LLMs. Fast, auditable, repeatable.
"""

from typing import List, Optional, Dict, Any


# ─────────────────────────────────────────────
# SUMMARY INSIGHTS
# ─────────────────────────────────────────────

def _variation_level(cv: float) -> str:
    if cv < 2:
        return "low"
    elif cv < 5:
        return "moderate"
    else:
        return "high"


def summary_insight(
    metric: str,
    mean: float,
    std_dev: float,
    outlier_count: int,
    outlier_indices: List[int],
) -> Dict[str, Any]:
    cv = (std_dev / mean * 100) if mean != 0 else 0
    level = _variation_level(cv)

    if outlier_count == 0 and level == "low":
        status = "good"
        summary = (
            f"{metric} average is {mean:.2f} with low variation "
            f"(CV={cv:.1f}%). The process looks consistent."
        )
        actions = [
            "Continue monitoring for sustained stability.",
            "Consider tightening control limits if Cpk allows.",
        ]
    elif outlier_count == 0 and level == "moderate":
        status = "needs_attention"
        summary = (
            f"{metric} average is {mean:.2f}, but variation is moderate "
            f"(CV={cv:.1f}%). No outliers detected."
        )
        actions = [
            "Investigate sources of variation (machine, shift, material).",
            "Run a capability study to confirm process meets spec.",
        ]
    elif outlier_count > 0 and level in ("low", "moderate"):
        status = "needs_attention"
        batch_list = ", ".join(str(i) for i in outlier_indices[:5])
        summary = (
            f"{metric} average is {mean:.2f} with {level} variation. "
            f"{outlier_count} outlier{'s' if outlier_count > 1 else ''} detected "
            f"at {'records' if outlier_count > 1 else 'record'} {batch_list}."
        )
        actions = [
            f"Review outlier records ({batch_list}) for root cause.",
            "Check for special causes: machine fault, material change, operator shift.",
            "Remove confirmed special-cause points before recalculating control limits.",
        ]
    else:
        status = "unstable"
        batch_list = ", ".join(str(i) for i in outlier_indices[:5])
        summary = (
            f"{metric} average is {mean:.2f}, but variation is high "
            f"(CV={cv:.1f}%) with {outlier_count} outliers. Process requires investigation."
        )
        actions = [
            "Do not update SOP until variation is reduced.",
            f"Prioritise investigation of records {batch_list}.",
            "Perform a root-cause analysis by machine, shift, and material batch.",
        ]

    return {
        "status": status,
        "cv": round(cv, 2),
        "variation_level": level,
        "summary": summary,
        "recommended_actions": actions,
    }


# ─────────────────────────────────────────────
# CONTROL CHART INSIGHTS
# ─────────────────────────────────────────────

def control_chart_insight(
    violations: List[int],
    trend_detected: bool,
    total_points: int,
) -> Dict[str, Any]:
    n = len(violations)
    technical_basis = []

    if n > 0:
        technical_basis.append(f"{n} point{'s' if n > 1 else ''} beyond UCL/LCL")
    if trend_detected:
        technical_basis.append("6+ consecutive points in one direction (trend rule)")

    if n == 0 and not trend_detected:
        status = "stable"
        severity = "low"
        summary = (
            f"The process appears stable. No points are outside the control limits "
            f"across {total_points} observations."
        )
        actions = [
            "Continue monitoring regularly.",
            "Consider a capability study to confirm process meets specifications.",
        ]
    elif n == 1 and not trend_detected:
        status = "needs_attention"
        severity = "medium"
        viol_str = ", ".join(str(v) for v in violations)
        summary = (
            f"1 point is outside the control limits (point {viol_str}). "
            "This may be a special cause. Investigate before updating control limits."
        )
        actions = [
            f"Investigate point {viol_str}: check for machine fault, material change, or operator error.",
            "If a special cause is confirmed, remove it and recalculate limits.",
            "Do not adjust process settings based on one signal alone.",
        ]
    else:
        status = "unstable"
        severity = "high"
        viol_str = ", ".join(str(v) for v in violations[:5])
        summary = (
            f"The process is NOT stable. {n} point{'s are' if n > 1 else ' is'} "
            f"outside the control limits (at {viol_str}). "
            "Immediate investigation required."
        )
        actions = [
            f"Investigate out-of-control points: {viol_str}.",
            "Identify whether a common pattern exists (shift change, machine, material).",
            "Do not update SOP or control limits until the process is stable for ≥20 consecutive points.",
            "Suspend lot acceptance decisions until stability is confirmed.",
        ]

    return {
        "status": status,
        "severity": severity,
        "summary": summary,
        "recommended_actions": actions,
        "technical_basis": technical_basis,
    }


# ─────────────────────────────────────────────
# CAPABILITY INSIGHTS
# ─────────────────────────────────────────────

def _cpk_status(cpk: float) -> tuple:
    if cpk < 1.00:
        return "not_capable", "high", "Not Capable"
    elif cpk < 1.33:
        return "marginally_capable", "medium", "Marginally Capable"
    elif cpk < 1.67:
        return "capable", "low", "Capable"
    else:
        return "highly_capable", "low", "Highly Capable"


def capability_insight(
    cp: float,
    cpk: float,
    mean: float,
    lsl: float,
    usl: float,
    target: Optional[float],
) -> Dict[str, Any]:
    status, severity, label = _cpk_status(cpk)
    centering_ok = abs(cp - cpk) < 0.1

    if status == "not_capable":
        summary = (
            f"Cpk = {cpk:.2f}. The process is NOT capable — it cannot consistently "
            f"meet specifications (LSL={lsl}, USL={usl}). Defects are likely."
        )
        actions = [
            "Reduce process variation before increasing production volume.",
            "Identify and eliminate major sources of variation.",
            "Target Cpk ≥ 1.33 before approving full production.",
        ]
    elif status == "marginally_capable":
        summary = (
            f"Cpk = {cpk:.2f}. The process is marginally capable. "
            f"It can meet specifications but variation should be reduced for reliability."
        )
        actions = [
            "Reduce process variation before scaling production.",
            "Investigate batches close to LSL or USL.",
            "Target Cpk ≥ 1.33 for a reliably capable process.",
        ]
    elif status == "capable":
        summary = (
            f"Cpk = {cpk:.2f}. The process is capable and can meet specifications reliably."
        )
        actions = [
            "Maintain current operating conditions.",
            "Monitor with control charts to sustain capability.",
        ]
    else:
        summary = (
            f"Cpk = {cpk:.2f}. The process is highly capable. "
            "Excellent process control — variation is well within specification limits."
        )
        actions = [
            "Excellent process control. Continue current practices.",
            "Consider tightening internal specifications for premium quality targets.",
        ]

    if not centering_ok:
        actions.insert(0, f"Process mean ({mean:.2f}) is off-centre. Adjust process aim toward target.")

    if target is not None:
        offset = abs(mean - target)
        if offset > (usl - lsl) * 0.1:
            actions.insert(1, f"Mean ({mean:.2f}) is {offset:.2f} units from target ({target}). Re-centre the process.")

    return {
        "status": status,
        "label": label,
        "severity": severity,
        "summary": summary,
        "recommended_actions": actions,
        "technical_basis": [
            f"Cp = {cp:.2f}  (process spread vs tolerance)",
            f"Cpk = {cpk:.2f}  (worst-case distance to nearest spec limit)",
            f"Cpk < 1.00 → not capable | 1.00–1.33 → marginal | 1.33–1.67 → capable | ≥1.67 → highly capable",
        ],
    }


# ─────────────────────────────────────────────
# ACCEPTANCE SAMPLING INSIGHTS
# ─────────────────────────────────────────────

def acceptance_sampling_insight(
    decision: str,
    defects_found: Optional[int],
    acceptance_number: int,
    rejection_number: int,
    sample_size: int,
    aql: float,
) -> Dict[str, Any]:
    if decision == "accept":
        status = "accept"
        summary = (
            f"Inspect {sample_size} units. "
            f"With {defects_found} defect(s) found, this lot PASSES inspection "
            f"(acceptance number = {acceptance_number})."
        )
        actions = [
            "Document the inspection result and release the lot.",
            "If defects are near the acceptance limit, increase monitoring for the next lot.",
        ]
    elif decision == "reject":
        status = "reject"
        summary = (
            f"With {defects_found} defect(s) found in {sample_size} units inspected, "
            f"this lot FAILS inspection (rejection number = {rejection_number}). "
            "The lot should be quarantined or sent for 100% inspection / rework."
        )
        actions = [
            "Quarantine the lot and initiate a non-conformance report.",
            "Investigate root cause before releasing the next production batch.",
            "Consider 100% inspection or rework depending on defect severity.",
        ]
    else:
        # No defect count provided — just return the plan
        status = "plan"
        summary = (
            f"Inspect {sample_size} units from this lot. "
            f"Accept if defects ≤ {acceptance_number}. Reject if defects ≥ {rejection_number}."
        )
        actions = [
            "Conduct inspection and enter the defect count to get a final decision.",
            "Ensure inspectors are calibrated on the defect classification criteria.",
        ]

    return {
        "status": status,
        "summary": summary,
        "recommended_actions": actions,
        "note": (
            "MVP uses a simplified AQL lookup table. "
            "Validate against ANSI/ASQ Z1.4 or ISO 2859-1 before regulated production use."
        ),
    }
