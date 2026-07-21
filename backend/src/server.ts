require('dotenv').config();

import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import authRoutes from './routes/auth.routes';
import { saveDataset, getDataset, getAllDatasets } from './data/datasetStore';
import { saveOptimization, getOptimization, listOptimizations } from './data/optimizationStore';
import { getWorkspace, setActiveDataset, setActiveWorkflow as setActiveWorkflowInStore, getActiveWorkflowId } from './data/workspaceStore';
import { listWorkflows, getWorkflow, createWorkflow as createWorkflowInStore, updateWorkflow as updateWorkflowInStore, deleteWorkflow as deleteWorkflowInStore } from './data/workflowStore';
import { getDashboardMetrics } from './data/dashboardData';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import stream from 'stream';
import axios from 'axios';
import { requireAuth } from './middleware/auth';
import { validateDatasetUpload, validateGoalRequest } from './middleware/validation';
import { initDb, createOptimizationJobDb, getOptimizationJobDb, updateOptimizationJobDb } from './db/optimizationJobs';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const port = process.env.PORT || 3001;
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://modliq.vercel.app';
const ML_INTERNAL_API_KEY = process.env.ML_INTERNAL_API_KEY || '';
// In production, CORS is scoped strictly to the real frontend origin.
// localhost is only allowed in non-production for local dev.
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [CLIENT_ORIGIN]
  : [CLIENT_ORIGIN, 'http://localhost:3000', 'http://localhost:5173'];

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', true);

function mlEngineHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (ML_INTERNAL_API_KEY) {
    headers['X-Modliq-Service-Key'] = ML_INTERNAL_API_KEY;
  }
  return headers;
}

console.log(`[backend] ML_ENGINE_URL=${ML_ENGINE_URL}`);
console.log(`[backend] CLIENT_ORIGIN=${CLIENT_ORIGIN}`);

// ==================================================
// RATE LIMITING (simple in-memory sliding window)
// ==================================================
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '120', 10);
const rateLimitHits = new Map<string, number[]>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = (req as any).user?.userId || req.ip || 'anonymous';
  const now = Date.now();
  const hits = rateLimitHits.get(key) || [];
  const recent = hits.filter(t => now - t < rateLimitWindow);
  recent.push(now);
  rateLimitHits.set(key, recent);

  if (recent.length > rateLimitMax) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
}

// ==================================================
// AUTH ROUTES
// ==================================================
app.use('/api/auth', authRoutes);

// ==================================================
// STORAGE + HELPERS
// ==================================================
const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path.join(process.cwd(), 'uploads');
const uploadDir = isProduction
  ? path.join(STORE_DIR, 'uploads')
  : path.join(__dirname, '../uploads');

function ensureDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create store directory:', err);
  }
}
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function fetchDemoDatasetFromMlEngine(): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await axios.get(`${ML_ENGINE_URL}/demo-dataset`, {
      timeout: 15000,
      headers: mlEngineHeaders(),
      responseType: 'arraybuffer',
    });
    if (response.status === 200 && response.data) {
      return { buffer: Buffer.from(response.data), contentType: String(response.headers['content-type'] || 'text/csv') };
    }
  } catch (err) {
    console.error('Failed to fetch demo dataset from ML engine:', (err as any)?.message || err);
  }
  return null;
}

function computeAnalyticsStatic(rows: any[]) {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return { totalRows: 0, totalColumns: 0, missingValues: 0, numericColumns: [], categoricalColumns: [] };
  }
  const headers = Object.keys(rows[0]);
  const columnTypes: Record<string, string> = {};
  let missingValues = 0;
  for (const col of headers) {
    let isNumeric = false;
    for (const row of rows) {
      const v = row[col];
      if (v === null || v === undefined || v === '') {
        missingValues++;
        continue;
      }
      if (!isNaN(Number(v))) {
        isNumeric = true;
        break;
      }
    }
    columnTypes[col] = isNumeric ? 'numeric' : 'categorical';
  }
  const numericColumns = Object.keys(columnTypes).filter((c) => columnTypes[c] === 'numeric');
  const categoricalColumns = Object.keys(columnTypes).filter((c) => columnTypes[c] === 'categorical');
  return {
    totalRows,
    totalColumns: headers.length,
    missingValues,
    numericColumns,
    categoricalColumns,
  };
}

