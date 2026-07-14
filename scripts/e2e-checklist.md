# Modliq E2E Test Checklist
# Run these manually in production after deploy

## URLs
- Frontend: https://modliq.vercel.app/
- Backend: https://modliq-1.onrender.com
- ML Engine: https://modliq.onrender.com/

---

## Demo Flow

- [ ] Open https://modliq.vercel.app/
- [ ] Sign in with demo account
- [ ] Visit /dashboard
- [ ] Confirm redirect to /[userId]/modliq-console/dashboard
- [ ] Load demo dataset
- [ ] Confirm dataset preview appears
- [ ] Confirm dataset health score appears
- [ ] Confirm detected modules include Operations and Supply Chain
- [ ] Reload page
- [ ] Confirm dataset persists
- [ ] Go to Goal page
- [ ] Enter: Maximize yield above 95 while keeping temperature below 90
- [ ] Parse goal
- [ ] Confirm target = yield
- [ ] Confirm yield is not in controllable features
- [ ] Confirm target-aware health check appears
- [ ] Start optimization job
- [ ] Confirm real polling
- [ ] Wait for completion
- [ ] Confirm results page renders
- [ ] Confirm recommended temperature <= 90
- [ ] Generate SOP or fallback SOP
- [ ] Open Quality Studio
- [ ] Run summary, I-MR, Cp/Cpk, AQL
- [ ] Open Operations
- [ ] Confirm OEE and downtime Pareto
- [ ] Open Supply Chain
- [ ] Confirm Supplier B risk
- [ ] Open Lean
- [ ] Add waste event
- [ ] Add Kaizen action
- [ ] Run 5S audit
- [ ] Use Takt calculator
- [ ] Use Kanban calculator
- [ ] Open Ask Modliq drawer
- [ ] Ask: What should I prioritize first?
- [ ] Confirm AI response or graceful AI disabled message

---

## Custom CSV Flow

- [ ] Upload custom CSV
- [ ] Confirm preview
- [ ] Confirm health report
- [ ] Confirm module detection
- [ ] Parse goal
- [ ] Start optimization job
- [ ] Confirm constraints respected
- [ ] Reload results page
- [ ] Confirm result persists

---

## AI Failure Flow

- [ ] Remove NVIDIA_API_KEY from Vercel dashboard
- [ ] Redeploy frontend
- [ ] Open dashboard AI summary
- [ ] Confirm AI_NOT_CONFIGURED or graceful message
- [ ] Open health AI explanation
- [ ] Confirm graceful message
- [ ] Open results AI explanation
- [ ] Confirm graceful message
- [ ] Open AI Copilot drawer
- [ ] Confirm graceful message
- [ ] Confirm deterministic features still work
- [ ] Confirm optimization still works
- [ ] Confirm Quality Studio still works

---

## Final GO Criteria

- [ ] All smoke tests pass
- [ ] Demo flow passes
- [ ] Custom CSV flow passes
- [ ] AI enabled flow works with key
- [ ] AI disabled flow degrades gracefully
- [ ] No production 500s in core flow
