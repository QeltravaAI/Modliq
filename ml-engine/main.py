from fastapi import FastAPI, Header, HTTPException, Depends, Request
from pydantic import BaseModel, Field, field_validator, ConfigDict
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
import time
import signal
import os
import pandas as pd
import numpy as np
import math
import io
import base64
from dotenv import load_dotenv
import sys
import logging

load_dotenv()

from sklearn.model_selection import (
    train_test_split,
    cross_val_score
)

from sklearn.linear_model import (
    LinearRegression,
    LogisticRegression
)

from sklearn.tree import (
    DecisionTreeRegressor,
    DecisionTreeClassifier
)

from sklearn.ensemble import (
    RandomForestRegressor,
    RandomForestClassifier
)

from sklearn.cluster import (
    KMeans,
    DBSCAN
)

from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    accuracy_score
)

from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, os.path.dirname(__file__))

from routers.goal import router as goal_router
from routers.qc import router as qc_router
from dependencies import verify_service_key
from services.dataset_health import analyze_dataset_health

logger = logging.getLogger("modliq.ml")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Modliq ML Engine", version="1.0.0")
app.add_middleware(GZipMiddleware, minimum_size=500)

# ==================================================
# CONFIG
# ==================================================
MAX_CSV_BYTES = int(os.getenv("MAX_CSV_BYTES", "50_000_000"))  # 50 MB
MAX_TRAINING_SECONDS = int(os.getenv("MAX_TRAINING_SECONDS", "120"))  # 2 minutes
MAX_REQUEST_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", "100_000_000"))  # 100 MB

CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "https://modliq.vercel.app")
BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "https://modliq-1.onrender.com")

# CORS scoped to the exact frontend and backend origins — no wildcard, no
# localhost in production. Browser traffic to the ML engine is proxied via the
# backend, so only the backend origin strictly needs to be allowed; the client
# origin is included for completeness.
_allowed_origins = [
    o.strip()
    for o in [CLIENT_ORIGIN, BACKEND_ORIGIN]
    if o and o.strip()
]
if os.getenv("NODE_ENV") != "production" and "http://localhost:3000" not in _allowed_origins:
    _allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Modliq-Service-Key"],
)


# ==================================================
# MIDDLEWARE
# ==================================================
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "method=%s path=%s status=%s duration_ms=%s",
            request.method,
            request.url.path,
            response.status_code,
            round(duration_ms, 2),
        )
        return response
    except Exception as exc:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "method=%s path=%s status=500 duration_ms=%s error=%s",
            request.method,
            request.url.path,
            round(duration_ms, 2),
            exc,
        )
        return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error"})


@app.middleware("http")
async def request_size_limit_middleware(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"success": False, "error": "Request body too large"},
            )
    return await call_next(request)


# ==================================================
# DEMO DATASET — bundled into this service artifact
# ==================================================
DEMO_DATASET_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "demo_dataset.csv")

@app.get("/demo-dataset")
def serve_demo_dataset():
    if not os.path.exists(DEMO_DATASET_PATH):
        return JSONResponse(status_code=404, content={"success": False, "error": "Demo dataset not bundled"})
    return FileResponse(
        path=DEMO_DATASET_PATH,
        media_type="text/csv",
        filename="demo_dataset.csv",
    )


# ==================================================
# ROUTERS
# ==================================================
# TIMEOUT HANDLER
# ==================================================
class TrainingTimeoutError(Exception):
    pass

def _timeout_handler(signum, frame):
    raise TrainingTimeoutError("Training job exceeded allowed time limit")

# ==================================================
# ROUTERS
# ==================================================
app.include_router(goal_router)
app.include_router(qc_router)

