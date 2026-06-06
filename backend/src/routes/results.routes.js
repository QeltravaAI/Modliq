const express = require("express");

const dashboardData =
require("../data/dashboardData");

const router = express.Router();

router.get("/results", (req, res) => {

  res.json({

    latestResult:
      dashboardData.latestTrainingResult,

  });

});

module.exports = router;