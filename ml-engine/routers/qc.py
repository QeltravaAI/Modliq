"""QC router — exposes the single deterministic SPC engine (qc_statistics)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel, Field

from services.qc_statistics import (
    compute_summary,
    compute_imr_chart,
    compute_capability,
    compute_acceptance_sampling,
)

router = APIRouter(prefix="/qc", tags=["qc"])


class SummaryPayload(BaseModel):
    rows: List[Dict[str, Any]]
    measurement_column: str
    group_by: Optional[List[str]] = None


class ControlChartPayload(BaseModel):
    chart_type: str = "imr"
    measurements: List[float] = Field(default_factory=list)
    labels: Optional[List[str]] = None
    subgroups: Optional[List[List[float]]] = None
    subgroup_labels: Optional[List[str]] = None
    defects: Optional[List[int]] = None
    sample_sizes: Optional[List[int]] = None


class CapabilityPayload(BaseModel):
    measurements: List[float]
    lsl: float
    usl: float
    target: Optional[float] = None


class AcceptanceSamplingPayload(BaseModel):
    lot_size: int
    aql: float
    inspection_level: str = "II"
    defects_found: Optional[int] = None


def _extract_numeric(rows: List[Dict[str, Any]], column: str) -> List[float]:
    out: List[float] = []
    for r in rows:
        v = r.get(column)
        if v is None or v == "":
            continue
        try:
            out.append(float(v))
        except (TypeError, ValueError):
            continue
    return out


@router.post("/summary")
def qc_summary(payload: SummaryPayload):
    values = _extract_numeric(payload.rows, payload.measurement_column)
    if len(values) < 2:
        return {"success": False, "error": "Not enough numeric values to summarize"}
    return {"success": True, **compute_summary(values, payload.measurement_column)}


@router.post("/control-chart")
def qc_control_chart(payload: ControlChartPayload):
    if not payload.measurements:
        return {"success": False, "error": "No measurements provided"}
    result = compute_imr_chart(payload.measurements, payload.labels or None)
    return {"success": True, **result}


@router.post("/capability")
def qc_capability(payload: CapabilityPayload):
    if not payload.measurements:
        return {"success": False, "error": "No measurements provided"}
    return {"success": True, **compute_capability(payload.measurements, payload.lsl, payload.usl, payload.target)}


@router.post("/acceptance-sampling")
def qc_acceptance(payload: AcceptanceSamplingPayload):
    return {"success": True, **compute_acceptance_sampling(payload.lot_size, payload.aql, payload.inspection_level, payload.defects_found)}
