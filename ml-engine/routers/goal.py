from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.goal_parser import parse_goal, GoalParseError, EXAMPLE_GOALS
from dependencies import verify_service_key


router = APIRouter()


class GoalRequest(BaseModel):
    goal_text: str
    template_id: str = "yield_optimizer"
    columns: list[str] = []


@router.post("/parse-goal", dependencies=[Depends(verify_service_key)])
async def parse_goal_endpoint(request: GoalRequest):
    try:
        result = await parse_goal(request.goal_text, request.template_id, request.columns)
        return result.model_dump()
    except GoalParseError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": str(exc),
                "examples": exc.examples or EXAMPLE_GOALS,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(exc), "examples": EXAMPLE_GOALS},
        )
