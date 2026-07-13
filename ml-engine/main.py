from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import numpy as np
import math
import io
import base64
import os
from dotenv import load_dotenv

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

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from routers.goal import router as goal_router

app = FastAPI(title="Modliq ML Engine", version="1.0.0")

# ==================================================
# CORS
# ==================================================
CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "https://modliq.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_ORIGIN.strip(), "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# QUALITY STUDIO ROUTER
# ==================================================
app.include_router(goal_router)

# ==================================================
# REQUEST MODEL
# ==================================================
class TrainRequest(BaseModel):

    filename: str

    task_type: str

    target_column: str | None = None

    algorithm: str

    test_size: float = 20

    random_state: int = 42

    n_estimators: int = 100

    max_depth: int | None = None

    epochs: int = 100

    learning_rate: float = 0.01

    validation_strategy: str = "Train-Test Split"


# ==================================================
# HOME
# ==================================================
@app.get("/")
def home():

    return {
        "message": "MODLIQ ML Engine Running"
    }

@app.get("/warmup")
def warmup():
    return {
        "status": "ok",
        "service": "modliq-ml-engine"
    }


# ==================================================
# TRAIN MODEL
# ==================================================
@app.post("/train")
def train_model(request: TrainRequest):
    print("================================")
    print("TRAINING STARTED")
    print("Dataset:", request.filename)
    print("Task:", request.task_type)
    print("Algorithm:", request.algorithm)
    print("Target:", request.target_column)
    print("================================")

    try:

        # ==================================================
        # LOAD DATASET
        # ==================================================
        file_path = f"../backend/uploads/{request.filename}"

        df = pd.read_csv(file_path)

        # Remove null rows
        df = df.dropna()

        # ==================================================
        # VALIDATE TARGET COLUMN
        # ==================================================
        if (
            request.task_type != "Clustering"
            and request.task_type != "Anomaly Detection"
        ):

            if not request.target_column:

                return {
                    "success": False,
                    "error": "Target column is required"
                }

            if request.target_column not in df.columns:

                return {
                    "success": False,
                    "error": f"Target column '{request.target_column}' not found"
                }

        # ==================================================
        # FEATURES + TARGET
        # ==================================================
        if request.target_column:

            y = df[request.target_column]

            X = df.drop(
                columns=[request.target_column]
            )

        else:

            y = None
            X = df

        # ==================================================
        # KEEP NUMERIC FEATURES ONLY
        # ==================================================
        X = X.select_dtypes(
            include=["number"]
        )

        # Fill remaining NaN
        X = X.fillna(0)

        # Check features
        if X.shape[1] == 0:

            return {
                "success": False,
                "error": "No numeric columns available"
            }

        feature_names = list(X.columns)

        # ==================================================
        # CLASSIFICATION LABEL ENCODING
        # ==================================================
        if (
            request.task_type == "Classification"
            and y is not None
        ):

            if y.dtype == "object":

                encoder = LabelEncoder()

                y = encoder.fit_transform(y)

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
# OPTIMIZE-YIELD REQUEST
# ==================================================
class OptimizeRequest(BaseModel):

    filename: str

    file_content: str | None = None

    template_id: str = "yield_optimizer"

    target: str | None = None

    features: list[str] | None = None

    goal_direction: str = "maximize"

    threshold: float | None = None

    constraints: dict | None = None

    model: str | None = None

    monthly_volume: float | None = None

    unit_value: float | None = None

    test_size: float = 20

    random_state: int = 42


# ==================================================
# OPTIMIZE-YIELD ENDPOINT
# ==================================================
@app.post("/optimize-yield")
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

        # Load dataset: prefer base64 content (cross-service friendly),
        # fall back to local file path for local/dev runs.
        if request.file_content:
            raw = base64.b64decode(request.file_content)
            df = pd.read_csv(io.StringIO(raw.decode("utf-8")))
        else:
            file_path = f"../backend/uploads/{request.filename}"
            df = pd.read_csv(file_path)

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

    except Exception as error:
        return {
            "success": False,
            "error": str(error),
        }