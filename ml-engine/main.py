from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import numpy as np
import math

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

app = FastAPI()

# ==================================================
# CORS
# ==================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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