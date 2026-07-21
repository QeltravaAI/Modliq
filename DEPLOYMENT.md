# Modliq Production Deployment Package
# Generated: 2026-07-14

## Prerequisites
- Vercel account with frontend project linked
- Render account with backend + ML engine services
- Rotated API keys for NVIDIA, Groq, OpenRouter
- Generated secrets:
  - NEXTAUTH_SECRET: run `openssl rand -base64 32`
  - ML_INTERNAL_API_KEY: run `openssl rand -hex 32`

---

## Step 1: Vercel Environment Variables

Project: https://vercel.com/sathishsathishkumar/modliq/settings/environment-variables

| Variable | Value | Type |
|----------|-------|------|
| DATABASE_URL | mongodb+srv://qeltravaai_db_user:<DB_PASSWORD>@cluster0.culwvqq.mongodb.net/modliq?retryWrites=true&w=majority | Secret |
| DIRECT_URL | mongodb+srv://qeltravaai_db_user:<DB_PASSWORD>@cluster0.culwvqq.mongodb.net/modliq?retryWrites=true&w=majority | Secret |
| NEXT_PUBLIC_API_URL | https://modliq-1.onrender.com | Public |
| NEXTAUTH_SECRET | <openssl rand -base64 32> | Secret |
| NEXTAUTH_URL | https://modliq.vercel.app | Public |
| LLM_PROVIDER | nvidia | Public |
| NVIDIA_API_KEY | <YOUR_NVIDIA_API_KEY> | Secret |
| NVIDIA_BASE_URL | https://integrate.api.nvidia.com/v1 | Public |
| AI_MODEL_FAST | meta/llama-3.1-8b-instruct | Public |
| AI_MODEL_REASONING | nvidia/llama-3.1-nemotron-70b-instruct | Public |
| AI_FEATURES_ENABLED | true | Public |
| GROQ_API_KEY | <YOUR_GROQ_API_KEY> | Secret |
| OPENROUTER_API_KEY | <YOUR_OPENROUTER_API_KEY> | Secret |

After saving: Redeploy frontend from Vercel dashboard.

---

## Step 2: Render Backend Environment Variables

Service: https://dashboard.render.com/web/srv-xxx/modliq-1/environment

| Variable | Value | Type |
|----------|-------|------|
| NODE_ENV | production | Default |
| PORT | 3001 | Default |
| ML_ENGINE_URL | https://modliq.onrender.com | Default |
| CLIENT_ORIGIN | https://modliq.vercel.app | Default |
| FRONTEND_ORIGIN | https://modliq.vercel.app | Default |
| REQUEST_TIMEOUT_MS | 30000 | Default |
| JOB_TIMEOUT_MS | 180000 | Default |
| RATE_LIMIT_WINDOW_MS | 60000 | Default |
| RATE_LIMIT_MAX_REQUESTS | 120 | Default |
| DATABASE_URL | mongodb+srv://qeltravaai_db_user:<DB_PASSWORD>@cluster0.culwvqq.mongodb.net/modliq?retryWrites=true&w=majority | Default |
| ML_INTERNAL_API_KEY | <same-as-ml-engine> | Default |

After saving: Trigger manual deploy in Render.

---

## Step 3: Render ML Engine Environment Variables

Service: https://dashboard.render.com/web/srv-xxx/modliq/environment

| Variable | Value | Type |
|----------|-------|------|
| CLIENT_ORIGIN | https://modliq.vercel.app | Default |
| BACKEND_ORIGIN | https://modliq-1.onrender.com | Default |
| ML_INTERNAL_API_KEY | <same-as-backend> | Default |

After saving: Trigger manual deploy in Render.

---

## Step 4: Deploy Order

1. **ML Engine** → Render
2. **Backend** → Render
3. **Frontend** → Vercel

---

## Step 5: Run Smoke Tests

After all deploys complete, run:

```bash
# Frontend
curl -i https://modliq.vercel.app/

# Backend
curl -i https://modliq-1.onrender.com/health
curl -i https://modliq-1.onrender.com/warmup

# ML Engine
curl -i https://modliq.onrender.com/
curl -i https://modliq.onrender.com/health
curl -i https://modliq.onrender.com/warmup

# ML Auth Check (should return 401)
curl -i -X POST https://modliq.onrender.com/parse-goal \
  -H "Content-Type: application/json" \
  -d '{"goal_text":"maximize yield","columns":["yield","temperature"]}'

# Backend Auth Check (should return 401)
curl -i https://modliq-1.onrender.com/api/v1/datasets/some-id/preview
```
