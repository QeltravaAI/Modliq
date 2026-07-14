import pandas as pd
import numpy as np
from datetime import datetime, timezone
import re

# ---------------------------------------------------------------------------
# Known target column patterns (priority-ordered, exact-match first)
# ---------------------------------------------------------------------------
_TARGET_PATTERNS = [
    "yield",
    "defect_rate",
    "quality_score",
    "conversion",
    "output",
    "scrap",
    "assay",
    "purity",
    "moisture",
    "strength",
]

# Normalize a column name for matching: lower, strip, collapse whitespace/special chars
def _normalize(col: str) -> str:
    return re.sub(r"[^a-z0-9]", "", col.lower())

def _suggest_target(columns: list) -> str | None:
    """
    Return the first column whose normalized name exactly matches a known target
    pattern. Never suggests columns containing 'predicted_' to avoid leakage.
    """
    normalized_cols = {col: _normalize(col) for col in columns}
    for pattern in _TARGET_PATTERNS:
        for col, norm in normalized_cols.items():
            if norm == pattern and "predicted" not in col.lower():
                return col
    return None

# ---------------------------------------------------------------------------
# Suspicious identifier column patterns
# ---------------------------------------------------------------------------
_ID_PATTERNS = [
    r"\bid\b", r"_id$", r"^id_",
    r"\bbatch\b", r"\blot\b",
    r"\bdate\b", r"\btime\b", r"\btimestamp\b",
    r"\boperator\b", r"\bshift\b",
    r"\bserial\b", r"\bindex\b", r"\brow\b",
    r"\bline\b",
]

