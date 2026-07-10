const express = require("express");

const multer = require("multer");

const fs = require("fs");

const csv = require("csv-parser");

const axios = require("axios");

const { parseIntent } = require("../services/intentParser");

const { save, get } = require("../data/optimizationStore");

const dashboardData = require("../data/dashboardData");

const ML_ENGINE_URL =
  process.env.ML_ENGINE_URL || "http://127.0.0.1:8000";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ==================================================
// POST /api/v1/datasets/upload
// ==================================================
router.post(
  "/datasets/upload",
  upload.single("dataset"),
  async (req, res) => {
    try {
      const results = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          const totalRows = results.length;
          const totalColumns = Object.keys(results[0] || {}).length;

          let missingValues = 0;
          results.forEach((row) =>
            Object.values(row).forEach((value) => {
              if (value === null || value === undefined || value === "")
                missingValues++;
            })
          );

          const sampleRow = results[0] || {};
          const numericColumns = [];
          const categoricalColumns = [];

          Object.entries(sampleRow).forEach(([key, value]) => {
            if (!isNaN(Number(value))) numericColumns.push(key);
            else categoricalColumns.push(key);
          });

          dashboardData.totalDatasets += 1;
          dashboardData.uploadedDatasets.push(req.file.filename);
          dashboardData.recentActivity.unshift({
            title: `Dataset Uploaded: ${req.file.originalname}`,
            time: "Just now",
          });

          res.json({
            success: true,
            filename: req.file.filename,
            preview: results.slice(0, 5),
            analytics: {
              totalRows,
              totalColumns,
              missingValues,
              numericColumns,
              categoricalColumns,
            },
          });
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  }
);

// ==================================================
// POST /api/v1/intent/parse
// ==================================================
router.post("/intent/parse", (req, res) => {
  try {
    const { goal_text, template_id } = req.body;

    const intent = parseIntent(goal_text, template_id);

    if (!intent.success) {
      return res.status(400).json(intent);
    }

    res.json(intent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Intent parse failed" });
  }
});

// ==================================================
// POST /api/v1/optimization/run
// ==================================================
router.post("/optimization/run", async (req, res) => {
  try {
    const {
      filename,
      template_id,
      intent,
      monthly_volume,
      unit_value,
    } = req.body;

    if (!filename) {
      return res
        .status(400)
        .json({ success: false, error: "filename is required" });
    }

    const payload = {
      filename,
      template_id: template_id || "yield_optimizer",
      target: intent?.target,
      features: intent?.features && intent.features.length
        ? intent.features
        : undefined,
      goal_direction: intent?.goal_direction || "maximize",
      threshold: intent?.threshold,
      constraints: intent?.constraints,
      monthly_volume: monthly_volume || undefined,
      unit_value: unit_value || undefined,
    };

    const response = await axios.post(
      `${ML_ENGINE_URL}/optimize-yield`,
      payload
    );

    const result = response.data;

    const id =
      "opt_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    save(id, { id, filename, template_id: payload.template_id, result });

    dashboardData.recentActivity.unshift({
      title: `Optimization run: ${result.display_name || "Yield"}`,
      time: "Just now",
    });

    res.json({ success: true, id, result });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || "Optimization failed",
    });
  }
});

// ==================================================
// GET /api/v1/optimization/:id/results
// ==================================================
router.get("/optimization/:id/results", (req, res) => {
  const record = get(req.params.id);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, error: "Optimization not found" });
  }

  res.json({ success: true, ...record });
});

// ==================================================
// GET /api/v1/optimization/:id/report
// ==================================================
router.get("/optimization/:id/report", (req, res) => {
  const record = get(req.params.id);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, error: "Optimization not found" });
  }

  res.json({
    success: true,
    id: record.id,
    generated_at: new Date().toISOString(),
    report: record.result,
  });
});

module.exports = router;