function findFileInUploads(filename: string): string | null {
  const directPath = path.join(uploadDir, filename);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  try {
    const entries = fs.readdirSync(uploadDir, { recursive: true });
    for (const entry of entries) {
      if (typeof entry !== 'string') continue;
      const fullPath = path.join(uploadDir, entry);
      if (path.basename(fullPath) === filename && fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    }
  } catch (err) {
    console.error('Failed to scan uploads directory:', err);
  }

  return null;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req.params.userId as string as string) || 'default_user';
    const userDir = path.join(uploadDir, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const isCsv = file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

// ==================================================
// API V1 ROUTES
// ==================================================
const apiV1 = express.Router();

// --------------------------------------------------
// Workspace
// --------------------------------------------------
apiV1.post('/workspace/:userId/dataset', requireAuth, (req, res) => {
  const { datasetId } = req.body;
  if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
  setActiveDataset(req.params.userId as string, datasetId);
  res.json({ success: true, activeDatasetId: datasetId });
});

apiV1.get('/workspace/:userId', requireAuth, (req, res) => {
  const workspace = getWorkspace(req.params.userId as string);
  res.json({ success: true, workspace });
});

// --------------------------------------------------
// Datasets
// --------------------------------------------------
apiV1.get('/datasets/:id/preview', requireAuth, async (req, res) => {
  const dataset = await getDataset(req.params.id as string);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  if (!dataset.filePath) return res.status(404).json({ error: 'Dataset file not found' });

  const rows = parseInt(req.query.rows as string, 10) || 50;
  const results: any[] = [];
  let rowCount = 0;

  fs.createReadStream(dataset.filePath ?? '')
    .pipe(csv())
    .on('data', (data) => {
      if (rowCount < rows) results.push(data);
      rowCount++;
    })
    .on('end', () => res.json({ success: true, preview: results, filename: dataset.filename, analytics: dataset.analytics }))
    .on('error', () => res.status(500).json({ error: 'Failed to read preview' }));
});

apiV1.post('/datasets/:id/health', requireAuth, async (req, res) => {
  const dataset = await getDataset(req.params.id as string);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

  const rows: any[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(dataset.filePath ?? '')
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const mlPayload = {
      rows,
      targetColumn: req.body.targetColumn || null,
      features: req.body.features || null,
      mode: req.body.mode || 'generic',
    };

    const response = await axios.post(`${ML_ENGINE_URL}/dataset-health`, mlPayload, {
      headers: mlEngineHeaders(),
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('Health check error:', err.message, err.response?.data);
    res.status(500).json({ success: false, error: 'Failed to compute dataset health', details: err.message, responseData: err.response?.data });
  }
});

apiV1.post('/datasets/demo/:userId', requireAuth, async (req, res) => {
  const userId = req.params.userId as string;
  const fetched = await fetchDemoDatasetFromMlEngine();
  if (!fetched) {
    return res.status(500).json({ success: false, error: 'Demo dataset is not available on the server.' });
  }

  const results: any[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const readStream = new stream.PassThrough();
      readStream.end(fetched.buffer);
      readStream
        .pipe(csv())
        .on('data', (data) => {
          if (results.length < 500) results.push(data);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to read demo dataset.' });
  }

  const analytics = computeAnalyticsStatic(results);
  const datasetId = `ds_demo_${Date.now()}`;

  const demoLocalPath = path.join(uploadDir, `${datasetId}_manufacturing_data.csv`);
  fs.writeFileSync(demoLocalPath, fetched.buffer);

  saveDataset(datasetId, {
    id: datasetId,
    userId,
    filename: 'manufacturing_data.csv',
    originalName: 'manufacturing_data.csv',
    filePath: demoLocalPath,
    analytics,
  });

  setActiveDataset(userId, datasetId);

  res.json({
    success: true,
    datasetId,
    filename: datasetId,
    preview: results,
    analytics,
  });
});

apiV1.post('/datasets/upload/:userId', requireAuth, upload.single('dataset'), validateDatasetUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const fileSize = fs.statSync(req.file.path).size;
    if (fileSize > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ success: false, error: 'File exceeds maximum allowed size' });
    }

    const results: any[] = [];
    let missingValues = 0;
    let totalRows = 0;
    let headers: string[] = [];
    let hasError = false;
    let columnTypes: Record<string, string> = {};
    let isFirstRow = true;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
        if (new Set(headers).size !== headers.length) {
          hasError = true;
          return res.status(400).json({ success: false, error: 'Duplicate column headers detected.' });
        }
        if (headers.length === 0) {
          hasError = true;
          return res.status(400).json({ success: false, error: 'CSV must contain at least one column.' });
        }
        for (const header of headers) {
          if (!/^[a-zA-Z0-9_\- ]+$/.test(header)) {
            hasError = true;
            return res.status(400).json({ success: false, error: `Invalid column header: ${header}` });
          }
        }
      })
      .on('data', (data) => {
        if (hasError) return;
        if (totalRows < 5) results.push(data);
        totalRows++;

        if (totalRows > 100000) {
          hasError = true;
          return res.status(413).json({ success: false, error: 'Dataset exceeds 100k rows limit.' });
        }

        if (isFirstRow) {
          Object.entries(data).forEach(([key, value]) => {
            columnTypes[key] = (!isNaN(Number(value)) && value !== '') ? 'numeric' : 'categorical';
          });
          isFirstRow = false;
        } else {
          Object.entries(data).forEach(([key, value]) => {
            if (columnTypes[key] === 'numeric' && value !== '' && isNaN(Number(value))) {
              columnTypes[key] = 'categorical';
            }
          });
        }

        Object.values(data).forEach((value) => {
          if (value === null || value === undefined || value === '') missingValues++;
        });
      })
      .on('end', () => {
        if (hasError) return;
        if (totalRows === 0) {
          return res.status(400).json({ success: false, error: 'Empty CSV or CSV with only headers.' });
        }

        const totalColumns = headers.length;
        const numericColumns = Object.keys(columnTypes).filter(k => columnTypes[k] === 'numeric');
        const categoricalColumns = Object.keys(columnTypes).filter(k => columnTypes[k] === 'categorical');

        const datasetId = req.file!.filename;

        const analytics = {
          totalRows,
          totalColumns,
          missingValues,
          numericColumns,
          categoricalColumns,
        };

        saveDataset(datasetId, {
          id: datasetId,
          userId: req.params.userId as string,
          filename: req.file!.originalname,
          originalName: req.file!.originalname,
          filePath: req.file!.path,
          analytics,
        });

        setActiveDataset(req.params.userId as string as string, datasetId);

    res.json({
      success: true,
      datasetId,
      filename: datasetId,
      preview: results.slice(0, 500),
      analytics,
    });
      })
      .on('error', () => {
        if (!hasError) res.status(500).json({ success: false, error: 'CSV parsing failed' });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// --------------------------------------------------
// Optimization
// --------------------------------------------------
async function resolveOptimizationFile(filename: string): Promise<{ localPath: string; dataset: any } | null> {
  let localPath = path.join(uploadDir, filename);
  const dataset = await getDataset(filename);
  if (dataset && dataset.filePath) {
    localPath = dataset.filePath;
  }
  const resolvedPath =
    fs.existsSync(localPath) && fs.statSync(localPath).isFile()
      ? localPath
      : findFileInUploads(filename);
  if (!resolvedPath) return null;

  const realUploadDir = fs.realpathSync(uploadDir);
  const realResolved = fs.realpathSync(resolvedPath);
  if (!realResolved.startsWith(realUploadDir)) {
    return null;
  }

  return { localPath: resolvedPath, dataset };
}

// ==================================================
// Optimization — ASYNC JOB PATTERN
// Persisted via MongoDB for durability.
// ==================================================
// Optimization — ASYNC JOB PATTERN
// Persisted via Prisma/Postgres for durability.
// ==================================================
interface OptJob {
  id: string;
  userId: string;
  datasetId?: string;
  status: 'running' | 'completed' | 'failed';
  stage?: string;
  progress?: number;
  requestJson?: string;
  resultJson?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

async function createOptimizationJobRecord(job: OptJob) {
  await createOptimizationJobDb({
    id: job.id,
    userId: job.userId,
    datasetId: job.datasetId,
    status: job.status,
    stage: job.stage,
    progress: job.progress || 0,
    requestJson: job.requestJson,
    resultJson: job.resultJson,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

async function updateOptimizationJobRecord(id: string, data: {
  status?: string;
  stage?: string;
  progress?: number;
  resultJson?: string;
  error?: string;
}) {
  await updateOptimizationJobDb(id, data);
}

async function loadOptimizationJobsFromDb() {
  // Optimization jobs are now loaded on demand from Postgres via getOptimizationJobDb.
  // No bulk load needed at startup.
}

// Initialize durable job store on startup
initDb().catch((err) => {
  console.error('Failed to initialize optimization job database:', err);
});

apiV1.post('/optimization/jobs', requireAuth, rateLimit, async (req, res) => {
  try {
    const { filename, template_id, intent, monthly_volume, unit_value } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'filename is required' });
    }

    const resolved = await resolveOptimizationFile(filename);
    if (!resolved) {
      return res.status(400).json({
        success: false,
        error: `Dataset file not found on server: ${filename}. Upload a fresh dataset or load the demo.`,
      });
    }

    const fileContent = fs.readFileSync(resolved.localPath).toString('base64');

    const payload = {
      filename: resolved.dataset ? resolved.dataset.filename : filename,
      file_content: fileContent,
      template_id: template_id || 'yield_optimizer',
      target: intent?.target,
      features: intent?.features?.length ? intent.features : undefined,
      goal_direction: intent?.goal_direction || 'maximize',
      threshold: intent?.threshold,
      constraints: intent?.constraints,
      monthly_volume: monthly_volume || undefined,
      unit_value: unit_value || undefined,
    };

    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const userId = (req as any).user?.userId || (req as any).user?.id || 'anonymous';
    const jobRecord: OptJob = {
      id: jobId,
      userId,
      datasetId: resolved.dataset?.id,
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestJson: JSON.stringify(payload),
    };

    await createOptimizationJobRecord(jobRecord);

    const jobTimeout = parseInt(process.env.JOB_TIMEOUT_MS || '180000', 10);

    (async () => {
      try {
        const response = await axios.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
          timeout: jobTimeout,
          headers: mlEngineHeaders(),
        });
        const result = response.data;
        if (result && result.success) {
          await saveOptimization(jobId, {
            id: jobId,
            userId,
            datasetId: resolved.dataset?.id || null,
            filename: payload.filename,
            template_id: payload.template_id,
            result,
          });
          await updateOptimizationJobRecord(jobId, {
            status: 'completed',
            resultJson: JSON.stringify(result),
            progress: 100,
          });
        } else {
          await updateOptimizationJobRecord(jobId, {
            status: 'failed',
            error: result?.error || 'Optimization failed',
          });
        }
      } catch (error: any) {
        await updateOptimizationJobRecord(jobId, {
          status: 'failed',
          error: error.response?.data?.error || error.message || 'Optimization failed',
        });
      }
    })();

    res.json({ success: true, jobId, status: 'running' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to start optimization' });
  }
});

apiV1.get('/optimization/jobs/:id', requireAuth, async (req, res) => {
  try {
    const record = await getOptimizationJobDb(req.params.id as string);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Optimization job not found' });
    }
    const result = record.resultJson ? JSON.parse(record.resultJson) : undefined;
    res.json({
      success: true,
      id: record.id,
      status: record.status,
      result,
      error: record.error,
      progress: record.progress,
      stage: record.stage,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to load job' });
  }
});

apiV1.get('/warmup', async (req, res) => {
  try {
    const r = await axios.get(`${ML_ENGINE_URL}/warmup`, { timeout: 5000 });
    res.json({ success: true, mlEngineStatus: r.status });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

apiV1.get('/optimization/:id/results', requireAuth, async (req, res) => {
  const record = await getOptimization(req.params.id as string);
  if (!record) return res.status(404).json({ success: false, error: 'Optimization not found' });
  const parsed = record.result ? JSON.parse(record.result) : null;
  res.json({ success: true, ...record, result: parsed });
});

apiV1.get('/optimization/:id/report', requireAuth, async (req, res) => {
  const record = await getOptimization(req.params.id as string);
  if (!record) return res.status(404).json({ success: false, error: 'Optimization not found' });
  const parsed = record.result ? JSON.parse(record.result) : null;
  res.json({ success: true, id: record.id, generated_at: new Date().toISOString(), report: parsed });
});

// --------------------------------------------------
// AI Goal Parsing (proxied to ML Engine)
// --------------------------------------------------
apiV1.post('/parse-goal', requireAuth, rateLimit, validateGoalRequest, async (req, res) => {
  try {
    const response = await axios.post(`${ML_ENGINE_URL}/parse-goal`, req.body, {
      headers: mlEngineHeaders(),
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.detail || error.message || 'Goal parsing failed',
    });
  }
});

// --------------------------------------------------
// QC — single deterministic engine, proxied to ML engine
// --------------------------------------------------
async function proxyQc(subpath: string, req: express.Request, res: express.Response) {
  try {
    const response = await axios.post(`${ML_ENGINE_URL}/qc/${subpath}`, req.body, {
      headers: mlEngineHeaders(),
      timeout: 20000,
    });
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.response?.data?.error || err.message || 'QC computation failed',
    });
  }
}

apiV1.post('/qc/summary', requireAuth, rateLimit, (req, res) => proxyQc('summary', req, res));
apiV1.post('/qc/control-chart', requireAuth, rateLimit, (req, res) => proxyQc('control-chart', req, res));
apiV1.post('/qc/capability', requireAuth, rateLimit, (req, res) => proxyQc('capability', req, res));
apiV1.post('/qc/acceptance-sampling', requireAuth, rateLimit, (req, res) => proxyQc('acceptance-sampling', req, res));

// --------------------------------------------------
// Dashboard (recent activity derived from persisted runs)
// --------------------------------------------------
apiV1.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const metrics = await getDashboardMetrics(userId);
    res.json({ success: true, ...metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load dashboard' });
  }
});

// Legacy alias: frontend dashboard.service calls /dashboard directly.
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const metrics = await getDashboardMetrics(userId);
    res.json({ success: true, ...metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load dashboard' });
  }
});

app.use('/api/v1', apiV1);

app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development',
  };
  res.json(metrics);
});

// ==================================================
// SERVER
// ==================================================
app.listen(Number(port), '0.0.0.0', () => {
  logger.info({ port, mlEngineUrl: ML_ENGINE_URL }, 'Backend service running');
});
