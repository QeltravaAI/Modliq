"""
QC Statistics Engine — pure numerical calculations.
All control-chart constants follow AIAG / Montgomery references.
"""

import math
import statistics
from typing import List, Optional, Tuple, Dict, Any


# ─────────────────────────────────────────────
# QUALITY DATA SUMMARY
# ─────────────────────────────────────────────

def compute_summary(values: List[float]) -> Dict[str, Any]:
    n = len(values)
    if n == 0:
        raise ValueError("No numeric values provided.")

    mean = statistics.mean(values)
    median = statistics.median(values)
    std_dev = statistics.stdev(values) if n > 1 else 0.0
    variance = statistics.variance(values) if n > 1 else 0.0
    data_range = max(values) - min(values)
    data_min = min(values)
    data_max = max(values)

    # Skewness (Fisher)
    if std_dev > 0 and n > 2:
        skewness = (
            (n / ((n - 1) * (n - 2)))
            * sum(((x - mean) / std_dev) ** 3 for x in values)
        )
    else:
        skewness = 0.0

    # IQR-based outlier detection
    sorted_vals = sorted(values)
    q1 = sorted_vals[int(n * 0.25)]
    q3 = sorted_vals[int(n * 0.75)]
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr

    outliers = []
    for idx, v in enumerate(values):
        if v < lower_fence:
            outliers.append({
                "index": idx,
                "value": round(v, 4),
                "reason": f"Below Q1 − 1.5×IQR ({round(lower_fence, 3)})",
            })
        elif v > upper_fence:
            outliers.append({
                "index": idx,
                "value": round(v, 4),
                "reason": f"Above Q3 + 1.5×IQR ({round(upper_fence, 3)})",
            })

    return {
        "count": n,
        "mean": round(mean, 4),
        "median": round(median, 4),
        "std_dev": round(std_dev, 4),
        "variance": round(variance, 4),
        "range": round(data_range, 4),
        "min": round(data_min, 4),
        "max": round(data_max, 4),
        "skewness": round(skewness, 4),
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "outliers": outliers,
        "outlier_count": len(outliers),
        "outlier_indices": [o["index"] for o in outliers],
    }


# ─────────────────────────────────────────────
# I-MR CONTROL CHART
# ─────────────────────────────────────────────
# Constants (AIAG SPC reference):
#   UCL_I = X̄ + 2.66 × MR̄
#   LCL_I = X̄ − 2.66 × MR̄
#   UCL_MR = 3.267 × MR̄
#   LCL_MR = 0

_IMR_D4 = 3.267
_IMR_D3 = 0.0
_IMR_E2 = 2.66


def compute_imr_chart(
    measurements: List[float],
    labels: List[str],
) -> Dict[str, Any]:
    n = len(measurements)
    if n < 2:
        raise ValueError("At least 2 data points required for an I-MR chart.")

    x_bar = sum(measurements) / n
    moving_ranges = [abs(measurements[i] - measurements[i - 1]) for i in range(1, n)]
    mr_bar = sum(moving_ranges) / len(moving_ranges)

    ucl_i = x_bar + _IMR_E2 * mr_bar
    lcl_i = x_bar - _IMR_E2 * mr_bar
    ucl_mr = _IMR_D4 * mr_bar
    lcl_mr = 0.0

    # Build individuals points
    ind_points = []
    violations = []
    for i, (label, val) in enumerate(zip(labels, measurements)):
        if val > ucl_i or val < lcl_i:
            status = "violation"
            violations.append(i)
        else:
            status = "normal"
        ind_points.append({
            "index": i,
            "label": label,
            "value": round(val, 4),
            "status": status,
        })

    # Build MR points (index offset by 1)
    mr_points = []
    for i, (label, mr) in enumerate(zip(labels[1:], moving_ranges)):
        mr_status = "violation" if mr > ucl_mr else "normal"
        mr_points.append({
            "index": i + 1,
            "label": label,
            "value": round(mr, 4),
            "status": mr_status,
        })

    # Trend detection: 6+ consecutive points moving in one direction
    trend_detected = _detect_trend(measurements)

    # Stability score (0–100): penalise each violation proportionally
    violation_pct = len(violations) / n
    score = max(0, round(100 - violation_pct * 200))

    return {
        "chart_type": "imr",
        "individuals_chart": {
            "center_line": round(x_bar, 4),
            "ucl": round(ucl_i, 4),
            "lcl": round(lcl_i, 4),
            "points": ind_points,
        },
        "moving_range_chart": {
            "center_line": round(mr_bar, 4),
            "ucl": round(ucl_mr, 4),
            "lcl": lcl_mr,
            "points": mr_points,
        },
        "violations": violations,
        "trend_detected": trend_detected,
        "stability_score": score,
    }


