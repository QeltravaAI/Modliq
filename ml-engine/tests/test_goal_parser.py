import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.goal_parser import _local_parse, EXAMPLE_GOALS


def test_local_parse_maximize_yield():
    result = _local_parse(
        "Maximize Yield above 95% while keeping Temperature below 90°C",
        "yield_optimizer",
        ["Yield", "Temperature", "Pressure", "Humidity"],
    )
    assert result["target"] == "Yield"
    assert result["goal_direction"] == "maximize"
    assert result["threshold"] == 95.0
    assert "Temperature" in result["features"]
    assert result["constraints"].get("Temperature", {}).get("max") == 90


def test_local_parse_minimize_defects():
    result = _local_parse(
        "Minimize defects by reducing Pressure above 500",
        "defect_risk",
        ["Defect", "Pressure", "Temperature", "Speed"],
    )
    assert result["goal_direction"] == "minimize"
    assert result["target"] == "Defect"


def test_local_parse_empty_text():
    result = _local_parse("", "yield_optimizer", ["Yield", "Temperature"])
    assert result == {}


def test_example_goals_are_present():
    assert len(EXAMPLE_GOALS) >= 3
