import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

if (!DATABASE_URL) {
  console.warn('[db] DATABASE_URL not set. Optimization jobs will not be persisted to Postgres.');
}

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

export async function initDb() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "OptimizationJob" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "datasetId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'running',
        "stage" TEXT,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "requestJson" TEXT,
        "resultJson" TEXT,
        "error" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "OptimizationJob_userId_idx" ON "OptimizationJob"("userId");
      CREATE INDEX IF NOT EXISTS "OptimizationJob_createdAt_idx" ON "OptimizationJob"("createdAt");
    `);
  } catch (err) {
    console.error('[db] Failed to initialize OptimizationJob table:', err);
  }
}

export async function createOptimizationJobDb(job: {
  id: string;
  userId: string;
  datasetId?: string;
  status: string;
  stage?: string;
  progress?: number;
  requestJson?: string;
  resultJson?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO "OptimizationJob" ("id", "userId", "datasetId", "status", "stage", "progress", "requestJson", "resultJson", "error", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10), to_timestamp($11))`,
      [
        job.id,
        job.userId,
        job.datasetId || null,
        job.status,
        job.stage || null,
        job.progress || 0,
        job.requestJson || null,
        job.resultJson || null,
        job.error || null,
        job.createdAt / 1000,
        job.updatedAt / 1000,
      ]
    );
  } catch (err) {
    console.error('[db] Failed to create optimization job:', err);
  }
}

export async function getOptimizationJobDb(id: string) {
  if (!pool) return null;
  try {
    const res = await pool.query('SELECT * FROM "OptimizationJob" WHERE "id" = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.userId,
      datasetId: r.datasetId,
      status: r.status,
      stage: r.stage,
      progress: r.progress,
      requestJson: r.requestJson,
      resultJson: r.resultJson,
      error: r.error,
      createdAt: new Date(r.createdAt).getTime(),
      updatedAt: new Date(r.updatedAt).getTime(),
    };
  } catch (err) {
    console.error('[db] Failed to get optimization job:', err);
    return null;
  }
}

export async function updateOptimizationJobDb(id: string, data: {
  status?: string;
  stage?: string;
  progress?: number;
  resultJson?: string;
  error?: string;
}) {
  if (!pool) return;
  try {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.status !== undefined) { sets.push(`"status" = $${idx++}`); values.push(data.status); }
    if (data.stage !== undefined) { sets.push(`"stage" = $${idx++}`); values.push(data.stage); }
    if (data.progress !== undefined) { sets.push(`"progress" = $${idx++}`); values.push(data.progress); }
    if (data.resultJson !== undefined) { sets.push(`"resultJson" = $${idx++}`); values.push(data.resultJson); }
    if (data.error !== undefined) { sets.push(`"error" = $${idx++}`); values.push(data.error); }
    sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);
    await pool.query(`UPDATE "OptimizationJob" SET ${sets.join(', ')} WHERE "id" = $${idx}`, values);
  } catch (err) {
    console.error('[db] Failed to update optimization job:', err);
  }
}
