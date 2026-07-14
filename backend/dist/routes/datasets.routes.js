"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const UPLOADS_DIR = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({ storage });
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}
function computeMetadata(data) {
    const totalRows = data.length;
    if (totalRows === 0)
        return null;
    const totalColumns = Object.keys(data[0]).length;
    let missingValues = 0;
    const numericColumns = new Set();
    const categoricalColumns = new Set();
    const cols = Object.keys(data[0]);
    cols.forEach(col => {
        let isNumeric = false;
        let allNull = true;
        for (const row of data) {
            const val = row[col];
            if (val !== null && val !== undefined && val !== '') {
                allNull = false;
                if (!isNaN(Number(val))) {
                    isNumeric = true;
                }
                break;
            }
        }
        if (!allNull) {
            if (isNumeric)
                numericColumns.add(col);
            else
                categoricalColumns.add(col);
        }
    });
    data.forEach((row) => {
        Object.values(row).forEach((value) => {
            if (value === null || value === undefined || value === '') {
                missingValues++;
            }
        });
    });
    return {
        totalRows,
        totalColumns,
        missingValues,
        numericColumns: Array.from(numericColumns),
        categoricalColumns: Array.from(categoricalColumns),
    };
}
router.post('/upload', auth_1.verifySupabaseToken, upload.single('dataset'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const results = await parseCSV(req.file.path);
        const metadata = computeMetadata(results);
        if (!metadata || metadata.totalRows < 10) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({
                message: 'Dataset too small. Please upload a CSV with at least 10 rows, or try our demo dataset.',
                code: 'TOO_FEW_ROWS'
            });
        }
        if (metadata.numericColumns.length === 0) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({
                message: 'No numeric columns detected. Modliq requires numeric process data. Please try our demo dataset.',
                code: 'NO_NUMERIC_COLS'
            });
        }
        res.json({
            message: 'CSV uploaded successfully',
            datasetId: req.file.filename,
            preview: results.slice(0, 500),
            metadata,
        });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Failed to process CSV' });
    }
});
router.post('/demo', auth_1.verifySupabaseToken, async (req, res) => {
    try {
        const demoPath = path_1.default.join(__dirname, '../../../ml-engine/data/demo_dataset.csv');
        if (!fs_1.default.existsSync(demoPath)) {
            return res.status(500).json({ message: 'Demo dataset not generated yet.' });
        }
        const results = await parseCSV(demoPath);
        const metadata = computeMetadata(results);
        res.json({
            message: 'Demo dataset loaded',
            datasetId: 'demo_dataset.csv',
            preview: results.slice(0, 500),
            metadata,
        });
    }
    catch (error) {
        console.error('Demo Load Error:', error);
        res.status(500).json({ message: 'Failed to load demo dataset' });
    }
});
router.get('/:id/preview', auth_1.verifySupabaseToken, async (req, res) => {
    try {
        const { id } = req.params;
        let filePath;
        if (id === 'demo_dataset.csv') {
            filePath = path_1.default.join(__dirname, '../../../ml-engine/data/demo_dataset.csv');
        }
        else {
            filePath = path_1.default.join(UPLOADS_DIR, id);
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: 'Dataset not found' });
        }
        const results = await parseCSV(filePath);
        const metadata = computeMetadata(results);
        res.json({
            datasetId: id,
            preview: results.slice(0, 500),
            metadata,
        });
    }
    catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({ message: 'Failed to generate preview' });
    }
});
exports.default = router;
//# sourceMappingURL=datasets.routes.js.map