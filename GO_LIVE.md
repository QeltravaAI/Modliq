# Modliq GO-LIVE Execution Guide

**Current Status:** CONDITIONAL GO  
**Code Hardening:** COMPLETE  
**Next:** Execute live production steps in order

---

## Pre-flight Check

```bash
# 1. Verify no secrets in repo
git ls-files | Where-Object { $_ -match '\.env$' }

# 2. Verify dev.db removed from git
git ls-files | Where-Object { $_ -match 'dev\.db$' }

# 3. Verify builds pass
cd backend; npx tsc --noEmit; npm run build
cd frontend; npx tsc --noEmit; npx next build
cd ml-engine; python -m py_compile main.py dependencies.py routers/goal.py services/goal_parser.py services/dataset_health.py
```

---

## Step 1: Rotate Exposed Keys

Rotate these keys in their respective dashboards:
- `NVIDIA_API_KEY` — https://build.nvidia.com/settings/api-keys
- `GROQ_API_KEY` — https://console.groq.com/keys
- `OPENROUTER_API_KEY` — https://openrouter.ai/keys

**Do not commit new keys.**

---

## Step 2: Generate Secrets

```bash
# NEXTAUTH_SECRET (32 bytes)
openssl rand -base64 32

# ML_INTERNAL_API_KEY (64 hex chars)
openssl rand -hex 32
```

Save both values securely. You will paste them into Vercel/Render dashboards only.

---

## Step 3: Set Vercel Environment Variables

Go to: https://vercel.com/sathishsathishkumar/modliq/settings/environment-variables

Add/update:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |
| `DATABASE_URL` | Supabase Postgres pooler URL |
| `DIRECT_URL` | Supabase Postgres direct URL |
| `NEXT_PUBLIC_API_URL` | `https://modliq-1.onrender.com` |
| `NEXTAUTH_SECRET` | `<output from openssl rand -base64 32>` |
| `NEXTAUTH_URL` | `https://modliq.vercel.app` |
| `LLM_PROVIDER` | `nvidia` |
| `NVIDIA_API_KEY` | `<rotated new key>` |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` |
| `AI_MODEL_FAST` | `meta/llama-3.1-8b-instruct` |
| `AI_MODEL_REASONING` | `nvidia/llama-3.1-nemotron-70b-instruct` |
| `AI_FEATURES_ENABLED` | `true` |

Trigger redeploy after saving.

---

## Step 4: Set Render Backend Environment Variables

Go to: https://dashboard.render.com/web/srv-xxx/modliq-1/environment

Add/update:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `CLIENT_ORIGIN` | `https://modliq.vercel.app` |
| `FRONTEND_ORIGIN` | `https://modliq.vercel.app` |
| `ML_ENGINE_URL` | `https://modliq.onrender.com` |
| `ML_INTERNAL_API_KEY` | `<same as ML engine>` |
| `DATABASE_URL` | `<supabase pooler or direct>` |
| `SUPABASE_URL` | `https://zygjhjhtbanevzlasjmj.supabase.co` |
| `SUPABASE_ANON_KEY` | `<your supabase anon key>` |
| `REQUEST_TIMEOUT_MS` | `30000` |
| `JOB_TIMEOUT_MS` | `180000` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `120` |

Trigger manual deploy after saving.

---

## Step 5: Set Render ML Engine Environment Variables

Go to: https://dashboard.render.com/web/srv-xxx/modliq/environment

Add/update:

| Variable | Value |
|----------|-------|
| `CLIENT_ORIGIN` | `https://modliq.vercel.app` |
| `BACKEND_ORIGIN` | `https://modliq-1.onrender.com` |
| `ML_INTERNAL_API_KEY` | `<same as backend>` |

Trigger manual deploy after saving.

---

## Step 6: Run Prisma Migration

```bash
cd frontend
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

Verify `OptimizationJob` table exists in Supabase Table Editor.

---

## Step 7: Apply RLS Policies

Go to: Supabase Dashboard → SQL Editor

Run the contents of:
```
frontend/prisma/migrations/20260103_enable_rls/rls_policies.sql
```

Verify with:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

All user-scoped tables should show `rowsecurity = true`.

---

## Step 8: Live Smoke Tests

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
```

All should return HTTP 200.

---

## Step 9: ML Service Auth Verification

```bash
# Should return 401
curl -i -X POST https://modliq.onrender.com/parse-goal \
  -H "Content-Type: application/json" \
  -d '{"goal_text":"maximize yield","columns":["yield","temperature"]}'

# Should return 401 with wrong key
curl -i -X POST https://modliq.onrender.com/parse-goal \
  -H "Content-Type: application/json" \
  -H "X-Modliq-Service-Key: wrong-key" \
  -d '{"goal_text":"maximize yield","columns":["yield","temperature"]}'
```

---

## Step 10: Backend Auth Verification

```bash
# Should return 401
curl -i https://modliq-1.onrender.com/api/v1/datasets/some-id/preview
```

---

## Step 11: CORS Verification

```bash
# Good origin should work
curl -i -X OPTIONS https://modliq-1.onrender.com/api/v1/parse-goal \
  -H "Origin: https://modliq.vercel.app" \
  -H "Access-Control-Request-Method: POST"

# Bad origin should NOT return wildcard
curl -i -X OPTIONS https://modliq-1.onrender.com/api/v1/parse-goal \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST"
```

---

## Step 12: Full E2E Demo Flow

1. Open https://modliq.vercel.app/
2. Sign in with demo account
3. Load demo dataset
4. Parse goal: "Maximize yield above 95 while keeping temperature below 90"
5. Start optimization
6. Verify results
7. Verify Quality Studio, Operations, Supply Chain, Lean
8. Verify AI Copilot

---

## Step 13: Full E2E Custom CSV Flow

1. Upload custom CSV
2. Verify preview and health
3. Parse goal
4. Start optimization
5. Verify constraints respected
6. Reload and verify persistence

---

## Step 14: AI Failure Flow

1. Remove `NVIDIA_API_KEY` from Vercel
2. Redeploy frontend
3. Verify AI features show graceful degradation message
4. Verify deterministic features still work

---

## Final GO / NO-GO Decision

```txt
Final Status: GO / NO-GO

Production URLs:
Frontend: https://modliq.vercel.app/
Backend: https://modliq-1.onrender.com
ML Engine: https://modliq.onrender.com/

Security:
[ ] Secrets rotated
[ ] RLS enabled and verified
[ ] ML service auth verified
[ ] Backend auth verified
[ ] CORS strict

Deployment:
[ ] Frontend deployed
[ ] Backend deployed
[ ] ML deployed
[ ] Prisma migrations applied

Functional:
[ ] Demo flow passed
[ ] Custom CSV flow passed
[ ] Optimization constraints respected
[ ] Quality Studio passed
[ ] Operations passed
[ ] Supply Chain passed
[ ] Lean passed
[ ] AI Copilot passed or gracefully disabled

Decision:
GO if all checked.
NO-GO if any unchecked.
```

---

## Support Files

| File | Purpose |
|------|---------|
| `backend/smoke.mjs` | Backend health/warmup smoke test |
| `ml-engine/smoke_test.py` | ML engine health/warmup/auth smoke test |
| `frontend/prisma/migrations/20260103_enable_rls/rls_policies.sql` | RLS policies for Supabase |
| `backend/.env.example` | Backend env template |
| `ml-engine/.env.example` | ML engine env template |
| `frontend/.env.example` | Frontend env template |

---

**End of GO-LIVE Execution Guide**
