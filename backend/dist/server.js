"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const datasets_routes_1 = __importDefault(require("./routes/datasets.routes"));
const datasetStore_1 = require("./data/datasetStore");
const optimizationStore_1 = require("./data/optimizationStore");
const workspaceStore_1 = require("./data/workspaceStore");
const dashboardData_1 = require("./data/dashboardData");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./middleware/auth");
const optimizationJobs_1 = require("./db/optimizationJobs");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://modliq.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zygjhjhtbanevzlasjmj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ML_INTERNAL_API_KEY = process.env.ML_INTERNAL_API_KEY || '';
function mlEngineHeaders() {
    const headers = {};
    if (ML_INTERNAL_API_KEY) {
        headers['X-Modliq-Service-Key'] = ML_INTERNAL_API_KEY;
    }
    return headers;
}
console.log(`[backend] ML_ENGINE_URL=${ML_ENGINE_URL}`);
console.log(`[backend] CLIENT_ORIGIN=${CLIENT_ORIGIN}`);
app.use((0, cors_1.default)({ origin: [CLIENT_ORIGIN, 'http://localhost:3000'] }));
app.use(express_1.default.json({ limit: '10mb' }));
app.set('trust proxy', true);
// ==================================================
// RATE LIMITING (simple in-memory sliding window)
// ==================================================
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '120', 10);
const rateLimitHits = new Map();
function rateLimit(req, res, next) {
    const key = req.user?.id || req.ip || 'anonymous';
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
// DATASETS (typed routes)
// ==================================================
app.use('/api/datasets', datasets_routes_1.default);
// ==================================================
// SERVER
// ==================================================
app.listen(port, () => {
    console.log(`Backend service running on port ${port}`);
});
// ==================================================
// STORAGE + HELPERS
// ==================================================
const isProduction = process.env.NODE_ENV === 'production';
const STORE_DIR = isProduction ? '/tmp/modliq' : path_1.default.join(process.cwd(), 'uploads');
const uploadDir = isProduction
    ? path_1.default.join(STORE_DIR, 'uploads')
    : path_1.default.join(__dirname, '../uploads');
function ensureDir() {
    try {
        if (!fs_1.default.existsSync(STORE_DIR)) {
            fs_1.default.mkdirSync(STORE_DIR, { recursive: true });
        }
    }
    catch (err) {
        console.error('Failed to create store directory:', err);
    }
}
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
function searchForDemo(dir, depth) {
    if (depth < 0)
        return null;
    let entries;
    try {
        entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return null;
    }
    for (const e of entries) {
        if (e.isFile() && e.name === 'demo_dataset.csv')
            return path_1.default.join(dir, e.name);
    }
    if (depth === 0)
        return null;
    for (const e of entries) {
        if (e.isDirectory() &&
            e.name !== 'node_modules' &&
            e.name !== '.git' &&
            e.name !== 'venv' &&
            e.name !== '.next') {
            const found = searchForDemo(path_1.default.join(dir, e.name), depth - 1);
            if (found)
                return found;
        }
    }
    return null;
}
function findDemoDatasetPath() {
    const candidates = [
        process.env.DEMO_DATASET_PATH,
        path_1.default.join(__dirname, '..', 'data', 'demo_dataset.csv'),
        path_1.default.join(process.cwd(), 'data', 'demo_dataset.csv'),
        path_1.default.join(__dirname, '..', '..', 'ml-engine', 'data', 'demo_dataset.csv'),
        path_1.default.join(process.cwd(), '..', 'ml-engine', 'data', 'demo_dataset.csv'),
    ].filter(Boolean);
    for (const c of candidates) {
        if (fs_1.default.existsSync(c) && fs_1.default.statSync(c).isFile())
            return c;
    }
    return searchForDemo(process.cwd(), 5);
}
function computeAnalyticsStatic(rows) {
    const totalRows = rows.length;
    if (totalRows === 0) {
        return { totalRows: 0, totalColumns: 0, missingValues: 0, numericColumns: [], categoricalColumns: [] };
    }
    const headers = Object.keys(rows[0]);
    const columnTypes = {};
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
function findFileInUploads(filename) {
    const directPath = path_1.default.join(uploadDir, filename);
    if (fs_1.default.existsSync(directPath) && fs_1.default.statSync(directPath).isFile()) {
        return directPath;
    }
    try {
        const entries = fs_1.default.readdirSync(uploadDir, { recursive: true });
        for (const entry of entries) {
            if (typeof entry !== 'string')
                continue;
            const fullPath = path_1.default.join(uploadDir, entry);
            if (path_1.default.basename(fullPath) === filename && fs_1.default.statSync(fullPath).isFile()) {
                return fullPath;
            }
        }
    }
    catch (err) {
        console.error('Failed to scan uploads directory:', err);
    }
    return null;
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.params.userId || 'default_user';
        const userDir = path_1.default.join(uploadDir, userId);
        if (!fs_1.default.existsSync(userDir))
            fs_1.default.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = (0, multer_1.default)({
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
const apiV1 = express_1.default.Router();
// --------------------------------------------------
// Workspace
// --------------------------------------------------
apiV1.post('/workspace/:userId/dataset', auth_1.verifySupabaseToken, (req, res) => {
    const { datasetId } = req.body;
    if (!datasetId)
        return res.status(400).json({ error: 'datasetId required' });
    workspaceStore_1.workspaceStore.setActiveDataset(req.params.userId, datasetId);
    res.json({ success: true, activeDatasetId: datasetId });
});
apiV1.get('/workspace/:userId', auth_1.verifySupabaseToken, (req, res) => {
    const workspace = workspaceStore_1.workspaceStore.getWorkspace(req.params.userId);
    res.json({ success: true, workspace });
});
// --------------------------------------------------
// Datasets
// --------------------------------------------------
apiV1.get('/datasets/:id/preview', auth_1.verifySupabaseToken, (req, res) => {
    const dataset = datasetStore_1.datasetStore.getDataset(req.params.id);
    if (!dataset)
        return res.status(404).json({ error: 'Dataset not found' });
    const rows = parseInt(req.query.rows, 10) || 50;
    const results = [];
    let rowCount = 0;
    fs_1.default.createReadStream(dataset.filePath)
        .pipe((0, csv_parser_1.default)())
        .on('data', (data) => {
        if (rowCount < rows)
            results.push(data);
        rowCount++;
    })
        .on('end', () => res.json({ success: true, preview: results, filename: dataset.filename, analytics: dataset.analytics }))
        .on('error', () => res.status(500).json({ error: 'Failed to read preview' }));
});
apiV1.post('/datasets/:id/health', auth_1.verifySupabaseToken, async (req, res) => {
    const dataset = datasetStore_1.datasetStore.getDataset(req.params.id);
    if (!dataset)
        return res.status(404).json({ error: 'Dataset not found' });
    const rows = [];
    try {
        await new Promise((resolve, reject) => {
            fs_1.default.createReadStream(dataset.filePath)
                .pipe((0, csv_parser_1.default)())
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
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/dataset-health`, mlPayload, {
            headers: mlEngineHeaders(),
        });
        res.json(response.data);
    }
    catch (err) {
        console.error('Health check error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to compute dataset health' });
    }
});
apiV1.post('/datasets/demo/:userId', auth_1.verifySupabaseToken, async (req, res) => {
    const userId = req.params.userId;
    const demoFile = findDemoDatasetPath();
    if (!demoFile) {
        return res.status(500).json({ success: false, error: 'Demo dataset is not available on the server.' });
    }
    const results = [];
    try {
        await new Promise((resolve, reject) => {
            fs_1.default.createReadStream(demoFile)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                if (results.length < 500)
                    results.push(data);
            })
                .on('end', () => resolve())
                .on('error', reject);
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to read demo dataset.' });
    }
    const analytics = computeAnalyticsStatic(results);
    const datasetId = `ds_demo_${Date.now()}`;
    datasetStore_1.datasetStore.saveDataset(datasetId, {
        id: datasetId,
        filename: 'manufacturing_data.csv',
        originalName: 'manufacturing_data.csv',
        filePath: demoFile,
        analytics,
    });
    workspaceStore_1.workspaceStore.setActiveDataset(userId, datasetId);
    res.json({
        success: true,
        datasetId,
        filename: 'manufacturing_data.csv',
        preview: results,
        analytics,
    });
});
apiV1.post('/datasets/upload/:userId', auth_1.verifySupabaseToken, upload.single('dataset'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        const results = [];
        let missingValues = 0;
        let totalRows = 0;
        let headers = [];
        let hasError = false;
        let columnTypes = {};
        let isFirstRow = true;
        fs_1.default.createReadStream(req.file.path)
            .pipe((0, csv_parser_1.default)())
            .on('headers', (headerList) => {
            headers = headerList;
            if (new Set(headers).size !== headers.length) {
                hasError = true;
                return res.status(400).json({ success: false, error: 'Duplicate column headers detected.' });
            }
        })
            .on('data', (data) => {
            if (hasError)
                return;
            if (totalRows < 5)
                results.push(data);
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
            }
            else {
                Object.entries(data).forEach(([key, value]) => {
                    if (columnTypes[key] === 'numeric' && value !== '' && isNaN(Number(value))) {
                        columnTypes[key] = 'categorical';
                    }
                });
            }
            Object.values(data).forEach((value) => {
                if (value === null || value === undefined || value === '')
                    missingValues++;
            });
        })
            .on('end', () => {
            if (hasError)
                return;
            if (totalRows === 0) {
                return res.status(400).json({ success: false, error: 'Empty CSV or CSV with only headers.' });
            }
            const totalColumns = headers.length;
            const numericColumns = Object.keys(columnTypes).filter(k => columnTypes[k] === 'numeric');
            const categoricalColumns = Object.keys(columnTypes).filter(k => columnTypes[k] === 'categorical');
            dashboardData_1.dashboardData.totalDatasets += 1;
            dashboardData_1.dashboardData.uploadedDatasets.push(req.file.filename);
            dashboardData_1.dashboardData.recentActivity.unshift({
                title: `Dataset Uploaded: ${req.file.originalname}`,
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
            datasetStore_1.datasetStore.saveDataset(datasetId, {
                id: datasetId,
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path,
                analytics,
            });
            workspaceStore_1.workspaceStore.setActiveDataset(req.params.userId, datasetId);
            res.json({
                success: true,
                datasetId,
                filename: 'manufacturing_data.csv',
                preview: results.slice(0, 500),
                analytics,
            });
        })
            .on('error', () => {
            if (!hasError)
                res.status(500).json({ success: false, error: 'CSV parsing failed' });
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});
// --------------------------------------------------
// Optimization
// --------------------------------------------------
function resolveOptimizationFile(filename) {
    let localPath = path_1.default.join(uploadDir, filename);
    const dataset = datasetStore_1.datasetStore.getDataset(filename);
    if (dataset) {
        localPath = dataset.filePath;
    }
    else if (filename === 'manufacturing_data.csv' || filename === 'demo_dataset.csv') {
        const dp = findDemoDatasetPath();
        if (dp)
            localPath = dp;
    }
    const resolvedPath = fs_1.default.existsSync(localPath) && fs_1.default.statSync(localPath).isFile()
        ? localPath
        : findFileInUploads(filename);
    if (!resolvedPath)
        return null;
    // Path traversal guard: ensure resolved path is within uploadDir
    const realUploadDir = fs_1.default.realpathSync(uploadDir);
    const realResolved = fs_1.default.realpathSync(resolvedPath);
    if (!realResolved.startsWith(realUploadDir)) {
        return null;
    }
    return { localPath: resolvedPath, dataset };
}
apiV1.post('/optimization/run', auth_1.verifySupabaseToken, rateLimit, async (req, res) => {
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
        const fileContent = fs_1.default.readFileSync(resolved.localPath).toString('base64');
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
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
            timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
            headers: mlEngineHeaders(),
        });
        const result = response.data;
        if (!result || !result.success) {
            return res.status(400).json({
                success: false,
                error: result?.error || 'Optimization failed',
                mlEngineResponse: result,
            });
        }
        const id = `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        optimizationStore_1.optimizationData.save(id, { id, filename: payload.filename, template_id: payload.template_id, result });
        dashboardData_1.dashboardData.recentActivity.unshift({
            title: `Optimization run: ${result.display_name || 'Yield'}`,
            time: 'Just now',
        });
        res.json({ success: true, id, result });
    }
    catch (error) {
        console.error('[optimization] Error:', error.message);
        const message = error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Optimization failed';
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
async function createOptimizationJobRecord(job) {
    await (0, optimizationJobs_1.createOptimizationJobDb)({
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
async function updateOptimizationJobRecord(id, data) {
    await (0, optimizationJobs_1.updateOptimizationJobDb)(id, data);
}
async function loadOptimizationJobsFromDb() {
    // Optimization jobs are now loaded on demand from Postgres via getOptimizationJobDb.
    // No bulk load needed at startup.
}
// Initialize durable job store on startup
(0, optimizationJobs_1.initDb)().catch((err) => {
    console.error('Failed to initialize optimization job database:', err);
});
apiV1.post('/optimization/jobs', auth_1.verifySupabaseToken, rateLimit, async (req, res) => {
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
        const fileContent = fs_1.default.readFileSync(resolved.localPath).toString('base64');
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
        const userId = req.user?.id || 'anonymous';
        const jobRecord = {
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
                const response = await axios_1.default.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
                    timeout: jobTimeout,
                    headers: mlEngineHeaders(),
                });
                const result = response.data;
                if (result && result.success) {
                    optimizationStore_1.optimizationData.save(jobId, {
                        id: jobId,
                        filename: payload.filename,
                        template_id: payload.template_id,
                        result,
                    });
                    await updateOptimizationJobRecord(jobId, {
                        status: 'completed',
                        resultJson: JSON.stringify(result),
                        progress: 100,
                    });
                }
                else {
                    await updateOptimizationJobRecord(jobId, {
                        status: 'failed',
                        error: result?.error || 'Optimization failed',
                    });
                }
            }
            catch (error) {
                await updateOptimizationJobRecord(jobId, {
                    status: 'failed',
                    error: error.response?.data?.error || error.message || 'Optimization failed',
                });
            }
        })();
        res.json({ success: true, jobId, status: 'running' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Failed to start optimization' });
    }
});
apiV1.get('/optimization/jobs/:id', auth_1.verifySupabaseToken, async (req, res) => {
    try {
        const record = await (0, optimizationJobs_1.getOptimizationJobDb)(req.params.id);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Failed to load job' });
    }
});
apiV1.get('/warmup', async (req, res) => {
    try {
        const r = await axios_1.default.get(`${ML_ENGINE_URL}/warmup`, { timeout: 5000 });
        res.json({ success: true, mlEngineStatus: r.status });
    }
    catch (error) {
        res.json({ success: false, error: error.message });
    }
});
apiV1.get('/optimization/:id/results', auth_1.verifySupabaseToken, (req, res) => {
    const record = optimizationStore_1.optimizationData.get(req.params.id);
    if (!record)
        return res.status(404).json({ success: false, error: 'Optimization not found' });
    res.json({ success: true, ...record });
});
apiV1.get('/optimization/:id/report', auth_1.verifySupabaseToken, (req, res) => {
    const record = optimizationStore_1.optimizationData.get(req.params.id);
    if (!record)
        return res.status(404).json({ success: false, error: 'Optimization not found' });
    res.json({ success: true, id: record.id, generated_at: new Date().toISOString(), report: record.result });
});
// --------------------------------------------------
// AI Goal Parsing (proxied to ML Engine)
// --------------------------------------------------
apiV1.post('/parse-goal', auth_1.verifySupabaseToken, rateLimit, async (req, res) => {
    try {
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/parse-goal`, req.body, {
            headers: mlEngineHeaders(),
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.response?.data?.detail || error.message || 'Goal parsing failed',
        });
    }
});
app.use('/api/v1', apiV1);
// ==================================================
// SERVER
// ==================================================
app.listen(port, () => {
    console.log(`Backend service running on port ${port}`);
});
//# sourceMappingURL=server.js.map