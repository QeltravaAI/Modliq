-- Row Level Security Policies for Modliq Production
-- Apply these in Supabase SQL Editor against the production database.

-- ==========================================
-- User / Workspace
-- ==========================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON "User"
FOR SELECT
USING ("id" = auth.uid()::text);

CREATE POLICY "Users can update own profile"
ON "User"
FOR UPDATE
USING ("id" = auth.uid()::text)
WITH CHECK ("id" = auth.uid()::text);

-- ==========================================
-- OperationsRecord
-- ==========================================
ALTER TABLE "OperationsRecord" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own operations records"
ON "OperationsRecord"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- Supplier
-- ==========================================
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own suppliers"
ON "Supplier"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- MaterialLot
-- ==========================================
ALTER TABLE "MaterialLot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own material lots"
ON "MaterialLot"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- LeanWasteEvent
-- ==========================================
ALTER TABLE "LeanWasteEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own waste events"
ON "LeanWasteEvent"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- KaizenAction
-- ==========================================
ALTER TABLE "KaizenAction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own kaizen actions"
ON "KaizenAction"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- FiveSAudit
-- ==========================================
ALTER TABLE "FiveSAudit" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own 5S audits"
ON "FiveSAudit"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- AiInsight
-- ==========================================
ALTER TABLE "AiInsight" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI insights"
ON "AiInsight"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- AiConversation
-- ==========================================
ALTER TABLE "AiConversation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI conversations"
ON "AiConversation"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- AiMessage
-- ==========================================
ALTER TABLE "AiMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI messages"
ON "AiMessage"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ==========================================
-- OptimizationJob
-- ==========================================
ALTER TABLE "OptimizationJob" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own optimization jobs"
ON "OptimizationJob"
FOR ALL
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);