def _is_suspicious_id(col: str) -> bool:
    name = col.lower()
    for pat in _ID_PATTERNS:
        if re.search(pat, name):
            return True
    return False


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------
def analyze_dataset_health(
    df: pd.DataFrame,
    target_column: str = None,
    features: list = None,
    mode: str = "generic"
) -> dict:
    score = 100
    warnings = []
    suggestions = []

    generated_at = datetime.now(timezone.utc).isoformat()

    # Coerce numeric-looking string columns
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="ignore")

    total_rows = len(df)
    total_columns = len(df.columns)

    # ------------------------------------------------------------------
    # 1. Missing Values
    # ------------------------------------------------------------------
    missing_count = df.isnull().sum().sum()
    missing_pct = (missing_count / (total_rows * total_columns)) * 100 if total_rows > 0 else 0

    if 1 <= missing_pct <= 5:
        score -= 5
        warnings.append({
            "severity": "low",
            "code": "MISSING_VALUES",
            "message": f"Dataset has {missing_pct:.1f}% missing values.",
            "affectedColumns": [],
        })
    elif 5 < missing_pct <= 20:
        score -= 10
        warnings.append({
            "severity": "medium",
            "code": "MISSING_VALUES",
            "message": f"Dataset has {missing_pct:.1f}% missing values.",
            "affectedColumns": [],
        })
    elif missing_pct > 20:
        score -= 20
        warnings.append({
            "severity": "high",
            "code": "MISSING_VALUES",
            "message": f"Dataset has {missing_pct:.1f}% missing values. This will severely impact optimization.",
            "affectedColumns": [],
        })

    # ------------------------------------------------------------------
    # 2. Duplicate Rows
    # ------------------------------------------------------------------
    duplicate_rows = df.duplicated().sum()
    duplicate_pct = (duplicate_rows / total_rows) * 100 if total_rows > 0 else 0
    if duplicate_rows > 0:
        if duplicate_pct > 10:
            score -= 15
            warnings.append({
                "severity": "medium",
                "code": "DUPLICATE_ROWS",
                "message": f"Dataset contains {duplicate_rows} duplicate rows ({duplicate_pct:.1f}%).",
                "affectedColumns": [],
            })
        else:
            score -= 5
            warnings.append({
                "severity": "low",
                "code": "DUPLICATE_ROWS",
                "message": f"Dataset contains {duplicate_rows} duplicate rows.",
                "affectedColumns": [],
            })

    # ------------------------------------------------------------------
    # 3. Low Sample Size
    # ------------------------------------------------------------------
    if total_rows < 20:
        score -= 25
        warnings.append({
            "severity": "high",
            "code": "LOW_SAMPLE_SIZE",
            "message": f"Dataset has only {total_rows} rows. At least 50 rows are required for reliable optimization.",
            "affectedColumns": [],
        })
    elif total_rows < 50:
        score -= 10
        warnings.append({
            "severity": "medium",
            "code": "LOW_SAMPLE_SIZE",
            "message": f"Dataset has {total_rows} rows. At least 50 rows are recommended for more reliable optimization.",
            "affectedColumns": [],
        })
        suggestions.append("Collect more batches before relying on final production recommendations.")

    # Identify column types
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

    # ------------------------------------------------------------------
    # 4. Constant columns
    # ------------------------------------------------------------------
    constant_columns = []
    constant_deduction = 0
    for col in df.columns:
        if df[col].nunique() <= 1:
            constant_columns.append(col)
            constant_deduction += 5

    if constant_columns:
        actual_deduction = min(constant_deduction, 15)
        score -= actual_deduction
        warnings.append({
            "severity": "medium",
            "code": "CONSTANT_COLUMNS",
            "message": f"Found {len(constant_columns)} constant column(s). They will be ignored in optimization.",
            "affectedColumns": constant_columns,
        })

    # ------------------------------------------------------------------
    # 5. Outliers (IQR method for numeric columns)
    # ------------------------------------------------------------------
    outlier_columns = []
    outlier_deduction = 0
    for col in numeric_cols:
        if col in constant_columns:
            continue
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        if IQR == 0:
            continue
        outliers = df[(df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))]
        outlier_count = len(outliers)
        outlier_pct = (outlier_count / total_rows) * 100 if total_rows > 0 else 0
        if outlier_pct > 5:
            outlier_deduction += 5
            outlier_columns.append({
                "column": col,
                "method": "iqr",
                "count": int(outlier_count),
                "percentage": round(outlier_pct, 2),
            })

    if outlier_columns:
        actual_deduction = min(outlier_deduction, 15)
        score -= actual_deduction
        warnings.append({
            "severity": "medium",
            "code": "HIGH_OUTLIERS",
            "message": f"{len(outlier_columns)} column(s) have a high percentage of outliers (>5%).",
            "affectedColumns": [o["column"] for o in outlier_columns],
        })
        suggestions.append("Review outlier values before optimization.")

    # ------------------------------------------------------------------
    # 6. High feature-to-feature correlation
    # ------------------------------------------------------------------
    high_correlation_pairs = []
    correlation_deduction = 0
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        for col1 in upper.columns:
            for col2 in upper.index:
                val = upper.loc[col2, col1]
                if not pd.isna(val) and val > 0.95:
                    high_correlation_pairs.append([col2, col1])
                    correlation_deduction += 5

    if high_correlation_pairs:
        actual_deduction = min(correlation_deduction, 15)
        score -= actual_deduction
        warnings.append({
            "severity": "medium",
            "code": "HIGH_CORRELATION",
            "message": f"Found {len(high_correlation_pairs)} pair(s) of highly correlated features (r > 0.95). "
                       "These may be redundant (multicollinearity).",
            "affectedColumns": list(set([c for pair in high_correlation_pairs for c in pair])),
        })

    # ------------------------------------------------------------------
    # 7. Suspicious identifier columns
    #    Generic mode: -3 total (max -5) — soft warning only.
    #    Target-aware mode: if suspicious col is in features, -10 per col.
    # ------------------------------------------------------------------
    suspicious_id_columns = [
        col for col in df.columns
        if _is_suspicious_id(col) and col not in constant_columns
    ]

    if suspicious_id_columns:
        if mode == "generic":
            id_deduction = min(3, 5)  # soft cap in generic mode
            score -= id_deduction
        # (target-aware deduction handled below when features are known)

        warnings.append({
            "severity": "low",
            "code": "SUSPICIOUS_ID_COLUMN",
            "message": (
                f"Column(s) {suspicious_id_columns} appear to be identifiers or metadata. "
                "They should not be used as controllable optimization variables."
            ),
            "affectedColumns": suspicious_id_columns,
        })
        suggestions.append(
            "Review identifier columns before model training. Exclude batch IDs, dates, and shift codes from optimization features."
        )

    # ------------------------------------------------------------------
    # 8. Likely target suggestion (generic mode only)
    # ------------------------------------------------------------------
    all_columns = list(df.columns)
    suggested_target = _suggest_target(all_columns) if mode == "generic" else None

    # ------------------------------------------------------------------
    # 9. Target-Aware Mode
    # ------------------------------------------------------------------
    target_analysis = None

    if mode == "target-aware" and target_column and target_column in df.columns:
        target_series = df[target_column]
        t_missing = int(target_series.isnull().sum())
        t_unique = int(target_series.nunique())

        target_analysis = {
            "targetColumn": target_column,
            "missingValues": t_missing,
            "uniqueValues": t_unique,
            "variance": None,
            "outlierCount": 0,
            "isUsableTarget": True,
            "warnings": [],
        }

        if t_missing > 0:
            score -= 10
            target_analysis["warnings"].append(f"Target column has {t_missing} missing values.")
            warnings.append({
                "severity": "high",
                "code": "TARGET_MISSING_VALUES",
                "message": f"Target column '{target_column}' has {t_missing} missing values.",
                "affectedColumns": [target_column],
            })

        if t_unique <= 1:
            score -= 25
            target_analysis["isUsableTarget"] = False
            target_analysis["warnings"].append("Target column is constant.")
            warnings.append({
                "severity": "high",
                "code": "TARGET_CONSTANT",
                "message": f"Target column '{target_column}' is constant.",
                "affectedColumns": [target_column],
            })

        is_numeric_target = np.issubdtype(target_series.dtype, np.number)
        if not is_numeric_target:
            score -= 20
            target_analysis["isUsableTarget"] = False
            target_analysis["warnings"].append("Target column is not numeric.")
            warnings.append({
                "severity": "high",
                "code": "TARGET_NOT_NUMERIC",
                "message": f"Target column '{target_column}' must be numeric for regression optimization.",
                "affectedColumns": [target_column],
            })
        else:
            target_analysis["variance"] = float(target_series.var())
            Q1 = target_series.quantile(0.25)
            Q3 = target_series.quantile(0.75)
            IQR = Q3 - Q1
            if IQR > 0:
                t_outliers = target_series[
                    (target_series < (Q1 - 3 * IQR)) | (target_series > (Q3 + 3 * IQR))
                ]
                if len(t_outliers) > 0:
                    score -= 10
                    target_analysis["outlierCount"] = len(t_outliers)
                    target_analysis["warnings"].append(f"Target has {len(t_outliers)} extreme outliers.")
                    warnings.append({
                        "severity": "medium",
                        "code": "TARGET_OUTLIERS",
                        "message": f"Target column '{target_column}' has {len(t_outliers)} extreme outliers.",
                        "affectedColumns": [target_column],
                    })

        # Leakage checks (feature-target correlation > 0.98)
        if features:
            for f in features:
                if f in numeric_cols and f != target_column:
                    try:
                        corr = abs(target_series.corr(df[f]))
                        if corr > 0.98:
                            warnings.append({
                                "severity": "high",
                                "code": "TARGET_LEAKAGE",
                                "message": (
                                    f"Column '{f}' is almost identical to target '{target_column}' "
                                    f"(correlation={corr:.2f}) and may be target leakage."
                                ),
                                "affectedColumns": [f],
                            })
                            score -= 10
                    except Exception:
                        pass

            # Suspicious ID columns used as features penalty (target-aware mode)
            id_feat_overlap = [f for f in features if f in suspicious_id_columns]
            for col in id_feat_overlap:
                score -= 10
                warnings.append({
                    "severity": "high",
                    "code": "ID_COLUMN_AS_FEATURE",
                    "message": (
                        f"Column '{col}' looks like an identifier but is selected as an optimization feature. "
                        "This may cause unreliable recommendations."
                    ),
                    "affectedColumns": [col],
                })

    # ------------------------------------------------------------------
    # Clamp and band
    # ------------------------------------------------------------------
    score = max(0, min(100, score))

    if score >= 90:
        status = "excellent"
    elif score >= 75:
        status = "good"
    elif score >= 60:
        status = "needs_review"
    elif score >= 40:
        status = "risky"
    else:
        status = "not_recommended"

    return {
        "success": True,
        "score": score,
        "status": status,
        "mode": mode,
        "targetColumn": target_column,
        "generatedAt": generated_at,
        "summary": {
            "rows": int(total_rows),
            "columns": int(total_columns),
            "numericColumns": int(len(numeric_cols)),
            "categoricalColumns": int(len(categorical_cols)),
            "missingValues": int(missing_count),
            "duplicateRows": int(duplicate_rows),
            "constantColumns": constant_columns,
            "suspiciousIdColumns": suspicious_id_columns,
            "highCorrelationPairs": high_correlation_pairs,
            "outlierColumns": outlier_columns,
        },
        "suggestedTarget": suggested_target,
        "warnings": warnings,
        "suggestions": suggestions,
        "targetAnalysis": target_analysis,
    }
