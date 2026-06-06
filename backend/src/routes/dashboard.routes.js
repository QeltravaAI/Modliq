const express = require("express");

const dashboardData =
  require("../data/dashboardData");

const router = express.Router();


// GET DASHBOARD DATA
router.get("/dashboard", (req, res) => {

  res.json(dashboardData);

});

module.exports = router;