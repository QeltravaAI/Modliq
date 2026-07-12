"""
QC Studio Router — Phase 1 endpoints.
All business explanations are deterministic (no LLM).
"""

from fastapi import APIRouter
from typing import Any, Dict

from schemas.qc import (
    QcSummaryRequest,
    QcControlChartRequest,
    QcCapabilityRequest,
    QcAcceptanceSamplingRequest,
)
from services.qc_statistics import (
    compute_summary,
    compute_imr_chart,
    compute_xbar_r_chart,
    compute_p_chart,
    compute_capability,
    compute_acceptance_sampling,
)
from services.qc_insights import (
    summary_insight,
    control_chart_insight,
    capability_insight,
    acceptance_sampling_insight,
)

router = APIRouter(prefix="/qc", tags=["Quality Studio"])


# ─────────────────────────────────────────────
# POST /qc/summary
# ─────────────────────────────────────────────
@router.post("/summary")
def qc_summary(request: QcSummaryRequest) -> Dict[str, Any]:
    """
    Accepts tabular rows and a measurement column.
    Returns descriptive statistics plus deterministic business insights.
    """
    try:
        col = request.measurement_column
        values = []
        for row in request.rows:
            v = row.get(col)
            if v is not None:
                try:
                    values.append(float(v))
                except (ValueError, TypeError):
                    pass

        if len(values) < 2:
            return {"success": False, "error": f"Not enough numeric values in column '{col}'."}

        stats = compute_summary(values)
        insights = summary_insight(
            metric=col,
            mean=stats["mean"],
            std_dev=stats["std_dev"],
            outlier_count=stats["outlier_count"],
            outlier_indices=stats["outlier_indices"],
        )

        # Optional group-by breakdown
        group_breakdown = {}
        if request.group_by:
            for group_col in request.group_by:
                groups: Dict[str, list] = {}
                for row in request.rows:
                    key = str(row.get(group_col, "Unknown"))
                    val = row.get(col)
                    if val is not None:
                        try:
                            groups.setdefault(key, []).append(float(val))
                        except (ValueError, TypeError):
                            pass
                breakdown = {}
                for k, vals in groups.items():
                    if vals:
                        import statistics as _stat
                        breakdown[k] = {
                            "count": len(vals),
                            "mean": round(sum(vals) / len(vals), 4),
                            "std_dev": round(_stat.stdev(vals), 4) if len(vals) > 1 else 0,
                        }
                group_breakdown[group_col] = breakdown

        return {
            "success": True,
            "metric": col,
            **stats,
            "insights": insights,
            "group_breakdown": group_breakdown,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────
# POST /qc/control-chart
# ─────────────────────────────────────────────
@router.post("/control-chart")
def qc_control_chart(request: QcControlChartRequest) -> Dict[str, Any]:
    """
    Computes I-MR, X-bar/R, or P chart.
    Returns chart data and deterministic stability assessment.
    """
    try:
        chart_type = request.chart_type.lower().replace("-", "_").replace(" ", "_")

        if chart_type in ("imr", "i_mr", "individuals"):
            if len(request.measurements) < 2:
                return {"success": False, "error": "I-MR chart requires at least 2 measurements."}

            labels = request.labels or [str(i) for i in range(len(request.measurements))]
            chart_data = compute_imr_chart(request.measurements, labels)

            stability = control_chart_insight(
                violations=chart_data["violations"],
                trend_detected=chart_data["trend_detected"],
                total_points=len(request.measurements),
            )
            stability["score"] = chart_data["stability_score"]
            chart_data["stability"] = stability

            return {"success": True, **chart_data}

        elif chart_type in ("xbar_r", "xbar", "x_bar_r"):
            if not request.subgroups:
                return {"success": False, "error": "Subgroups required for X-bar/R chart."}
            labels = request.subgroup_labels or [str(i) for i in range(len(request.subgroups))]
            chart_data = compute_xbar_r_chart(request.subgroups, labels)
            stability = control_chart_insight(
                violations=chart_data["violations"],
                trend_detected=chart_data["trend_detected"],
                total_points=len(request.subgroups),
            )
            stability["score"] = chart_data["stability_score"]
            chart_data["stability"] = stability
            return {"success": True, **chart_data}

        elif chart_type == "p":
            if not request.defects or not request.sample_sizes:
                return {"success": False, "error": "defects and sample_sizes required for P chart."}
            labels = request.labels or [str(i) for i in range(len(request.defects))]
            chart_data = compute_p_chart(request.defects, request.sample_sizes, labels)
            stability = control_chart_insight(
                violations=chart_data["violations"],
                trend_detected=chart_data["trend_detected"],
                total_points=len(request.defects),
            )
            stability["score"] = chart_data["stability_score"]
            chart_data["stability"] = stability
            return {"success": True, **chart_data}

        else:
            return {"success": False, "error": f"Unsupported chart_type: '{request.chart_type}'. Use: imr, xbar_r, p"}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────
# POST /qc/capability
# ─────────────────────────────────────────────
@router.post("/capability")
def qc_capability(request: QcCapabilityRequest) -> Dict[str, Any]:
    """
    Computes Cp, Cpk, Pp, Ppk from measurement data and spec limits.
    Returns capability index and deterministic business explanation.
    """
    try:
        if len(request.measurements) < 2:
            return {"success": False, "error": "At least 2 measurements required."}

        cap = compute_capability(
            values=request.measurements,
            lsl=request.lsl,
            usl=request.usl,
            target=request.target,
        )

        insights = capability_insight(
            cp=cap["cp"],
            cpk=cap["cpk"],
            mean=cap["mean"],
            lsl=cap["lsl"],
            usl=cap["usl"],
            target=cap["target"],
        )

        return {"success": True, **cap, "insights": insights}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────
# POST /qc/acceptance-sampling
# ─────────────────────────────────────────────
@router.post("/acceptance-sampling")
def qc_acceptance_sampling(request: QcAcceptanceSamplingRequest) -> Dict[str, Any]:
    """
    Returns recommended sample size, accept/reject thresholds, and
    an accept/reject decision if defects_found is provided.
    """
    try:
        plan = compute_acceptance_sampling(
            lot_size=request.lot_size,
            aql=request.aql,
            inspection_level=request.inspection_level,
            defects_found=request.defects_found,
        )

        insights = acceptance_sampling_insight(
            decision=plan["decision"],
            defects_found=plan["defects_found"],
            acceptance_number=plan["acceptance_number"],
            rejection_number=plan["rejection_number"],
            sample_size=plan["sample_size"],
            aql=plan["aql"],
        )

        return {"success": True, **plan, "insights": insights}

    except Exception as e:
        return {"success": False, "error": str(e)}
