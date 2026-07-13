import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import datasetsRoutes from './routes/datasets.routes';
import { datasetStore } from './data/datasetStore';
import { optimizationData } from './data/optimizationStore';
import { workspaceStore } from './data/workspaceStore';
import { dashboardData } from './data/dashboardData';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://modliq.vercel.app';

console.log(`[backend] ML_ENGINE_URL=${ML_ENGINE_URL}`);
console.log(`[backend] CLIENT_ORIGIN=${CLIENT_ORIGIN}`);

// Scope CORS to the Vercel frontend origin (no wildcard, no credentials needed
// because auth is handled client-side by Supabase).
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// ==================================================
// DATASETS (typed routes)
// ==================================================
app.use('/api/datasets', datasetsRoutes);

// ==================================================
// HEALTH
// ==================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'modliq-backend' });
});

// ==================================================
// STORAGE + HELPERS
// ==================================================
const isProduction = process.env.NODE_ENV === 'production';
const uploadDir = isProduction
  ? path.join('/tmp/modliq', 'uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Resolve the demo dataset CSV across possible deploy layouts. Render's working
// directory varies (monorepo checkout vs standalone service), so we probe several
// candidate locations and fall back to a bounded recursive search. This fixes the
// production bug where `process.cwd()/../ml-engine/...` resolved to a non-existent
// /tmp/ml-engine path.
function searchForDemo(dir: string, depth: number): string | null {
  if (depth < 0) return null;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (e.isFile() && e.name === 'demo_dataset.csv') return path.join(dir, e.name);
  }
  if (depth === 0) return null;
  for (const e of entries) {
    if (
      e.isDirectory() &&
      e.name !== 'node_modules' &&
      e.name !== '.git' &&
      e.name !== 'venv' &&
      e.name !== '.next'
    ) {
      const found = searchForDemo(path.join(dir, e.name), depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function findDemoDatasetPath(): string | null {
  const candidates = [
    process.env.DEMO_DATASET_PATH,
    path.join(__dirname, '..', '..', 'ml-engine', 'data', 'demo_dataset.csv'),
    path.join(__dirname, '..', 'ml-engine', 'data', 'demo_dataset.csv'),
    path.join(process.cwd(), 'ml-engine', 'data', 'demo_dataset.csv'),
    path.join(process.cwd(), '..', 'ml-engine', 'data', 'demo_dataset.csv'),
    '/opt/render/project/src/ml-engine/data/demo_dataset.csv',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return searchForDemo(process.cwd(), 5);
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
    const userId = (req.params.userId as string) || 'default_user';
    const userDir = path.join(uploadDir, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
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
apiV1.post('/workspace/:userId/dataset', (req, res) => {
  const { datasetId } = req.body;
  if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
  workspaceStore.setActiveDataset(req.params.userId, datasetId);
  res.json({ success: true, activeDatasetId: datasetId });
});

apiV1.get('/workspace/:userId', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.userId);
  res.json({ success: true, workspace });
});

// --------------------------------------------------
// Datasets
// --------------------------------------------------
apiV1.get('/datasets/:id/preview', (req, res) => {
  const dataset = datasetStore.getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

  const rows = parseInt(req.query.rows as string, 10) || 50;
  const results: any[] = [];
  let rowCount = 0;

  fs.createReadStream(dataset.filePath)
    .pipe(csv())
    .on('data', (data) => {
      if (rowCount < rows) results.push(data);
      rowCount++;
    })
    .on('end', () => res.json({ success: true, preview: results }))
    .on('error', () => res.status(500).json({ error: 'Failed to read preview' }));
});

apiV1.post('/datasets/demo/:userId', async (req, res) => {
  const userId = req.params.userId;
  const demoFile = findDemoDatasetPath();
  if (!demoFile) {
    return res.status(500).json({ success: false, error: 'Demo dataset is not available on the server.' });
  }

  const results: any[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(demoFile)
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

  datasetStore.saveDataset(datasetId, {
    id: datasetId,
    filename: 'manufacturing_data.csv',
    originalName: 'manufacturing_data.csv',
    filePath: demoFile,
    analytics,
  });

  workspaceStore.setActiveDataset(userId, datasetId);

  res.json({
    success: true,
    datasetId,
    filename: 'manufacturing_data.csv',
    preview: results,
    analytics,
  });
});

apiV1.post('/datasets/upload/:userId', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

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

        dashboardData.totalDatasets += 1;
        dashboardData.uploadedDatasets.push(req.file!.filename);
        dashboardData.recentActivity.unshift({
          title: `Dataset Uploaded: ${req.file!.originalname}`,
          time: 'Just now',
        });

        const datasetId = `ds_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const analytics = {
          totalRows,
          totalColumns,
          missingValues,
          numericColumns,
          categoricalColumns,
        };

        datasetStore.saveDataset(datasetId, {
          id: datasetId,
          filename: req.file!.filename,
          originalName: req.file!.originalname,
          filePath: req.file!.path,
          analytics,
        });

        workspaceStore.setActiveDataset(req.params.userId as string, datasetId);

    res.json({
      success: true,
      datasetId,
      filename: 'manufacturing_data.csv',
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
apiV1.post('/optimization/run', async (req, res) => {
  console.log('[optimization] Request body:', JSON.stringify(req.body).slice(0, 500));
  try {
    const { filename, template_id, intent, monthly_volume, unit_value } = req.body;

    if (!filename) {
      return res.status(400).json({ success: false, error: 'filename is required' });
    }

    let fileContent: string | null = null;
    let localPath = path.join(uploadDir, filename);

    const dataset = datasetStore.getDataset(filename);
    if (dataset) {
      localPath = dataset.filePath;
    } else if (filename === 'manufacturing_data.csv' || filename === 'demo_dataset.csv') {
      const dp = findDemoDatasetPath();
      if (dp) localPath = dp;
    }

    const resolvedPath = fs.existsSync(localPath) && fs.statSync(localPath).isFile()
      ? localPath
      : findFileInUploads(filename);

    if (resolvedPath) {
      fileContent = fs.readFileSync(resolvedPath).toString('base64');
      console.log(`[optimization] Loaded ${(fileContent.length / 1024).toFixed(1)} KB from ${resolvedPath}`);
    } else {
      console.log(`[optimization] File not found: ${filename}`);
    }

    if (!fileContent) {
      return res.status(400).json({
        success: false,
        error: `Dataset file not found on server: ${localPath}. Upload a fresh dataset or load the demo.`,
      });
    }

    const payload = {
      filename: dataset ? dataset.filename : filename,
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

    console.log(`[optimization] Sending to ${ML_ENGINE_URL}/optimize-yield, template=${payload.template_id}, target=${payload.target}`);

    const response = await axios.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
    });
    const result = response.data;

    console.log(`[optimization] ML engine response: success=${result?.success}, error=${result?.error}`);

    if (!result || !result.success) {
      return res.status(400).json({
        success: false,
        error: result?.error || 'Optimization failed',
        mlEngineResponse: result,
      });
    }

    const id = `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    optimizationData.save(id, { id, filename: payload.filename, template_id: payload.template_id, result });

    dashboardData.recentActivity.unshift({
      title: `Optimization run: ${result.display_name || 'Yield'}`,
      time: 'Just now',
    });

    res.json({ success: true, id, result });
  } catch (error: any) {
    console.error('[optimization] Error:', error);
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Optimization failed';
    res.status(500).json({
      success: false,
      error: message,
      details: error.response?.data || null,
    });
  }
});

// ==================================================
// Optimization — ASYNC JOB PATTERN
// The ML engine can take 20-60s+ (and >30s on a cold start). We never block the
// HTTP response on that work: we create a job, run the ML call in the background
// (with a generous/no timeout), and the client polls /optimization/jobs/:id.
// ==================================================
interface OptJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
}
const optimizationJobs = new Map<string, OptJob>();

function resolveOptimizationFile(filename: string): { localPath: string; dataset: any } | null {
  let localPath = path.join(uploadDir, filename);
  const dataset = datasetStore.getDataset(filename);
  if (dataset) {
    localPath = dataset.filePath;
  } else if (filename === 'manufacturing_data.csv' || filename === 'demo_dataset.csv') {
    const dp = findDemoDatasetPath();
    if (dp) localPath = dp;
  }
  const resolvedPath =
    fs.existsSync(localPath) && fs.statSync(localPath).isFile()
      ? localPath
      : findFileInUploads(filename);
  if (!resolvedPath) return null;
  return { localPath: resolvedPath, dataset };
}

apiV1.post('/optimization/jobs', async (req, res) => {
  try {
    const { filename, template_id, intent, monthly_volume, unit_value } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'filename is required' });
    }

    const resolved = resolveOptimizationFile(filename);
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
    const job: OptJob = { id: jobId, status: 'running', createdAt: Date.now() };
    optimizationJobs.set(jobId, job);

    // Generous timeout so cold-start ML engine calls are not truncated.
    const jobTimeout = parseInt(process.env.JOB_TIMEOUT_MS || '180000', 10);

    (async () => {
      try {
        const response = await axios.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
          timeout: jobTimeout,
        });
        const result = response.data;
        if (result && result.success) {
          optimizationData.save(jobId, {
            id: jobId,
            filename: payload.filename,
            template_id: payload.template_id,
            result,
          });
          job.result = result;
          job.status = 'completed';
        } else {
          job.status = 'failed';
          job.error = result?.error || 'Optimization failed';
        }
      } catch (error: any) {
        job.status = 'failed';
        job.error =
          error.response?.data?.error || error.message || 'Optimization failed';
      }
    })();

    res.json({ success: true, jobId, status: 'running' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to start optimization' });
  }
});

