import json
import os
import re
import httpx
import pandas as pd
from typing import Literal
from schemas.goal import ParsedGoal
try:
    import headroom
    _HAS_HEADROOM = True
except ImportError:
    headroom = None
    _HAS_HEADROOM = False


def _compress_llm_messages(messages: list[dict], model: str = "gpt-4o") -> list[dict]:
    if not _HAS_HEADROOM or headroom is None:
        return messages
    try:
        result = headroom.compress(messages, model=model)
        if result.tokens_saved > 0:
            print(
                f"[Headroom] Compressed goal parse prompt: {result.tokens_before} -> {result.tokens_after} tokens "
                f"({result.compression_ratio * 100:.0f}% reduction) transforms: {', '.join(result.transforms_applied)}"
            )
        return result.messages
    except Exception as exc:
        print(f"[Headroom] Compression skipped: {exc}")
        return messages


TEMPLATES = {
    "yield_optimizer": {
        "template_id": "yield_optimizer",
        "target_candidates": ["Yield", "yield_percent", "Yield_%"],
        "feature_candidates": ["Temperature", "Pressure", "Humidity", "Speed"],
    },
    "defect_risk": {
        "template_id": "defect_risk",
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
    },
    "predictive_maintenance": {
        "template_id": "predictive_maintenance",
        "target_candidates": ["Failure", "Failure_Within_N_Days"],
        "feature_candidates": ["Vibration", "Temperature", "Runtime_Hours", "Maintenance_History"],
    },
    "sales_forecasting": {
        "template_id": "sales_forecasting",
        "target_candidates": ["Revenue", "Units_Sold"],
        "feature_candidates": ["Historical_Sales", "Promotions", "Pipeline_Stage"],
    },
    "churn_predictor": {
        "template_id": "churn_predictor",
        "target_candidates": ["Churn"],
        "feature_candidates": ["Usage_Frequency", "Support_Tickets", "Tenure", "Payment_History"],
    },
    "stockout_predictor": {
        "template_id": "stockout_predictor",
        "target_candidates": ["Days_Until_Stockout"],
        "feature_candidates": ["Sales_Velocity", "Current_Stock", "Lead_Time"],
    },
    "demand_forecasting": {
        "template_id": "demand_forecasting",
        "target_candidates": ["Demand_Quantity"],
        "feature_candidates": ["Historical_Demand", "Price", "Promotions"],
    },
    "energy_optimization": {
        "template_id": "energy_optimization",
        "target_candidates": ["Energy_Consumption", "Cost"],
        "feature_candidates": [
            "Machine_Load",
            "Ambient_Temp",
            "Shift_Pattern",
            "Production_Volume",
        ],
    },
    "credit_risk": {
        "template_id": "credit_risk",
        "target_candidates": ["Default", "Fraud"],
        "feature_candidates": [
            "Transaction_Amount",
            "Frequency",
            "Account_Age",
            "Behavior_History",
        ],
    },
    "attrition_predictor": {
        "template_id": "attrition_predictor",
        "target_candidates": ["Attrition"],
        "feature_candidates": ["Tenure", "Performance_Rating", "Salary_Band", "Engagement_Score"],
    },
}

GOAL_PARSE_PROMPT = (
    'Parse this manufacturing/process optimization goal into structured JSON.\n\n'
    'Goal: "{goal_text}"\n'
    'Template: {template_id}\n'
    'Available columns in dataset: {columns}\n\n'
    'Return ONLY a JSON object with these exact keys:\n'
    '{{\n'
    '  "target": "column_name",\n'
    '  "goal_direction": "maximize" or "minimize",\n'
    '  "threshold": number or null,\n'
    '  "features": ["column1", "column2"],\n'
    '  "constraints": {{"column": {{"min": number, "max": number}}}}\n'
    '}}\n\n'
    'Rules:\n'
    '- target must be one of the available columns or a close variant\n'
    '- goal_direction defaults to "maximize"\n'
    '- threshold is the numeric target mentioned in the goal\n'
    '- features are columns mentioned in the goal\n'
    '- constraints capture any min/max bounds\n'
    '- If goal asks to minimize, set goal_direction to "minimize"\n'
    '- If goal asks to "maximize yield above 95" set target="Yield", direction="maximize", threshold=95.0\n'
    '- Respond with ONLY the JSON object, no extra text\n'
)


def _validate_columns(column: str, available: list[str]) -> str | None:
    if column in available:
        return column
    lower = column.lower()
    for col in available:
        if col.lower() == lower:
            return col
        if lower in col.lower() or col.lower() in lower:
            return col
    return None