# ─────────────────────────────────────────────
# X-BAR / R CHART  (subgroup size 2–10)
# ─────────────────────────────────────────────
# A2, D3, D4 constants (Montgomery, Table VI)
_XBAR_CONSTANTS = {
    2:  {"A2": 1.880, "D3": 0.000, "D4": 3.267},
    3:  {"A2": 1.023, "D3": 0.000, "D4": 2.574},
    4:  {"A2": 0.729, "D3": 0.000, "D4": 2.282},
    5:  {"A2": 0.577, "D3": 0.000, "D4": 2.114},
    6:  {"A2": 0.483, "D3": 0.000, "D4": 2.004},
    7:  {"A2": 0.419, "D3": 0.076, "D4": 1.924},
    8:  {"A2": 0.373, "D3": 0.136, "D4": 1.864},
    9:  {"A2": 0.337, "D3": 0.184, "D4": 1.816},
    10: {"A2": 0.308, "D3": 0.223, "D4": 1.777},
}


def compute_xbar_r_chart(
    subgroups: List[List[float]],
    labels: List[str],
) -> Dict[str, Any]:
    if not subgroups:
        raise ValueError("No subgroups provided.")
    n = len(subgroups[0])
    if n < 2 or n > 10:
        raise ValueError("Subgroup size must be between 2 and 10 for X-bar/R chart.")

    consts = _XBAR_CONSTANTS[n]
    A2, D3, D4 = consts["A2"], consts["D3"], consts["D4"]

    subgroup_means = [sum(sg) / len(sg) for sg in subgroups]
    subgroup_ranges = [max(sg) - min(sg) for sg in subgroups]

    x_bar_bar = sum(subgroup_means) / len(subgroup_means)
    r_bar = sum(subgroup_ranges) / len(subgroup_ranges)

    ucl_xbar = x_bar_bar + A2 * r_bar
    lcl_xbar = x_bar_bar - A2 * r_bar
    ucl_r = D4 * r_bar
    lcl_r = D3 * r_bar

    xbar_points = []
    violations = []
    for i, (label, mean, rng) in enumerate(zip(labels, subgroup_means, subgroup_ranges)):
        v = mean > ucl_xbar or mean < lcl_xbar
        xbar_points.append({
            "index": i,
            "label": label,
            "value": round(mean, 4),
            "range": round(rng, 4),
            "status": "violation" if v else "normal",
        })
        if v:
            violations.append(i)

    score = max(0, round(100 - (len(violations) / len(subgroups)) * 200))

    return {
        "chart_type": "xbar_r",
        "xbar_chart": {
            "center_line": round(x_bar_bar, 4),
            "ucl": round(ucl_xbar, 4),
            "lcl": round(lcl_xbar, 4),
            "points": xbar_points,
        },
        "r_chart": {
            "center_line": round(r_bar, 4),
            "ucl": round(ucl_r, 4),
            "lcl": round(lcl_r, 4),
        },
        "violations": violations,
        "trend_detected": _detect_trend(subgroup_means),
        "stability_score": score,
    }


# ─────────────────────────────────────────────
# P CHART (proportion defective)
# ─────────────────────────────────────────────

