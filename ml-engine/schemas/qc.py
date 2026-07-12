from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class QcSummaryRequest(BaseModel):
    rows: List[Dict[str, Any]]
    measurement_column: str
    group_by: Optional[List[str]] = None


class QcControlChartRequest(BaseModel):
    chart_type: str  # "imr" | "xbar_r" | "p"
    # I-MR & P chart
    measurements: Optional[List[float]] = None
    labels: Optional[List[str]] = None
    # X-bar/R chart
    subgroups: Optional[List[List[float]]] = None
    subgroup_labels: Optional[List[str]] = None
    # P chart specific
    defects: Optional[List[int]] = None
    sample_sizes: Optional[List[int]] = None


class QcCapabilityRequest(BaseModel):
    measurements: List[float]
    lsl: float
    usl: float
    target: Optional[float] = None


class QcAcceptanceSamplingRequest(BaseModel):
    lot_size: int
    aql: float
    inspection_level: str = "II"
    defects_found: Optional[int] = None
