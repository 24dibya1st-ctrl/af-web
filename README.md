# af-web

Minimal runnable project scaffold with optional Firebase link support.

## Run

```bash
python3 main.py
```

## Link Firebase (optional)

### Option A: use a `.env` file (recommended)

```bash
cp .env.example .env
# edit only FIREBASE_API_KEY in .env (project URLs are prefilled)
python3 main.py
```

### Option B: export variables in shell

Set these environment variables before running:

```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_API_KEY="your-api-key"
export FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
python3 main.py
```

When required values are set (via `.env` or shell exports), the app reports Firebase as linked and prints hosting URLs.

## Your Firebase project values

- Project ID: `af-ai-store-f0761e`
- Site name: `af-ai-store-f0761e`
- Live URL: `https://af-ai-store-f0761e.web.app`
- Alternate URL: `https://af-ai-store-f0761e.firebaseapp.com`