# ==================================================
# REQUEST MODEL
# ==================================================
class TrainRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    filename: str = Field(..., min_length=1, max_length=255)
    task_type: str = Field(..., min_length=1, max_length=50)
    target_column: str | None = Field(default=None, max_length=255)
    algorithm: str = Field(..., min_length=1, max_length=100)
    test_size: float = Field(default=20, ge=5, le=50)
    random_state: int = Field(default=42, ge=0, le=9999)
    n_estimators: int = Field(default=100, ge=1, le=5000)
    max_depth: int | None = Field(default=None, ge=1, le=100)
    epochs: int = Field(default=100, ge=1, le=10000)
    learning_rate: float = Field(default=0.01, gt=0, le=1)
    validation_strategy: str = Field(default="Train-Test Split", max_length=100)

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, value: str) -> str:
        allowed = {"Regression", "Classification", "Clustering", "Anomaly Detection"}
        if value not in allowed:
            raise ValueError(f"task_type must be one of {sorted(allowed)}")
        return value

    @field_validator("algorithm")
    @classmethod
    def normalize_algorithm(cls, value: str) -> str:
        return value.strip()


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    filename: str = Field(..., min_length=1, max_length=255)
    file_content: str | None = Field(default=None, max_length=25_000_000)
    template_id: str = Field(default="yield_optimizer", min_length=1, max_length=100)
    target: str | None = Field(default=None, max_length=255)
    features: list[str] | None = Field(default=None, max_length=100)
    goal_direction: str = Field(default="maximize", min_length=1, max_length=20)
    threshold: float | None = Field(default=None)
    constraints: dict | None = Field(default=None, max_length=500)
    model: str | None = Field(default=None, max_length=100)
    monthly_volume: float | None = Field(default=None, ge=0)
    unit_value: float | None = Field(default=None, ge=0)
    test_size: float = Field(default=20, ge=5, le=50)
    random_state: int = Field(default=42, ge=0, le=9999)

    @field_validator("goal_direction")
    @classmethod
    def validate_goal_direction(cls, value: str) -> str:
        allowed = {"maximize", "minimize", "maintain"}
        if value not in allowed:
            raise ValueError(f"goal_direction must be one of {sorted(allowed)}")
        return value


