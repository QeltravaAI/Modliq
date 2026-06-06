const express = require("express");

const multer = require("multer");

const fs = require("fs");

const csv = require("csv-parser");

const dashboardData =
  require("../data/dashboardData");

const router = express.Router();


// STORAGE CONFIG
const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/");

  },

  filename: (req, file, cb) => {

    cb(
      null,
      Date.now() + "-" +
      file.originalname
    );

  },

});

const upload = multer({
  storage,
});


// UPLOAD ROUTE
router.post(

  "/upload",

  upload.single("dataset"),

  async (req, res) => {

    try {

      const results = [];

      fs.createReadStream(
        req.file.path
      )

        .pipe(csv())

        .on("data", (data) => {

          results.push(data);

        })

        .on("end", () => {

          const totalRows =
            results.length;

          const totalColumns =
            Object.keys(
              results[0]
            ).length;

          // Missing values
          let missingValues = 0;

          results.forEach((row) => {

            Object.values(row).forEach(
              (value) => {

                if (
                  value === null ||
                  value === undefined ||
                  value === ""
                ) {

                  missingValues++;

                }
              }
            );
          });

          // Detect column types
          const sampleRow =
            results[0];

          const numericColumns = [];

          const categoricalColumns = [];

          Object.entries(sampleRow)
            .forEach(([key, value]) => {

              if (
                !isNaN(Number(value))
              ) {

                numericColumns.push(key);

              } else {

                categoricalColumns.push(key);

              }
            });

          // DASHBOARD UPDATE
          dashboardData.totalDatasets += 1;

          dashboardData.uploadedDatasets.push(
            req.file.filename
          );

          dashboardData.recentActivity.unshift({

            title:
              `Dataset Uploaded: ${req.file.originalname}`,

            time: "Just now",

          });

          // RESPONSE
          res.json({

            message:
              "CSV uploaded successfully",

            filename:
              req.file.filename,

            preview:
              results.slice(0, 5),

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

      res.status(500).json({

        message:
          "CSV processing failed",

      });
    }
  }
);

module.exports = router;