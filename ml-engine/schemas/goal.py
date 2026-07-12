from typing import Literal
from pydantic import BaseModel


class ParsedGoal(BaseModel):
    success: bool
    raw_text: str
    template_id: str
    target: str
    goal_direction: Literal["maximize", "minimize"]
    threshold: float | None
    features: list[str]
    constraints: dict[str, dict[str, float | None]]
    source: Literal["llm", "local"]
    error: str | None = None
    examples: list[str] | None = None
