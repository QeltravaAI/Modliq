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
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
console.log(`[backend] ML_ENGINE_URL=${ML_ENGINE_URL}`);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ==================================================
// DATASETS (typed routes)
// ==================================================
app.use('/api/datasets', datasets_routes_1.default);
// ==================================================
// HEALTH
// ==================================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'modliq-backend' });
});
// ==================================================
// STORAGE + HELPERS
// ==================================================
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
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
apiV1.post('/workspace/:userId/dataset', (req, res) => {
    const { datasetId } = req.body;
    if (!datasetId)
        return res.status(400).json({ error: 'datasetId required' });
    workspaceStore_1.workspaceStore.setActiveDataset(req.params.userId, datasetId);
    res.json({ success: true, activeDatasetId: datasetId });
});
apiV1.get('/workspace/:userId', (req, res) => {
    const workspace = workspaceStore_1.workspaceStore.getWorkspace(req.params.userId);
    res.json({ success: true, workspace });
});
// --------------------------------------------------
// Datasets
// --------------------------------------------------
apiV1.get('/datasets/:id/preview', (req, res) => {
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
        .on('end', () => res.json({ success: true, preview: results }))
        .on('error', () => res.status(500).json({ error: 'Failed to read preview' }));
});
apiV1.post('/datasets/demo/:userId', (req, res) => {
    const userId = req.params.userId;
    const demoFile = path_1.default.join(uploadDir, '..', '..', 'ml-engine', 'data', 'demo_dataset.csv');
    const datasetId = `ds_demo_${Date.now()}`;
    const analytics = {
        totalRows: 40,
        totalColumns: 5,
        missingValues: 0,
        numericColumns: ['yield', 'temperature', 'pressure', 'flow_rate'],
        categoricalColumns: ['batch_id'],
    };
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
        analytics,
    });
});
apiV1.post('/datasets/upload/:userId', upload.single('dataset'), async (req, res) => {
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
apiV1.post('/optimization/run', async (req, res) => {
    try {
        const { filename, template_id, intent, monthly_volume, unit_value } = req.body;
        if (!filename) {
            return res.status(400).json({ success: false, error: 'filename is required' });
        }
        let fileContent = null;
        let localPath = path_1.default.join(uploadDir, filename);
        const dataset = datasetStore_1.datasetStore.getDataset(filename);
        if (dataset) {
            localPath = dataset.filePath;
        }
        else if (filename === 'manufacturing_data.csv' || filename === 'demo_dataset.csv') {
            localPath = path_1.default.join(uploadDir, '..', '..', 'ml-engine', 'data', 'demo_dataset.csv');
        }
        console.log(`[optimization] filename=${filename}, localPath=${localPath}, datasetFound=${!!dataset}`);
        const fileStats = fs_1.default.existsSync(localPath) ? fs_1.default.statSync(localPath) : null;
        if (fileStats && fileStats.isFile()) {
            fileContent = fs_1.default.readFileSync(localPath).toString('base64');
            console.log(`[optimization] Loaded ${(fileContent.length / 1024).toFixed(1)} KB from ${localPath}`);
        }
        else {
            console.log(`[optimization] File not found or not a file: ${localPath}`);
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
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/optimize-yield`, payload, {
            timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
        });
        const result = response.data;
        if (!result || !result.success) {
            return res.status(400).json({
                success: false,
                error: result?.error || 'Optimization failed',
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
        console.error('Optimization run error:', error);
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
apiV1.get('/optimization/:id/results', (req, res) => {
    const record = optimizationStore_1.optimizationData.get(req.params.id);
    if (!record)
        return res.status(404).json({ success: false, error: 'Optimization not found' });
    res.json({ success: true, ...record });
});
apiV1.get('/optimization/:id/report', (req, res) => {
    const record = optimizationStore_1.optimizationData.get(req.params.id);
    if (!record)
        return res.status(404).json({ success: false, error: 'Optimization not found' });
    res.json({ success: true, id: record.id, generated_at: new Date().toISOString(), report: record.result });
});
// --------------------------------------------------
// AI Goal Parsing (proxied to ML Engine)
// --------------------------------------------------
apiV1.post('/parse-goal', async (req, res) => {
    try {
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/parse-goal`, req.body);
        res.json(response.data);
    }
    catch (error) {
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
            const response = await axios_1.default.post(`${ML_ENGINE_URL}/qc/${endpoint}`, req.body);
            res.json(response.data);
        }
        catch (error) {
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
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const results = [];
        fs_1.default.createReadStream(req.file.path)
            .pipe((0, csv_parser_1.default)())
            .on('data', (data) => results.push(data))
            .on('end', () => {
            const totalRows = results.length;
            const totalColumns = Object.keys(results[0]).length;
            let missingValues = 0;
            const numericColumns = [];
            const categoricalColumns = [];
            Object.entries(results[0]).forEach(([key, value]) => {
                if (!isNaN(Number(value)))
                    numericColumns.push(key);
                else
                    categoricalColumns.push(key);
            });
            results.forEach((row) => {
                Object.values(row).forEach((value) => {
                    if (value === null || value === undefined || value === '')
                        missingValues++;
                });
            });
            dashboardData_1.dashboardData.totalDatasets += 1;
            dashboardData_1.dashboardData.uploadedDatasets.push(req.file.filename);
            dashboardData_1.dashboardData.recentActivity.unshift({
                title: `Dataset Uploaded: ${req.file.originalname}`,
                time: 'Just now',
            });
            res.json({
                message: 'CSV uploaded successfully',
                filename: req.file.filename,
                preview: results.slice(0, 5),
                analytics: { totalRows, totalColumns, missingValues, numericColumns, categoricalColumns },
            });
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'CSV processing failed' });
    }
});
app.post('/train', async (req, res) => {
    try {
        const { filename, target_column, algorithm } = req.body;
        const response = await axios_1.default.post(`${ML_ENGINE_URL}/train`, { filename, target_column, algorithm });
        const modelData = response.data;
        dashboardData_1.dashboardData.latestTrainingResult = modelData;
        dashboardData_1.dashboardData.activeModels += 1;
        dashboardData_1.dashboardData.averageAccuracy = modelData.accuracy;
        dashboardData_1.dashboardData.predictionsToday += modelData.testing_samples;
        dashboardData_1.dashboardData.modelAccuracy.push({ model: modelData.model_type, accuracy: modelData.accuracy });
        dashboardData_1.dashboardData.modelResults.push({
            model: modelData.model_type,
            accuracy: modelData.accuracy,
            mae: modelData.metrics.mae,
            rmse: modelData.metrics.rmse,
            r2: modelData.metrics.r2_score,
        });
        dashboardData_1.dashboardData.recentActivity.unshift({ title: `${modelData.model_type} Model Trained`, time: 'Just now' });
        res.json(modelData);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Training failed' });
    }
});
app.get('/dashboard', (req, res) => {
    res.json(dashboardData_1.dashboardData);
});
app.get('/results', (req, res) => {
    res.json({ latestResult: dashboardData_1.dashboardData.latestTrainingResult });
});
// ==================================================
// SERVER
// ==================================================
app.listen(port, () => {
    console.log(`Backend service running on port ${port}`);
});
//# sourceMappingURL=server.js.map