# ==================================================
# TRAIN MODEL
# ==================================================
@app.post("/train", dependencies=[Depends(verify_service_key)])
def train_model(request: TrainRequest):
    print("================================")
    print("TRAINING STARTED")
    print("Dataset:", request.filename)
    print("Task:", request.task_type)
    print("Algorithm:", request.algorithm)
    print("Target:", request.target_column)
    print("================================")

    try:
        file_path = f"../backend/uploads/{request.filename}"
        if not os.path.exists(file_path):
            alt = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "demo_dataset.csv")
            if os.path.exists(alt):
                file_path = alt
        _validate_csv_file(file_path)

        with training_timeout(MAX_TRAINING_SECONDS):
            df = pd.read_csv(file_path)

            if df.shape[0] == 0 or df.shape[1] == 0:
                return {
                    "success": False,
                    "error": "Dataset is empty or has no columns",
                }

            df = df.dropna()

            if request.task_type not in {"Clustering", "Anomaly Detection"}:
                if not request.target_column:
                    return {
                        "success": False,
                        "error": "Target column is required",
                    }

                if request.target_column not in df.columns:
                    return {
                        "success": False,
                        "error": f"Target column '{request.target_column}' not found",
                    }

            if request.target_column:
                y = df[request.target_column]
                X = df.drop(columns=[request.target_column])
            else:
                y = None
                X = df

            X = X.select_dtypes(include=["number"])
            X = X.fillna(0)

            if X.shape[1] == 0:
                return {
                    "success": False,
                    "error": "No numeric columns available",
                }

            feature_names = list(X.columns)

            if request.task_type == "Classification" and y is not None and y.dtype == "object":
                encoder = LabelEncoder()
                y = encoder.fit_transform(y)

            # Remaining training logic continues below...

        # ==================================================
        # REGRESSION
        # ==================================================
        if request.task_type == "Regression":

            X_train, X_test, y_train, y_test = train_test_split(
                X,
                y,
                test_size=request.test_size / 100,
                random_state=request.random_state
            )

            # MODEL SELECTION
            if request.algorithm == "Linear Regression":

                model = LinearRegression()

            elif request.algorithm == "Decision Tree":

                model = DecisionTreeRegressor(
                    max_depth=request.max_depth,
                    random_state=request.random_state
                )

            elif request.algorithm == "Random Forest":

                model = RandomForestRegressor(
                    n_estimators=request.n_estimators,
                    random_state=request.random_state
                )

            else:

                model = LinearRegression()

            # TRAIN
            print("Model fitting started...")
            model.fit(X_train, y_train)
            print("Model fitting completed...")

            predictions = model.predict(X_test)

            # METRICS
            mae = mean_absolute_error(
                y_test,
                predictions
            )

            mse = mean_squared_error(
                y_test,
                predictions
            )

            rmse = math.sqrt(mse)

            r2 = r2_score(
                y_test,
                predictions
            )

            # ==================================================
            # CHART DATA
            # ==================================================
            chart_data = []

            y_test_list = list(y_test)

            for i in range(
                min(20, len(predictions))
            ):

                chart_data.append({

                    "actual":
                        float(y_test_list[i]),

                    "predicted":
                        float(predictions[i])
                })

            # ==================================================
            # FEATURE IMPORTANCE
            # ==================================================
            feature_importance = {}

            if hasattr(model, "coef_"):

                coefficients = model.coef_

                feature_importance = {

                    feature_names[i]:
                        round(float(coefficients[i]), 4)

                    for i in range(
                        len(feature_names)
                    )
                }

            elif hasattr(
                model,
                "feature_importances_"
            ):

                importances = model.feature_importances_

                feature_importance = {

                    feature_names[i]:
                        round(float(importances[i]), 4)

                    for i in range(
                        len(feature_names)
                    )
                }

            # ==================================================
            # CROSS VALIDATION
            # ==================================================
            cv_score = None

            if (
                request.validation_strategy ==
                "K-Fold Cross Validation"
            ):

                scores = cross_val_score(
                    model,
                    X,
                    y,
                    cv=5
                )

                cv_score = round(
                    float(scores.mean()),
                    4
                )

            return {

                "success": True,

                "task_type":
                    request.task_type,

                "model_type":
                    request.algorithm,

                "accuracy":
                    round(float(r2), 4),

                "cross_validation_score":
                    cv_score,

                "features_used":
                    feature_names,

                "feature_importance":
                    feature_importance,

                "training_samples":
                    len(X_train),

                "testing_samples":
                    len(X_test),

                "chart_data":
                    chart_data,

                "metrics": {

                    "mae":
                        round(float(mae), 4),

                    "mse":
                        round(float(mse), 4),

                    "rmse":
                        round(float(rmse), 4),

                    "r2_score":
                        round(float(r2), 4)
                }
            }

        # ==================================================
        # CLASSIFICATION
        # ==================================================
        elif request.task_type == "Classification":

            X_train, X_test, y_train, y_test = train_test_split(
                X,
                y,
                test_size=request.test_size / 100,
                random_state=request.random_state
            )

            if request.algorithm == "Logistic Regression":

                model = LogisticRegression(
                    max_iter=request.epochs
                )

            elif request.algorithm == "Decision Tree":

                model = DecisionTreeClassifier(
                    max_depth=request.max_depth,
                    random_state=request.random_state
                )

            elif request.algorithm == "Random Forest":

                model = RandomForestClassifier(
                    n_estimators=request.n_estimators,
                    random_state=request.random_state
                )

            else:

                model = LogisticRegression()

            # TRAIN
            model.fit(X_train, y_train)

            predictions = model.predict(X_test)

            accuracy = accuracy_score(
                y_test,
                predictions
            )

            return {

                "success": True,

                "task_type":
                    request.task_type,

                "model_type":
                    request.algorithm,

                "accuracy":
                    round(float(accuracy), 4),

                "training_samples":
                    len(X_train),

                "testing_samples":
                    len(X_test),

                "features_used":
                    feature_names,

                "metrics": {

                    "accuracy":
                        round(float(accuracy), 4)
                }
            }

        # ==================================================
        # CLUSTERING
        # ==================================================
        elif request.task_type == "Clustering":

            if request.algorithm == "KMeans":

                model = KMeans(
                    n_clusters=3,
                    random_state=request.random_state
                )

            elif request.algorithm == "DBSCAN":

                model = DBSCAN()

            else:

                model = KMeans(
                    n_clusters=3
                )

            clusters = model.fit_predict(X)

            cluster_data = []

            for i in range(
                min(50, len(clusters))
            ):

                cluster_data.append({

                    "index": i,

                    "cluster":
                        int(clusters[i])
                })

            return {

                "success": True,

                "task_type":
                    request.task_type,

                "model_type":
                    request.algorithm,

                "total_clusters":
                    int(len(set(clusters))),

                "features_used":
                    feature_names,

                "cluster_data":
                    cluster_data
            }

        # ==================================================
        # ANOMALY DETECTION
        # ==================================================
        elif request.task_type == "Anomaly Detection":

            z_scores = (
                (X - X.mean()) / X.std()
            ).abs()

            anomalies = (
                z_scores > 3
            ).sum(axis=1)

            anomaly_count = int(
                (anomalies > 0).sum()
            )

            return {

                "success": True,

                "task_type":
                    request.task_type,

                "model_type":
                    "Z-Score Detection",

                "total_records":
                    len(X),

                "anomalies_detected":
                    anomaly_count,

                "features_used":
                    feature_names
            }

        # ==================================================
        # INVALID TASK TYPE
        # ==================================================
        else:

            return {

                "success": False,

                "error":
                    "Invalid task type"
            }

    except _TimeoutException:
        return {
            "success": False,
            "error": "Training job exceeded the allowed time limit",
        }
    except Exception as error:

        return {

            "success": False,

            "error": str(error)
        }


