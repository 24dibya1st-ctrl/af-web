# AI Problem-Solving Agent API

Standalone **FastAPI** service: multi-step pipeline (planner → research → executor → critic) using **OpenAI**. Intended as its **own Git repository** — copy this folder out or run `git init` here after copying.

## Quick start

```bash
cd ai-agent-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set OPENAI_API_KEY

uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

- API: http://localhost:8080  
- Swagger: http://localhost:8080/docs  

### Example

```bash
curl -s -X POST http://localhost:8080/solve \
  -H "Content-Type: application/json" \
  -d '{"problem":"Our restaurant sales dropped last quarter"}'
```

## Use as a **new repo**

```bash
cp -r ai-agent-service ../af-ai-agent-api
cd ../af-ai-agent-api
git init
git add .
git commit -m "Initial FastAPI agent service"
# Create empty repo on GitHub, then:
git remote add origin https://github.com/YOU/af-ai-agent-api.git
git push -u origin main
```

## Next steps (production)

- Add **JWT auth**, **PostgreSQL** for `problem` / `solution` / embeddings  
- Swap research step for real **tools** (web search, calculators) via LangChain or raw APIs  
- Deploy with **Docker** + **AWS ECS / Render / Fly.io**  
- Keep API keys **only on the server** — never in the browser  

## Relation to `af-web`

The Firebase chat app in the parent repo can call this API (`POST /solve`) from a backend proxy or Cloud Function so the OpenAI key stays server-side.