def compute_p_chart(
    defects: List[int],
    sample_sizes: List[int],
    labels: List[str],
) -> Dict[str, Any]:
    if len(defects) != len(sample_sizes):
        raise ValueError("defects and sample_sizes must have equal length.")

    p_bar = sum(defects) / sum(sample_sizes)
    points = []
    violations = []

    for i, (label, d, ni) in enumerate(zip(labels, defects, sample_sizes)):
        pi = d / ni if ni > 0 else 0
        sigma_i = math.sqrt(p_bar * (1 - p_bar) / ni) if ni > 0 else 0
        ucl_i = p_bar + 3 * sigma_i
        lcl_i = max(0.0, p_bar - 3 * sigma_i)
        v = pi > ucl_i or pi < lcl_i
        if v:
            violations.append(i)
        points.append({
            "index": i,
            "label": label,
            "proportion": round(pi, 6),
            "defects": d,
            "sample_size": ni,
            "ucl": round(ucl_i, 6),
            "lcl": round(lcl_i, 6),
            "status": "violation" if v else "normal",
        })

    score = max(0, round(100 - (len(violations) / len(defects)) * 200))
    proportions = [p["proportion"] for p in points]

    return {
        "chart_type": "p",
        "center_line": round(p_bar, 6),
        "points": points,
        "violations": violations,
        "trend_detected": _detect_trend(proportions),
        "stability_score": score,
    }


# ─────────────────────────────────────────────
# PROCESS CAPABILITY  Cp / Cpk / Pp / Ppk
# ─────────────────────────────────────────────

def compute_capability(
    values: List[float],
    lsl: float,
    usl: float,
    target: Optional[float] = None,
) -> Dict[str, Any]:
    n = len(values)
    if n < 2:
        raise ValueError("At least 2 measurements required for capability analysis.")
    if usl <= lsl:
        raise ValueError("USL must be greater than LSL.")

    mean = sum(values) / n
    std_dev = statistics.stdev(values)  # sample std dev

    tolerance = usl - lsl

    # Cp / Cpk  (using sample std as within-subgroup estimate for MVP single-stream)
    cp = tolerance / (6 * std_dev) if std_dev > 0 else float("inf")
    cpu = (usl - mean) / (3 * std_dev) if std_dev > 0 else float("inf")
    cpl = (mean - lsl) / (3 * std_dev) if std_dev > 0 else float("inf")
    cpk = min(cpu, cpl)

    # Pp / Ppk  (same formula; for MVP labelled as "overall" vs "within")
    pp = cp
    ppk = cpk

    # Sigma level
    sigma_level = round(cpk * 3, 2)

    return {
        "count": n,
        "mean": round(mean, 4),
        "std_dev": round(std_dev, 4),
        "lsl": lsl,
        "usl": usl,
        "target": target,
        "cp": round(cp, 4),
        "cpk": round(cpk, 4),
        "cpu": round(cpu, 4),
        "cpl": round(cpl, 4),
        "pp": round(pp, 4),
        "ppk": round(ppk, 4),
        "sigma_level": sigma_level,
    }


# ─────────────────────────────────────────────
# ACCEPTANCE SAMPLING  (simplified AQL lookup)
# Based on ANSI/ASQ Z1.4 Table II-A, Inspection Level II
# ─────────────────────────────────────────────

# (lot_size_min, lot_size_max) → sample_size for Level II
_LOT_TO_SAMPLE: List[Tuple[int, int, int]] = [
    (2, 8, 2),
    (9, 15, 3),
    (16, 25, 5),
    (26, 50, 8),
    (51, 90, 13),
    (91, 150, 20),
    (151, 280, 32),
    (281, 500, 50),
    (501, 1200, 80),
    (1201, 3200, 125),
    (3201, 10000, 200),
    (10001, 35000, 315),
    (35001, 150000, 500),
    (150001, 500000, 800),
    (500001, 10**9, 1250),
]

