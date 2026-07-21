import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from services.dataset_health import analyze_dataset_health, _suggest_target


def test_suggest_target_yield():
    assert _suggest_target(["Yield", "Temperature", "Pressure"]) == "Yield"


def test_suggest_target_no_match():
    assert _suggest_target(["Temperature", "Pressure"]) is None


def test_analyze_dataset_health_basic():
    df = pd.DataFrame({
        "Yield": [90, 95, 92, 88, 94],
        "Temperature": [80, 85, 82, 79, 84],
    })
    result = analyze_dataset_health(df)
    assert "score" in result
    assert "status" in result
    assert "warnings" in result
    assert "suggestions" in result


def test_analyze_dataset_health_with_target():
    df = pd.DataFrame({
        "Yield": [90, 95, 92, 88, 94],
        "Temperature": [80, 85, 82, 79, 84],
    })
    result = analyze_dataset_health(df, target_column="Yield")
    assert result.get("targetColumn") == "Yield"
