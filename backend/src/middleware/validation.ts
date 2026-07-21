import { Request, Response, NextFunction } from 'express';

export function sanitizeString(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  return input.trim().replace(/[<>]/g, '');
}

export function validateDatasetUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { originalname, size, mimetype } = req.file;
  if (!originalname.toLowerCase().endsWith('.csv')) {
    return res.status(400).json({ success: false, error: 'Only CSV files are allowed' });
  }
  if ((size ?? 0) > 50 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: 'File exceeds maximum allowed size' });
  }
  if (!['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'].includes(mimetype || '')) {
    return res.status(400).json({ success: false, error: 'Invalid file type' });
  }

  next();
}

export function validateGoalRequest(req: Request, res: Response, next: NextFunction) {
  const { goal_text, template_id, columns } = req.body || {};

  if (!goal_text || typeof goal_text !== 'string' || goal_text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'goal_text is required' });
  }
  if (goal_text.length > 5000) {
    return res.status(400).json({ success: false, error: 'goal_text exceeds maximum length' });
  }

  const sanitizedTemplate = sanitizeString(template_id);
  if (!sanitizedTemplate) {
    return res.status(400).json({ success: false, error: 'template_id is required' });
  }

  if (!Array.isArray(columns)) {
    return res.status(400).json({ success: false, error: 'columns must be an array' });
  }

  req.body = {
    goal_text: goal_text.trim(),
    template_id: sanitizedTemplate,
    columns: columns.map((c: unknown) => sanitizeString(c)).filter(Boolean),
  };

  next();
}