# ==================================================
# TEMPLATE LIBRARY (config-driven, extensible)
# ==================================================
TEMPLATES = {
    "yield_optimizer": {
        "template_id": "yield_optimizer",
        "display_name": "Manufacturing Yield Optimizer",
        "task_type": "regression",
        "target_candidates": ["Yield", "yield_percent", "Yield_%"],
        "feature_candidates": [
            "Temperature",
            "Pressure",
            "Humidity",
            "Speed",
        ],
        "model": "random_forest_regressor",
        "optimization": True,
        "summary_template": (
            "To maximize {target} above {threshold}%, run {features} "
            "within {recommended_range}. {top_feature} is the strongest "
            "driver, contributing {importance}% of the outcome. "
            "Expected yield at these settings is {expected_yield}%."
        ),
        "roi_formula": "additional_units * unit_value",
        "currency": "₹",
        "default_monthly_volume": 50000,
        "default_unit_value": 120,
    },
    "defect_risk": {
        "template_id": "defect_risk",
        "display_name": "Defect / Quality Risk Predictor",
        "task_type": "classification",
        "target_candidates": ["Defect", "Quality", "Quality_Score"],
        "feature_candidates": [
            "Temperature",
            "Pressure",
            "Humidity",
            "Speed",
            "Machine_ID",
            "Shift",
            "Operator",
        ],
        "model": "random_forest_classifier",
        "optimization": False,
    },
    "predictive_maintenance": {
        "template_id": "predictive_maintenance",
        "display_name": "Predictive Maintenance",
        "task_type": "classification",
        "target_candidates": ["Failure", "Failure_Within_N_Days"],
        "feature_candidates": [
            "Vibration",
            "Temperature",
            "Runtime_Hours",
            "Maintenance_History",
        ],
        "model": "random_forest_classifier",
        "optimization": False,
    },
    "sales_forecasting": {
        "template_id": "sales_forecasting",
        "display_name": "Sales Forecasting",
        "task_type": "regression",
        "target_candidates": ["Revenue", "Units_Sold"],
        "feature_candidates": [
            "Historical_Sales",
            "Promotions",
            "Pipeline_Stage",
        ],
        "model": "random_forest_regressor",
        "optimization": False,
    },
    "churn_predictor": {
        "template_id": "churn_predictor",
        "display_name": "Customer Churn Predictor",
        "task_type": "classification",
        "target_candidates": ["Churn"],
        "feature_candidates": [
            "Usage_Frequency",
            "Support_Tickets",
            "Tenure",
            "Payment_History",
        ],
        "model": "logistic_regression",
        "optimization": False,
    },
    "stockout_predictor": {
        "template_id": "stockout_predictor",
        "display_name": "Inventory Stockout Predictor",
        "task_type": "regression",
        "target_candidates": ["Days_Until_Stockout"],
        "feature_candidates": [
            "Sales_Velocity",
            "Current_Stock",
            "Lead_Time",
        ],
        "model": "random_forest_regressor",
        "optimization": False,
    },
    "demand_forecasting": {
        "template_id": "demand_forecasting",
        "display_name": "Demand Forecasting",
        "task_type": "regression",
        "target_candidates": ["Demand_Quantity"],
        "feature_candidates": [
            "Historical_Demand",
            "Price",
            "Promotions",
        ],
        "model": "random_forest_regressor",
        "optimization": False,
    },
    "energy_optimization": {
        "template_id": "energy_optimization",
        "display_name": "Energy / Cost Optimization",
        "task_type": "regression",
        "target_candidates": ["Energy_Consumption", "Cost"],
        "feature_candidates": [
            "Machine_Load",
            "Ambient_Temp",
            "Shift_Pattern",
            "Production_Volume",
        ],
        "model": "random_forest_regressor",
        "optimization": True,
    },
    "credit_risk": {
        "template_id": "credit_risk",
        "display_name": "Credit Risk / Fraud Detection",
        "task_type": "classification",
        "target_candidates": ["Default", "Fraud"],
        "feature_candidates": [
            "Transaction_Amount",
            "Frequency",
            "Account_Age",
            "Behavior_History",
        ],
        "model": "random_forest_classifier",
        "optimization": False,
    },
    "attrition_predictor": {
        "template_id": "attrition_predictor",
        "display_name": "Employee Attrition Predictor",
        "task_type": "classification",
        "target_candidates": ["Attrition"],
        "feature_candidates": [
            "Tenure",
            "Performance_Rating",
            "Salary_Band",
            "Engagement_Score",
        ],
        "model": "random_forest_classifier",
        "optimization": False,
    },
}


