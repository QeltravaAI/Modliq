import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { verifySupabaseToken } from '../middleware/auth';

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function computeMetadata(data: any[]) {
  const totalRows = data.length;
  if (totalRows === 0) return null;
  
  const totalColumns = Object.keys(data[0]).length;
  let missingValues = 0;
  const numericColumns = new Set<string>();
  const categoricalColumns = new Set<string>();

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
      if (isNumeric) numericColumns.add(col);
      else categoricalColumns.add(col);
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

router.post('/upload', verifySupabaseToken, upload.single('dataset'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = await parseCSV(req.file.path);
    const metadata = computeMetadata(results);

    if (!metadata || metadata.totalRows < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: 'Dataset too small. Please upload a CSV with at least 10 rows, or try our demo dataset.',
        code: 'TOO_FEW_ROWS'
      });
    }

    if (metadata.numericColumns.length === 0) {
      fs.unlinkSync(req.file.path);
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
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Failed to process CSV' });
  }
});

router.post('/demo', verifySupabaseToken, async (req: any, res: any) => {
  try {
    const demoPath = path.join(__dirname, '../../../ml-engine/data/demo_dataset.csv');
    if (!fs.existsSync(demoPath)) {
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
  } catch (error) {
    console.error('Demo Load Error:', error);
    res.status(500).json({ message: 'Failed to load demo dataset' });
  }
});

router.get('/:id/preview', verifySupabaseToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    let filePath;
    if (id === 'demo_dataset.csv') {
       filePath = path.join(__dirname, '../../../ml-engine/data/demo_dataset.csv');
    } else {
       filePath = path.join(UPLOADS_DIR, id);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    const results = await parseCSV(filePath);
    const metadata = computeMetadata(results);

    res.json({
      datasetId: id,
      preview: results.slice(0, 500),
      metadata,
    });
  } catch (error) {
    console.error('Preview Error:', error);
    res.status(500).json({ message: 'Failed to generate preview' });
  }
});

export default router;
