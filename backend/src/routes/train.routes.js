const express = require("express");

const axios = require("axios");

const dashboardData =
  require("../data/dashboardData");

const router = express.Router();


// TRAIN MODEL
router.post("/train", async (req, res) => {

  try {

    const {
      filename,
      target_column,
      algorithm
    } = req.body;

    // ML ENGINE CALL
    const response = await axios.post(
      process.env.ML_ENGINE_URL || "http://127.0.0.1:8000" + "/train",
      {
        filename,
        target_column,
        algorithm
      }
    );

    const modelData =
      response.data;


    // DASHBOARD UPDATE

    dashboardData.latestTrainingResult =
      modelData;

    dashboardData.activeModels += 1;

    dashboardData.averageAccuracy =
      modelData.accuracy;

    dashboardData.predictionsToday +=
      modelData.testing_samples;

    dashboardData.modelAccuracy.push({

      model:
        modelData.model_type,

      accuracy:
        modelData.accuracy

    });

    dashboardData.modelResults.push({

      model:
        modelData.model_type,

      accuracy:
        modelData.accuracy,

      mae:
        modelData.metrics.mae,

      rmse:
        modelData.metrics.rmse,

      r2:
        modelData.metrics.r2_score,

    });

    dashboardData.recentActivity.unshift({

      title:
        `${modelData.model_type} Model Trained`,

      time: "Just now"

    });

    // SEND RESPONSE
    res.json(modelData);

  } catch (error) {

    console.error(error);

    res.status(500).json({

      message:
        "Training failed"

    });
  }
});

module.exports = router;