def _resolve_target(template, columns):
    for cand in template.get("target_candidates", []):
        if cand in columns:
            return cand
    return None


# ==================================================
# OPTIMIZE-YIELD ENDPOINT
# ==================================================
@app.post("/optimize-yield", dependencies=[Depends(verify_service_key)])
def optimize_yield(request: OptimizeRequest):
    print("================================")
    print("OPTIMIZE-YIELD STARTED")
    print("Dataset:", request.filename)
    print("Template:", request.template_id)
    print("================================")

    try:
        template = TEMPLATES.get(
            request.template_id, TEMPLATES["yield_optimizer"]
        )

        with training_timeout(MAX_TRAINING_SECONDS):
            if request.file_content:
                raw = base64.b64decode(request.file_content)
                if len(raw) > MAX_CSV_BYTES:
                    return {
                        "success": False,
                        "error": "Embedded dataset exceeds size limit",
                    }
                df = pd.read_csv(io.StringIO(raw.decode("utf-8")))
            else:
                file_path = f"../backend/uploads/{request.filename}"
                if not os.path.exists(file_path):
                    alt = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "demo_dataset.csv")
                    if os.path.exists(alt):
                        file_path = alt
                _validate_csv_file(file_path)
                df = pd.read_csv(file_path)

            if df.shape[0] == 0 or df.shape[1] == 0:
                return {
                    "success": False,
                    "error": "Dataset is empty or has no columns",
                }

            df = df.dropna()

        target = request.target
        if not target or target not in df.columns:
            target = _resolve_target(template, list(df.columns))

        if not target or target not in df.columns:
            lower_target = target.lower() if target else ""
            for col in df.columns:
                if col.lower() == lower_target:
                    target = col
                    break

        if not target or target not in df.columns:
            return {
                "success": False,
                "error": "Could not resolve a target column",
            }

        features = request.features or template.get(
            "feature_candidates", []
        )

        features = [
            f for f in features if f in df.columns and f.lower() != target.lower()
        ]

        if not features:
            normalized_features = []
            lower_requested = [f.lower() for f in request.features] if request.features else []
            for col in df.columns:
                if col.lower() in lower_requested and col.lower() != target.lower():
                    normalized_features.append(col)

            if not normalized_features:
                for col in df.columns:
                    if col.lower() != target.lower():
                        normalized_features.append(col)
                        if len(normalized_features) >= 5:
                            break

            features = normalized_features

        if not features:
            return {
                "success": False,
                "error": "No usable feature columns found",
            }

        y = df[target]

        X = df[features].select_dtypes(
            include=["number"]
        )

        X = X.fillna(X.median())

        feature_names = list(X.columns)

        if len(feature_names) == 0:
            return {
                "success": False,
                "error": "No numeric feature columns available",
            }

        # ==================================================
        # TRAIN REGRESSION MODEL
        # ==================================================
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=request.test_size / 100,
            random_state=request.random_state,
        )

        model_choice = request.model or template.get(
            "model", "random_forest_regressor"
        )

        if model_choice == "linear_regression":
            model = LinearRegression()

        elif model_choice == "decision_tree_regressor":
            model = DecisionTreeRegressor(
                random_state=request.random_state
            )

        else:
            model = RandomForestRegressor(
                n_estimators=200,
                random_state=request.random_state,
            )

        model.fit(X_train, y_train)

        predictions = model.predict(X_test)

        r2 = r2_score(y_test, predictions)
        rmse = math.sqrt(
            mean_squared_error(y_test, predictions)
        )
        mae = mean_absolute_error(y_test, predictions)

        # Feature importance
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        else:
            importances = np.abs(model.coef_)
            total = importances.sum() or 1
            importances = importances / total

        feature_importance = {
            feature_names[i]: round(float(importances[i]), 4)
            for i in range(len(feature_names))
        }

        sorted_importance = dict(
            sorted(
                feature_importance.items(),
                key=lambda kv: kv[1],
                reverse=True,
            )
        )

        # ==================================================
        # GRID SEARCH (coordinate ascent)
        # ==================================================
        medians = X.median().to_dict()

        constraints = request.constraints or {}

        def clamp_feature(name, value):
            col = X[name]
            lo = float(col.min())
            hi = float(col.max())
            if name in constraints:
                c = constraints[name]
                if "min" in c and c["min"] is not None:
                    lo = max(lo, float(c["min"]))
                if "max" in c and c["max"] is not None:
                    hi = min(hi, float(c["max"]))
            return max(lo, min(hi, float(value)))

        def build_row(settings):
            row = {}
            for col in feature_names:
                if col in settings:
                    row[col] = settings[col]
                else:
                    row[col] = medians[col]
            return pd.DataFrame([row])[feature_names]

        def predict_yield(settings):
            return float(
                model.predict(build_row(settings))[0]
            )

        STEPS = 18

        grids = {}
        for name in feature_names:
            col = X[name]
            lo = float(col.min())
            hi = float(col.max())
            if name in constraints:
                c = constraints[name]
                if "min" in c and c["min"] is not None:
                    lo = max(lo, float(c["min"]))
                if "max" in c and c["max"] is not None:
                    hi = min(hi, float(c["max"]))
            if hi <= lo:
                hi = lo + 1e-6
            grids[name] = np.linspace(lo, hi, STEPS)

        # Start from the best observed row
        best_settings = X.iloc[
            int(y.argmax()) if request.goal_direction == "maximize" else int(y.argmin())
        ].to_dict()

        # Enforce hard bounds on the starting point so it respects constraints
        for name in feature_names:
            best_settings[name] = clamp_feature(name, best_settings[name])

        best_yield = predict_yield(best_settings)

        direction = 1 if request.goal_direction == "maximize" else -1

        for _ in range(4):
            improved = False
            for name in feature_names:
                candidates = grids[name]
                local_best_val = best_settings[name]
                local_best_y = best_yield
                for cand in candidates:
                    cand = float(cand)
                    trial = dict(best_settings)
                    trial[name] = cand
                    y_hat = predict_yield(trial)
                    if direction * y_hat > direction * local_best_y:
                        local_best_y = y_hat
                        local_best_val = cand
                if local_best_val != best_settings[name]:
                    best_settings[name] = float(local_best_val)
                    best_yield = local_best_y
                    improved = True
            if not improved:
                break

        recommended_settings = {
            name: round(float(best_settings[name]), 2)
            for name in feature_names
        }

        expected_yield = round(best_yield, 2)

        # Recommended range (half a grid step each side)
        recommended_range = {}
        for name in feature_names:
            step = (
                float(grids[name][1]) - float(grids[name][0])
                if len(grids[name]) > 1
                else 0
            )
            half = step / 2
            lo_r = clamp_feature(
                name, best_settings[name] - half
            )
            hi_r = clamp_feature(
                name, best_settings[name] + half
            )
            recommended_range[name] = [
                round(float(lo_r), 2),
                round(float(hi_r), 2),
            ]

        threshold_met = None
        if request.threshold is not None:
            if request.goal_direction == "maximize":
                threshold_met = expected_yield >= request.threshold
            else:
                threshold_met = expected_yield <= request.threshold

        # ==================================================
        # ROI CALCULATION
        # ==================================================
        current_yield = round(float(y.mean()), 2)

        yield_improvement = round(
            expected_yield - current_yield, 2
        )

        monthly_volume = (
            request.monthly_volume
            or template.get("default_monthly_volume", 50000)
        )

        unit_value = (
            request.unit_value
            or template.get("default_unit_value", 120)
        )

        additional_units = (
            monthly_volume * (max(yield_improvement, 0) / 100)
        )

        monthly_savings = additional_units * unit_value

        savings_low = round(monthly_savings * 0.85, 0)
        savings_high = round(monthly_savings * 1.15, 0)

        currency = template.get("currency", "₹")

        roi_block = {
            "currency": currency,
            "current_yield": current_yield,
            "expected_yield": expected_yield,
            "yield_improvement": yield_improvement,
            "monthly_volume": monthly_volume,
            "unit_value": unit_value,
            "additional_good_units": round(additional_units, 0),
            "monthly_savings_low": savings_low,
            "monthly_savings_high": savings_high,
            "monthly_savings_estimate": round(monthly_savings, 0),
            "payback_period": "Immediate (no capex)",
            "savings_range_text": (
                f"{currency}{savings_low:,.0f} – "
                f"{currency}{savings_high:,.0f} per month"
            ),
        }

        # ==================================================
        # PLAIN-ENGLISH SUMMARY
        # ==================================================
        top_feature = next(iter(sorted_importance))
        top_importance_pct = round(
            float(sorted_importance[top_feature]) * 100, 0
        )

        range_text = ", ".join(
            f"{name}: {lo}–{hi}"
            for name, (lo, hi) in recommended_range.items()
        )

        summary = template.get(
            "summary_template",
            "Recommended settings identified for {target}.",
        ).format(
            target=target,
            threshold=(
                request.threshold
                if request.threshold is not None
                else "target"
            ),
            features=", ".join(feature_names),
            recommended_range=range_text,
            top_feature=top_feature,
            importance=top_importance_pct,
            expected_yield=expected_yield,
        )

        # Business-language drivers
        drivers = []
        for feat, imp in sorted_importance.items():
            pct = round(float(imp) * 100, 0)
            direction_word = (
                "increases" if request.goal_direction == "maximize"
                else "reduces"
            )
            drivers.append(
                {
                    "feature": feat,
                    "importance": round(float(imp), 4),
                    "importance_pct": pct,
                    "explanation": (
                        f"{feat} is a key process driver, "
                        f"contributing about {pct}% to the model's "
                        f"decision on {target}. "
                        f"Stabilizing {feat} {direction_word} "
                        f"{target} most reliably."
                    ),
                }
            )

        confidence_score = round(
            max(0.0, min(99.0, float(r2) * 100)), 1
        )

        # ==================================================
        # CHART DATA (actual vs predicted)
        # ==================================================
        chart_data = []

        y_test_list = list(y_test)

        for i in range(min(20, len(predictions))):
            chart_data.append(
                {
                    "actual": float(y_test_list[i]),
                    "predicted": float(predictions[i]),
                }
            )

        # ==================================================
        # OPTIMIZATION CURVE (sweep top driver)
        # ==================================================
        top_feat = next(iter(sorted_importance))

        optimization_curve = []

        for val in grids[top_feat]:
            setting = dict(recommended_settings)
            setting[top_feat] = float(val)
            optimization_curve.append(
                {
                    "feature": top_feat,
                    "value": round(float(val), 2),
                    "yield": round(predict_yield(setting), 2),
                }
            )

        return {
            "success": True,
            "template_id": template["template_id"],
            "display_name": template["display_name"],
            "task_type": "regression",
            "model_type": model_choice,
            "metrics": {
                "r2_score": round(float(r2), 4),
                "rmse": round(float(rmse), 4),
                "mae": round(float(mae), 4),
            },
            "recommended_settings": recommended_settings,
            "recommended_range": recommended_range,
            "expected_yield": expected_yield,
            "current_yield": current_yield,
            "yield_improvement": yield_improvement,
            "threshold": request.threshold,
            "threshold_met": threshold_met,
            "goal_direction": request.goal_direction,
            "confidence_score": confidence_score,
            "feature_importance": sorted_importance,
            "chart_data": chart_data,
            "optimization_curve": optimization_curve,
            "drivers": drivers,
            "roi": roi_block,
            "plain_english_summary": summary,
        }

    except _TimeoutException:
        return {
            "success": False,
            "error": "Optimization job exceeded the allowed time limit",
        }
    except Exception as error:
        return {
            "success": False,
            "error": str(error),
        }