apiV1.get('/optimization/jobs/:id', (req, res) => {
  const job = optimizationJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Optimization job not found' });
  }
  res.json({ success: true, id: job.id, status: job.status, result: job.result, error: job.error });
});

// Lightweight endpoint a cron/UptimeRobot can hit to keep the ML engine warm.
apiV1.get('/warmup', async (req, res) => {
  try {
    const r = await axios.get(`${ML_ENGINE_URL}/`, { timeout: 5000 });
    res.json({ success: true, mlEngineStatus: r.status });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

apiV1.get('/optimization/:id/results', (req, res) => {
  const record = optimizationData.get(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: 'Optimization not found' });
  res.json({ success: true, ...record });
});

apiV1.get('/optimization/:id/report', (req, res) => {
  const record = optimizationData.get(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: 'Optimization not found' });
  res.json({ success: true, id: record.id, generated_at: new Date().toISOString(), report: record.result });
});

// --------------------------------------------------
// AI Goal Parsing (proxied to ML Engine)
// --------------------------------------------------
apiV1.post('/parse-goal', async (req, res) => {
  try {
    const response = await axios.post(`${ML_ENGINE_URL}/parse-goal`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.response?.data?.detail || error.message || 'Goal parsing failed',
      });
    }
});

// --------------------------------------------------
// QC Studio (proxied to ML Engine)
// --------------------------------------------------
const QC_ENDPOINTS = ['summary', 'control-chart', 'capability', 'acceptance-sampling'];