def _validate_against_schema(data: dict, columns: list[str]) -> dict | None:
    target = data.get("target", "")
    validated_target = _validate_columns(target, columns)
    if not validated_target:
        return None

    features = []
    for feat in data.get("features", []):
        mapped = _validate_columns(feat, columns)
        if mapped:
            features.append(mapped)

    constraints = {}
    for col, bounds in data.get("constraints", {}).items():
        mapped = _validate_columns(col, columns)
        if mapped and bounds:
            constraints[mapped] = bounds

    return {
        "target": validated_target,
        "goal_direction": data.get("goal_direction", "maximize"),
        "threshold": data.get("threshold"),
        "features": features,
        "constraints": constraints,
    }


def _clean_json_text(text: str) -> str:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text


async def _call_nvidia(goal_text: str, template_id: str, columns: list[str]) -> dict | None:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        return None

    prompt = GOAL_PARSE_PROMPT.format(
        goal_text=goal_text, template_id=template_id, columns=", ".join(columns)
    )

    messages = [{"role": "user", "content": prompt}]
    compressed_messages = _compress_llm_messages(messages, model="meta/llama-3.3-70b-instruct")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0)) as client:
            response = await client.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "meta/llama-3.3-70b-instruct",
                    "messages": compressed_messages,
                    "temperature": 0.2,
                    "top_p": 0.7,
                    "max_tokens": 1024,
                    "stream": False,
                },
            )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        cleaned = _clean_json_text(content)
        parsed = json.loads(cleaned)
        validated = _validate_against_schema(parsed, columns)
        if validated:
            return validated
        return None
    except Exception:
        return None


async def _call_groq(goal_text: str, template_id: str, columns: list[str]) -> dict | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    prompt = GOAL_PARSE_PROMPT.format(
        goal_text=goal_text, template_id=template_id, columns=", ".join(columns)
    )

    messages = [{"role": "user", "content": prompt}]
    compressed_messages = _compress_llm_messages(messages, model="llama-3.3-70b-versatile")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0)) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": compressed_messages,
                    "temperature": 0.2,
                    "top_p": 0.7,
                    "max_tokens": 1024,
                    "stream": False,
                },
            )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        cleaned = _clean_json_text(content)
        parsed = json.loads(cleaned)
        validated = _validate_against_schema(parsed, columns)
        if validated:
            return validated
        return None
    except Exception:
        return None


async def _call_openrouter(goal_text: str, template_id: str, columns: list[str]) -> dict | None:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None

    prompt = GOAL_PARSE_PROMPT.format(
        goal_text=goal_text, template_id=template_id, columns=", ".join(columns)
    )

    messages = [{"role": "user", "content": prompt}]
    compressed_messages = _compress_llm_messages(messages, model="openai/gpt-4o")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0)) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o",
                    "messages": compressed_messages,
                    "temperature": 0.2,
                    "top_p": 0.7,
                    "max_tokens": 1024,
                    "stream": False,
                },
            )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        cleaned = _clean_json_text(content)
        parsed = json.loads(cleaned)
        validated = _validate_against_schema(parsed, columns)
        if validated:
            return validated
        return None
    except Exception:
        return None


# ==================================================
# LOCAL REGEX FALLBACK
# ==================================================

def _title_case(word: str) -> str:
    return word[0].upper() + word[1:] if word else word


def _find_target(text: str, template: dict) -> str:
    lower = text.lower()
    for cand in template.get("target_candidates", []):
        if lower.find(cand.lower()) != -1:
            return cand
    for keyword in ["yield", "defect", "churn", "revenue", "sales", "quality"]:
        if lower.find(keyword) != -1:
            candidates = template.get("target_candidates", [])
            if candidates:
                return candidates[0]
    return template.get("target_candidates", [""])[0]


def _find_goal_direction(text: str) -> Literal["maximize", "minimize"]:
    lower = text.lower()
    minimize_words = ["minimize", "reduce", "lower", "decrease", "cut", "avoid", "prevent"]
    if any(w in lower for w in minimize_words):
        return "minimize"
    return "maximize"


def _find_threshold(text: str, goal_direction: str) -> float | None:
    lower = text.lower()
    if goal_direction == "maximize":
        pattern = re.compile(r"(above|exceed|over|at least|>=|≥|more than)\s*(\d+(?:\.\d+)?)")
    else:
        pattern = re.compile(r"(below|under|less than|at most|<=|≤|no more than)\s*(\d+(?:\.\d+)?)")
    match = pattern.search(lower)
    if match:
        return float(match.group(2))
    pct = re.search(r"(\d+(?:\.\d+)?)\s*%", lower)
    return float(pct.group(1)) if pct else None