# ==================================================
# DATASET HEALTH
# ==================================================
MAX_HEALTH_ROWS = 10_000


class DatasetHealthRequest(BaseModel):
    rows: list[dict]
    targetColumn: str | None = None
    features: list[str] | None = None
    mode: str = "generic"


class _TimeoutException(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _TimeoutException("Training job exceeded allowed time limit")


class training_timeout:
    def __init__(self, seconds: int):
        self.seconds = seconds

    def __enter__(self):
        if hasattr(signal, "SIGALRM"):
            signal.signal(signal.SIGALRM, _timeout_handler)
            signal.alarm(self.seconds)
        return self

    def __exit__(self, *args):
        if hasattr(signal, "SIGALRM"):
            signal.alarm(0)


def _validate_csv_file(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CSV file not found: {file_path}")
    size = os.path.getsize(file_path)
    if size > MAX_CSV_BYTES:
        raise ValueError(f"CSV file exceeds size limit: {size} bytes")


@app.post("/dataset-health", dependencies=[Depends(verify_service_key)])
def dataset_health(request: DatasetHealthRequest):
    with training_timeout(MAX_TRAINING_SECONDS):
        total_rows = len(request.rows)
        sampled = total_rows > MAX_HEALTH_ROWS
        rows_to_analyze = request.rows[:MAX_HEALTH_ROWS] if sampled else request.rows
        rows_analyzed = len(rows_to_analyze)

        df = pd.DataFrame(rows_to_analyze)
        result = analyze_dataset_health(df, request.targetColumn, request.features, request.mode)

        result["sampled"] = sampled
        result["rowsAnalyzed"] = rows_analyzed
        result["totalRows"] = total_rows

        return result