# AQL × sample_size → (Ac, Re)   (simplified subset)
_AQL_TABLE: Dict[str, Dict[int, Tuple[int, int]]] = {
    "0.65": {2: (0, 1), 3: (0, 1), 5: (0, 1), 8: (0, 1), 13: (0, 1), 20: (0, 1), 32: (0, 1), 50: (1, 2), 80: (1, 2), 125: (2, 3), 200: (3, 4), 315: (5, 6), 500: (7, 8), 800: (10, 11), 1250: (14, 15)},
    "1.0":  {2: (0, 1), 3: (0, 1), 5: (0, 1), 8: (0, 1), 13: (0, 1), 20: (0, 1), 32: (1, 2), 50: (1, 2), 80: (2, 3), 125: (3, 4), 200: (5, 6), 315: (7, 8), 500: (10, 11), 800: (14, 15), 1250: (21, 22)},
    "1.5":  {2: (0, 1), 3: (0, 1), 5: (0, 1), 8: (0, 1), 13: (0, 1), 20: (1, 2), 32: (1, 2), 50: (2, 3), 80: (3, 4), 125: (5, 6), 200: (7, 8), 315: (10, 11), 500: (14, 15), 800: (21, 22), 1250: (21, 22)},
    "2.5":  {2: (0, 1), 3: (0, 1), 5: (0, 1), 8: (0, 1), 13: (1, 2), 20: (1, 2), 32: (2, 3), 50: (3, 4), 80: (5, 6), 125: (7, 8), 200: (10, 11), 315: (14, 15), 500: (21, 22), 800: (21, 22), 1250: (21, 22)},
    "4.0":  {2: (0, 1), 3: (0, 1), 5: (0, 1), 8: (1, 2), 13: (1, 2), 20: (2, 3), 32: (3, 4), 50: (5, 6), 80: (7, 8), 125: (10, 11), 200: (14, 15), 315: (21, 22), 500: (21, 22), 800: (21, 22), 1250: (21, 22)},
    "6.5":  {2: (0, 1), 3: (0, 1), 5: (1, 2), 8: (1, 2), 13: (2, 3), 20: (3, 4), 32: (5, 6), 50: (7, 8), 80: (10, 11), 125: (14, 15), 200: (21, 22), 315: (21, 22), 500: (21, 22), 800: (21, 22), 1250: (21, 22)},
}

_SUPPORTED_AQLS = ["0.65", "1.0", "1.5", "2.5", "4.0", "6.5"]


def _nearest_aql_key(aql: float) -> str:
    supported = [float(k) for k in _SUPPORTED_AQLS]
    closest = min(supported, key=lambda x: abs(x - aql))
    return str(closest)


def compute_acceptance_sampling(
    lot_size: int,
    aql: float,
    inspection_level: str = "II",
    defects_found: Optional[int] = None,
) -> Dict[str, Any]:
    # Resolve sample size
    sample_size = 1250  # default for very large lots
    for lo, hi, ss in _LOT_TO_SAMPLE:
        if lo <= lot_size <= hi:
            sample_size = ss
            break

    # Resolve AQL key
    aql_key = _nearest_aql_key(aql)
    aql_row = _AQL_TABLE.get(aql_key, {})

    # Resolve Ac / Re from AQL table
    # Find closest sample size key ≤ our sample_size
    valid_sizes = sorted([k for k in aql_row.keys() if k <= sample_size], reverse=True)
    if valid_sizes:
        ac, re = aql_row[valid_sizes[0]]
    else:
        ac, re = 0, 1  # conservative fallback

    # Decision
    if defects_found is not None:
        decision = "accept" if defects_found <= ac else "reject"
    else:
        decision = "plan"

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
    }


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _detect_trend(values: List[float], run_length: int = 6) -> bool:
    """Detect 6+ consecutive points moving monotonically in one direction."""
    if len(values) < run_length:
        return False
    for i in range(len(values) - run_length + 1):
        window = values[i: i + run_length]
        if all(window[j] < window[j + 1] for j in range(len(window) - 1)):
            return True
        if all(window[j] > window[j + 1] for j in range(len(window) - 1)):
            return True
    return False
