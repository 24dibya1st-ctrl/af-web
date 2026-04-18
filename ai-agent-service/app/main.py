from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.agents import solve_problem

app = FastAPI(
    title="AI Problem-Solving Agent API",
    description="Planner → Research → Executor → Critic pipeline (OpenAI).",
    version="0.1.0",
)


class SolveIn(BaseModel):
    problem: str = Field(..., min_length=1, description="User problem statement")


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "AI Agent Running", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/solve")
def solve(body: SolveIn) -> dict[str, Any]:
    try:
        return solve_problem(body.problem.strip())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
