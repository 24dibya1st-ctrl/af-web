"""Multi-step agent pipeline: planner → research → executor → critic."""

from openai import OpenAI

from app.config import settings


def _client() -> OpenAI:
    if not settings.openai_api_key.strip():
        raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env")
    return OpenAI(api_key=settings.openai_api_key)


def _chat(system: str, user: str) -> str:
    client = _client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
    )
    choice = response.choices[0].message.content
    return (choice or "").strip()


def planner(problem: str) -> str:
    return _chat(
        "You are a planning agent. Output a numbered step-by-step plan only.",
        f"Break this problem into clear steps:\n\n{problem}",
    )


def research(plan: str) -> str:
    return _chat(
        "You are a research agent. Use general knowledge only (no live web). "
        "List facts, constraints, and options relevant to the plan.",
        f"Given this plan, what should we know or consider?\n\n{plan}",
    )


def executor(plan: str, research_notes: str) -> str:
    return _chat(
        "You are an execution agent. Produce a concrete solution draft: actions, "
        "priorities, and measurable next steps.",
        f"Plan:\n{plan}\n\nResearch notes:\n{research_notes}\n\nDraft the solution.",
    )


def critic(draft: str) -> str:
    return _chat(
        "You are a critic agent. Improve clarity, fix gaps, and add a short risks section.",
        f"Improve this output:\n\n{draft}",
    )


def solve_problem(problem: str) -> dict[str, str]:
    """Full pipeline with intermediate outputs for debugging / UI."""
    plan = planner(problem)
    research_notes = research(plan)
    execution_draft = executor(plan, research_notes)
    final = critic(execution_draft)
    return {
        "problem": problem,
        "plan": plan,
        "research": research_notes,
        "execution_draft": execution_draft,
        "solution": final,
    }