def _find_features(text: str, template: dict) -> list[str]:
    lower = text.lower()
    features = []
    for feat in template.get("feature_candidates", []):
        if lower.find(feat.lower()) != -1:
            features.append(feat)
    synonyms = {
        "temp": "Temperature",
        "temperature": "Temperature",
        "pressure": "Pressure",
        "humidity": "Humidity",
        "speed": "Speed",
    }
    for syn, canonical in synonyms.items():
        if lower.find(syn) != -1 and canonical in template.get("feature_candidates", []) and canonical not in features:
            features.append(canonical)
    return features


def _find_constraints(text: str, template: dict) -> dict[str, dict[str, float | None]]:
    lower = text.lower()
    constraints: dict[str, dict[str, float | None]] = {}
    for feat in template.get("feature_candidates", []):
        feat_lower = feat.lower()
        below = re.search(fr"{re.escape(feat_lower)}\s*(?:below|under|less than|at most|no more than|<=|≤)\s*(\d+(?:\.\d+)?)", lower)
        above = re.search(fr"{re.escape(feat_lower)}\s*(?:above|exceed|over|at least|more than|>=|≥)\s*(\d+(?:\.\d+)?)", lower)
        if below or above:
            if feat not in constraints:
                constraints[feat] = {}
            if below:
                constraints[feat]["max"] = float(below.group(1))
            if above:
                constraints[feat]["min"] = float(above.group(1))
    return constraints


def _local_parse(goal_text: str, template_id: str, columns: list[str]) -> dict:
    template = TEMPLATES.get(template_id, TEMPLATES["yield_optimizer"])
    text = (goal_text or "").strip()
    if not text:
        return {}

    goal_direction = _find_goal_direction(text)
    target = _find_target(text, template)
    validated_target = _validate_columns(target, columns)

    if not validated_target:
        for col in columns:
            if text.lower().find(col.lower()) != -1:
                validated_target = col
                break

    threshold = _find_threshold(text, goal_direction)
    features = _find_features(text, template)

    validated_features = []
    for feat in features:
        v = _validate_columns(feat, columns)
        if v:
            validated_features.append(v)

    if not validated_features and validated_target:
        validated_features = [validated_target]

    validated_constraints = {}
    constraints = _find_constraints(text, template)
    for col, bounds in constraints.items():
        v = _validate_columns(col, columns)
        if v:
            validated_constraints[v] = bounds

    if not validated_target:
        return {}

    return {
        "target": validated_target,
        "goal_direction": goal_direction,
        "threshold": threshold,
        "features": validated_features,
        "constraints": validated_constraints,
    }


# ==================================================
# PUBLIC API
# ==================================================

EXAMPLE_GOALS = [
    "Maximize Yield above 95% while keeping Temperature below 90°C",
    "Minimize defects by reducing Pressure above 500",
    "Maximize yield with Humidity between 40 and 60",
]


class GoalParseError(Exception):
    def __init__(self, message: str, examples: list[str] | None = None):
        super().__init__(message)
        self.examples = examples


async def parse_goal(
    goal_text: str,
    template_id: str = "yield_optimizer",
    columns: list[str] | None = None,
) -> ParsedGoal:
    text = (goal_text or "").strip()
    if not text:
        raise GoalParseError("Empty goal text", examples=EXAMPLE_GOALS)

    available_columns = columns or []
    template = TEMPLATES.get(template_id, TEMPLATES["yield_optimizer"])

    llm_result = await _call_nvidia(text, template_id, available_columns)
    if not llm_result:
        llm_result = await _call_groq(text, template_id, available_columns)
    if not llm_result:
        llm_result = await _call_openrouter(text, template_id, available_columns)

    if llm_result:
        return ParsedGoal(
            success=True,
            raw_text=text,
            template_id=template_id,
            target=llm_result["target"],
            goal_direction=llm_result["goal_direction"],
            threshold=llm_result.get("threshold"),
            features=llm_result.get("features", []),
            constraints=llm_result.get("constraints", {}),
            source="llm",
        )

    local = _local_parse(text, template_id, available_columns)
    if not local.get("target"):
        raise GoalParseError("Could not parse goal text", examples=EXAMPLE_GOALS)

    return ParsedGoal(
        success=True,
        raw_text=text,
        template_id=template_id,
        target=local["target"],
        goal_direction=local["goal_direction"],
        threshold=local.get("threshold"),
        features=local.get("features", []),
        constraints=local.get("constraints", {}),
        source="local",
    )