QC_ENDPOINTS.forEach((endpoint) => {
  apiV1.post(`/qc/${endpoint}`, async (req, res) => {
    try {
      const response = await axios.post(`${ML_ENGINE_URL}/qc/${endpoint}`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.response?.data?.detail || error.message || `QC ${endpoint} failed`,
      });
    }
  });
});

app.use('/api/v1', apiV1);

// ==================================================
// LEGACY ROUTES (kept for backward compatibility)
// ==================================================
app.post('/upload', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results: any[] = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        const totalRows = results.length;
        const totalColumns = Object.keys(results[0]).length;
        let missingValues = 0;
        const numericColumns: string[] = [];
        const categoricalColumns: string[] = [];

        Object.entries(results[0]).forEach(([key, value]) => {
          if (!isNaN(Number(value))) numericColumns.push(key);
          else categoricalColumns.push(key);
        });

        results.forEach((row) => {
          Object.values(row).forEach((value) => {
            if (value === null || value === undefined || value === '') missingValues++;
          });
        });

        dashboardData.totalDatasets += 1;
        dashboardData.uploadedDatasets.push(req.file!.filename);
        dashboardData.recentActivity.unshift({
          title: `Dataset Uploaded: ${req.file!.originalname}`,
          time: 'Just now',
        });

        res.json({
          message: 'CSV uploaded successfully',
          filename: req.file!.filename,
          preview: results.slice(0, 5),
          analytics: { totalRows, totalColumns, missingValues, numericColumns, categoricalColumns },
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'CSV processing failed' });
  }
});

app.post('/train', async (req, res) => {
  try {
    const { filename, target_column, algorithm } = req.body;
    const response = await axios.post(`${ML_ENGINE_URL}/train`, { filename, target_column, algorithm });
    const modelData = response.data;

    dashboardData.latestTrainingResult = modelData;
    dashboardData.activeModels += 1;
    dashboardData.averageAccuracy = modelData.accuracy;
    dashboardData.predictionsToday += modelData.testing_samples;
    dashboardData.modelAccuracy.push({ model: modelData.model_type, accuracy: modelData.accuracy });
    dashboardData.modelResults.push({
      model: modelData.model_type,
      accuracy: modelData.accuracy,
      mae: modelData.metrics.mae,
      rmse: modelData.metrics.rmse,
      r2: modelData.metrics.r2_score,
    });
    dashboardData.recentActivity.unshift({ title: `${modelData.model_type} Model Trained`, time: 'Just now' });

    res.json(modelData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Training failed' });
  }
});

app.get('/dashboard', (req, res) => {
  res.json(dashboardData);
});

app.get('/results', (req, res) => {
  res.json({ latestResult: dashboardData.latestTrainingResult });
});

// ==================================================
// SERVER
// ==================================================
app.listen(port, () => {
  console.log(`Backend service running on port ${port}`);
});
