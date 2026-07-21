"""Single, deterministic SPC / QC engine for Modliq.

This is the ONE place in the codebase that computes Cp/Cpk, control limits,
and Western Electric rule violations. The frontend no longer computes any of
these client-side — it calls the backend, which proxies to this module.

Response shapes intentionally match what the Quality Studio UI expects.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _r4(n: float) -> float:
    if n is None or (isinstance(n, float) and (math.isnan(n) or math.isinf(n))):
        return n  # type: ignore
    return round(n, 4)


def _mean(values: Sequence[float]) -> float:
    return sum(values) / len(values)


def _variance(values: Sequence[float], m: Optional[float] = None) -> float:
    mu = m if m is not None else _mean(values)
    return sum((v - mu) ** 2 for v in values) / (len(values) - 1)


def _stddev(values: Sequence[float]) -> float:
    return math.sqrt(_variance(values))


def detect_trend(values: Sequence[float], run: int = 6) -> bool:
    for i in range(0, len(values) - run + 1):
        window = values[i : i + run]
        if all(window[j] > window[j - 1] for j in range(1, len(window))):
            return True
        if all(window[j] < window[j - 1] for j in range(1, len(window))):
            return True
    return False


# ---------------------------------------------------------------------------
# 1. Quality summary
# ---------------------------------------------------------------------------
def compute_summary(values: List[float], metric: str = "Value") -> Dict[str, Any]:
    n = len(values)
    mu = _mean(values)
    sorted_vals = sorted(values)
    mid = n // 2
    med = sorted_vals[mid] if n % 2 else (sorted_vals[mid - 1] + sorted_vals[mid]) / 2
    sd = _stddev(values) if n > 1 else 0.0
    vr = _variance(values) if n > 1 else 0.0

    q1 = sorted_vals[int(n * 0.25)]
    q3 = sorted_vals[int(n * 0.75)]
    iqr = q3 - q1
    lf = q1 - 1.5 * iqr
    uf = q3 + 1.5 * iqr

    skewness = 0.0
    if sd > 0 and n > 2:
        skewness = (n / ((n - 1) * (n - 2))) * sum(((v - mu) / sd) ** 3 for v in values)

    outliers = []
    for i, v in enumerate(values):
        if v < lf:
            outliers.append({"index": i, "value": _r4(v), "reason": f"Below Q1 − 1.5×IQR ({_r4(lf)})"})
        elif v > uf:
            outliers.append({"index": i, "value": _r4(v), "reason": f"Above Q3 + 1.5×IQR ({_r4(uf)})"})

    cv = (sd / mu) * 100 if mu != 0 else 0.0
    level = "low" if cv < 2 else ("moderate" if cv < 5 else "high")
    oc = len(outliers)

    if oc == 0 and level == "low":
        status = "good"
        summary = f"{metric} average is {_r4(mu)} with low variation (CV={_r4(cv)}%). The process looks consistent."
        actions = ["Continue monitoring for sustained stability.", "Consider tightening control limits if Cpk allows."]
    elif oc == 0 and level == "moderate":
        status = "needs_attention"
        summary = f"{metric} average is {_r4(mu)}, but variation is moderate (CV={_r4(cv)}%). No outliers detected."
        actions = ["Investigate sources of variation (machine, shift, material).", "Run a capability study to confirm process meets spec."]
    elif oc > 0 and level != "high":
        status = "needs_attention"
        bl = ", ".join(str(o["index"]) for o in outliers[:5])
        summary = f"{metric} average is {_r4(mu)} with {level} variation. {oc} outlier(s) detected at record(s) {bl}."
        actions = [f"Review outlier records ({bl}) for root cause.", "Check for special causes: machine fault, material change, operator shift.", "Remove confirmed special-cause points before recalculating control limits."]
    else:
        status = "unstable"
        bl = ", ".join(str(o["index"]) for o in outliers[:5])
        summary = f"{metric} average is {_r4(mu)}, but variation is high (CV={_r4(cv)}%) with {oc} outliers. Process requires investigation."
        actions = ["Do not update SOP until variation is reduced.", f"Prioritise investigation of records {bl}.", "Perform a root-cause analysis by machine, shift, and material batch."]

    return {
        "count": n,
        "mean": _r4(mu),
        "median": _r4(med),
        "std_dev": _r4(sd),
        "variance": _r4(vr),
        "range": _r4(max(values) - min(values)),
        "min": _r4(min(values)),
        "max": _r4(max(values)),
        "skewness": _r4(skewness),
        "q1": _r4(q1),
        "q3": _r4(q3),
        "outliers": outliers,
        "outlier_count": oc,
        "outlier_indices": [o["index"] for o in outliers],
        "insights": {"status": status, "summary": summary, "recommended_actions": actions},
    }


# ---------------------------------------------------------------------------
# 2. I-MR control chart
# ---------------------------------------------------------------------------
IMR_E2 = 2.66
IMR_D4 = 3.267


def compute_imr_chart(measurements: List[float], labels: Optional[List[str]] = None) -> Dict[str, Any]:
    n = len(measurements)
    labels = labels or [str(i + 1) for i in range(n)]
    xbar = _mean(measurements)
    mrs = [abs(measurements[i] - measurements[i - 1]) for i in range(1, n)]
    mrbar = _mean(mrs) if mrs else 0.0

    ucl_i = xbar + IMR_E2 * mrbar
    lcl_i = xbar - IMR_E2 * mrbar
    ucl_mr = IMR_D4 * mrbar

    violations: List[int] = []
    ind_points = []
    for i, v in enumerate(measurements):
        viol = v > ucl_i or v < lcl_i
        if viol:
            violations.append(i)
        ind_points.append({"index": i, "label": labels[i], "value": _r4(v), "status": "violation" if viol else "normal"})

    mr_points = []
    for i, mr in enumerate(mrs):
        viol = mr > ucl_mr
        mr_points.append({"index": i + 1, "label": labels[i + 1] if i + 1 < len(labels) else str(i + 2), "value": _r4(mr), "status": "violation" if viol else "normal"})

    trend = detect_trend(measurements)
    score = max(0, round(100 - (len(violations) / n) * 200)) if n else 0

    tech_basis: List[str] = []
    if violations:
        tech_basis.append(f"{len(violations)} point(s) beyond UCL/LCL")
    if trend:
        tech_basis.append("6+ consecutive points in one direction (trend rule)")

    if not violations and not trend:
        stab_status = "stable"
        stab_summary = f"The process appears stable. No points are outside the control limits across {n} observations."
        stab_actions = ["Continue monitoring regularly.", "Consider a capability study to confirm process meets specifications."]
    elif len(violations) == 1 and not trend:
        stab_status = "needs_attention"
        stab_summary = f"1 point is outside the control limits (point {violations[0]}). This may be a special cause. Investigate before updating control limits."
        stab_actions = [f"Investigate point {violations[0]}: check for machine fault, material change, or operator error.", "If a special cause is confirmed, remove it and recalculate limits.", "Do not adjust process settings based on one signal alone."]
    else:
        stab_status = "unstable"
        vl = ", ".join(str(v) for v in violations[:5])
        stab_summary = f"The process is NOT stable. {len(violations)} point(s) are outside the control limits (at {vl}). Immediate investigation required."
        stab_actions = [f"Investigate out-of-control points: {vl}.", "Identify whether a common pattern exists (shift change, machine, material).", "Do not update SOP or control limits until the process is stable for ≥20 consecutive points."]

    return {
        "chart_type": "imr",
        "individuals_chart": {"center_line": _r4(xbar), "ucl": _r4(ucl_i), "lcl": _r4(lcl_i), "points": ind_points},
        "moving_range_chart": {"center_line": _r4(mrbar), "ucl": _r4(ucl_mr), "lcl": 0, "points": mr_points},
        "violations": violations,
        "trend_detected": trend,
        "stability_score": score,
        "stability": {"status": stab_status, "score": score, "summary": stab_summary, "recommended_actions": stab_actions, "technical_basis": tech_basis},
    }


# ---------------------------------------------------------------------------
# 3. Process capability
# ---------------------------------------------------------------------------
def compute_capability(values: List[float], lsl: float, usl: float, target: Optional[float] = None) -> Dict[str, Any]:
    n = len(values)
    mu = _mean(values)
    sd = _stddev(values)
    tolerance = usl - lsl

    safe = sd > 0
    cp = _r4(tolerance / (6 * sd)) if safe else float("inf")
    cpu = _r4((usl - mu) / (3 * sd)) if safe else float("inf")
    cpl = _r4((mu - lsl) / (3 * sd)) if safe else float("inf")
    cpk = _r4(min(cpu, cpl))
    sigma_level = _r4(cpk * 3)

    if cpk < 1.0:
        status = "not_capable"
        label = "Not Capable"
        summary = f"Cpk = {cpk}. The process is NOT capable — it cannot consistently meet specifications (LSL={lsl}, USL={usl}). Defects are likely."
        actions = ["Reduce process variation before increasing production volume.", "Identify and eliminate major sources of variation.", "Target Cpk ≥ 1.33 before approving full production."]
    elif cpk < 1.33:
        status = "marginally_capable"
        label = "Marginally Capable"
        summary = f"Cpk = {cpk}. The process is marginally capable. It can meet specifications but variation should be reduced for reliability."
        actions = ["Reduce process variation before scaling production.", "Investigate batches close to LSL or USL.", "Target Cpk ≥ 1.33 for a reliably capable process."]
    elif cpk < 1.67:
        status = "capable"
        label = "Capable"
        summary = f"Cpk = {cpk}. The process is capable and can meet specifications reliably."
        actions = ["Maintain current operating conditions.", "Monitor with control charts to sustain capability."]
    else:
        status = "highly_capable"
        label = "Highly Capable"
        summary = f"Cpk = {cpk}. The process is highly capable. Excellent process control."
        actions = ["Continue current practices.", "Consider tightening internal specifications for premium quality targets."]

    if safe and abs(cp - cpk) > 0.1:
        actions.insert(0, f"Process mean ({_r4(mu)}) is off-centre. Adjust process aim toward target.")

    return {
        "count": n,
        "mean": _r4(mu),
        "std_dev": _r4(sd),
        "lsl": lsl,
        "usl": usl,
        "target": target,
        "cp": cp,
        "cpk": cpk,
        "cpu": cpu,
        "cpl": cpl,
        "pp": cp,
        "ppk": cpk,
        "sigma_level": sigma_level,
        "insights": {
            "status": status,
            "label": label,
            "summary": summary,
            "recommended_actions": actions,
            "technical_basis": [
                f"Cp = {cp}  (process spread vs tolerance)",
                f"Cpk = {cpk}  (worst-case distance to nearest spec limit)",
                "Cpk < 1.00 → not capable | 1.00–1.33 → marginal | 1.33–1.67 → capable | ≥1.67 → highly capable",
            ],
        },
    }


# ---------------------------------------------------------------------------
# 4. Acceptance sampling (simplified AQL lookup)
# ---------------------------------------------------------------------------
_LOT_TO_SAMPLE: List[Tuple[int, int, int]] = [
    (2, 8, 2), (9, 15, 3), (16, 25, 5), (26, 50, 8),
    (51, 90, 13), (91, 150, 20), (151, 280, 32), (281, 500, 50),
    (501, 1200, 80), (1201, 3200, 125), (3201, 10000, 200),
    (10001, 35000, 315), (35001, 150000, 500), (150001, 500000, 800),
    (500001, 10 ** 9, 1250),
]

_AQL_TABLE: Dict[str, Dict[int, Tuple[int, int]]] = {
    "0.65": {2: [0, 1], 3: [0, 1], 5: [0, 1], 8: [0, 1], 13: [0, 1], 20: [0, 1], 32: [0, 1], 50: [1, 2], 80: [1, 2], 125: [2, 3], 200: [3, 4], 315: [5, 6], 500: [7, 8], 800: [10, 11], 1250: [14, 15]},
    "1.0": {2: [0, 1], 3: [0, 1], 5: [0, 1], 8: [0, 1], 13: [0, 1], 20: [0, 1], 32: [1, 2], 50: [1, 2], 80: [2, 3], 125: [3, 4], 200: [5, 6], 315: [7, 8], 500: [10, 11], 800: [14, 15], 1250: [21, 22]},
    "1.5": {2: [0, 1], 3: [0, 1], 5: [0, 1], 8: [0, 1], 13: [0, 1], 20: [1, 2], 32: [1, 2], 50: [2, 3], 80: [3, 4], 125: [5, 6], 200: [7, 8], 315: [10, 11], 500: [14, 15], 800: [21, 22], 1250: [21, 22]},
    "2.5": {2: [0, 1], 3: [0, 1], 5: [0, 1], 8: [0, 1], 13: [1, 2], 20: [1, 2], 32: [2, 3], 50: [3, 4], 80: [5, 6], 125: [7, 8], 200: [10, 11], 315: [14, 15], 500: [21, 22], 800: [21, 22], 1250: [21, 22]},
    "4.0": {2: [0, 1], 3: [0, 1], 5: [0, 1], 8: [1, 2], 13: [1, 2], 20: [2, 3], 32: [3, 4], 50: [5, 6], 80: [7, 8], 125: [10, 11], 200: [14, 15], 315: [21, 22], 500: [21, 22], 800: [21, 22], 1250: [21, 22]},
    "6.5": {2: [0, 1], 3: [0, 1], 5: [1, 2], 8: [1, 2], 13: [2, 3], 20: [3, 4], 32: [5, 6], 50: [7, 8], 80: [10, 11], 125: [14, 15], 200: [21, 22], 315: [21, 22], 500: [21, 22], 800: [21, 22], 1250: [21, 22]},
}


def _nearest_aql(aql: float) -> str:
    keys = [0.65, 1.0, 1.5, 2.5, 4.0, 6.5]
    return str(min(keys, key=lambda k: abs(k - aql)))


def compute_acceptance_sampling(lot_size: int, aql: float, inspection_level: str = "II", defects_found: Optional[int] = None) -> Dict[str, Any]:
    sample_size = 1250
    for lo, hi, ss in _LOT_TO_SAMPLE:
        if lo <= lot_size <= hi:
            sample_size = ss
            break

    aql_key = _nearest_aql(aql)
    row = _AQL_TABLE.get(aql_key, {})
    valid_sizes = [k for k in row.keys() if k <= sample_size]
    valid_sizes.sort(reverse=True)

    ac, re = (row[valid_sizes[0]] if valid_sizes else [0, 1])
    if not valid_sizes:
        ac, re = 0, 1

    if defects_found is None:
        decision = "plan"
    elif defects_found <= ac:
        decision = "accept"
    else:
        decision = "reject"

    if decision == "accept":
        status = "accept"
        summary = f"Inspect {sample_size} units. With {defects_found} defect(s) found, this lot PASSES inspection (acceptance number = {ac})."
        actions = ["Document the inspection result and release the lot.", "If defects are near the acceptance limit, increase monitoring for the next lot."]
    elif decision == "reject":
        status = "reject"
        summary = f"With {defects_found} defect(s) found in {sample_size} units inspected, this lot FAILS inspection (rejection number = {re}). The lot should be quarantined or sent for 100% inspection / rework."
        actions = ["Quarantine the lot and initiate a non-conformance report.", "Investigate root cause before releasing the next production batch.", "Consider 100% inspection or rework depending on defect severity."]
    else:
        status = "plan"
        summary = f"Inspect {sample_size} units from this lot. Accept if defects ≤ {ac}. Reject if defects ≥ {re}."
        actions = ["Conduct inspection and enter the defect count to get a final decision.", "Ensure inspectors are calibrated on the defect classification criteria."]

    return {
        "lot_size": lot_size,
        "aql": aql,
        "aql_used": float(aql_key),
        "inspection_level": inspection_level,
        "sample_size": sample_size,
        "acceptance_number": ac,
        "rejection_number": re,
        "defects_found": defects_found,
        "decision": decision,
        "insights": {"status": status, "summary": summary, "recommended_actions": actions, "note": "MVP uses a simplified AQL lookup table. Validate against ANSI/ASQ Z1.4 or ISO 2859-1 before regulated production use."},
    }
