const express = require("express");

const cors = require("cors");

const uploadRoutes =
  require("./routes/upload.routes");

const trainRoutes =
  require("./routes/train.routes");

const dashboardRoutes =
  require("./routes/dashboard.routes");

const resultsRoutes =
require("./routes/results.routes");

const apiRoutes =
  require("./routes/api.routes");

const app = express();


// MIDDLEWARE
app.use(cors());

app.use(express.json());


// ROUTES
app.use("/", uploadRoutes);

app.use("/", trainRoutes);

app.use("/", dashboardRoutes);

app.use("/", resultsRoutes);

app.use("/api/v1", apiRoutes);


// TEST ROUTE
app.get("/", (req, res) => {

  res.send(
    "MODLIQ Backend Running"
  );

});


// SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
});