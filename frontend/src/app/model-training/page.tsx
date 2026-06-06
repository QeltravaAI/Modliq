"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import PredictionChart from "@/components/charts/PredictionChart";
import FeatureImportance from "@/components/ml/FeatureImportance";
import PerformanceMetrics from "@/components/ml/PerformanceMetrics";

import { getDashboardStats } from "@/services/dashboard.services";
import { trainModel } from "@/services/train.service";

import {
  useModelResultStore
} from "@/store/modelResultStore";

export default function ModelTrainingPage() {

  // =========================
  // STEP STATE
  // =========================
  const {
  setModelResult
} = useModelResultStore(); 

  const [currentStep, setCurrentStep] =
    useState(1);

  // =========================
  // TASK TYPE
  // =========================
  const [taskType, setTaskType] =
    useState("");

  // =========================
  // DATASET STATE
  // =========================
  const [datasets, setDatasets] =
    useState<any[]>([]);

  const [selectedDataset,
    setSelectedDataset] =
    useState("");

  const [targetColumn,
    setTargetColumn] =
    useState("");

  const [validationStrategy,
    setValidationStrategy] =
    useState("K-Fold Cross Validation");

  // =========================
  // ALGORITHM
  // =========================
  const [selectedAlgorithm,
    setSelectedAlgorithm] =
    useState("");

  // =========================
  // HYPERPARAMETERS
  // =========================
  const [testSize, setTestSize] =
    useState(20);

  const [randomState,
    setRandomState] =
    useState(42);

  const [epochs, setEpochs] =
    useState(100);

  const [learningRate,
    setLearningRate] =
    useState(0.01);

  // =========================
  // TRAINING
  // =========================
  const [isTraining,
    setIsTraining] =
    useState(false);

  const [progress,
    setProgress] =
    useState(0);

  const [status,
    setStatus] =
    useState("Idle");

  const [trainingResult,
    setTrainingResult] =
    useState<any>(null);

  const [nEstimators, setNEstimators] = useState(100);
  const [maxDepth, setMaxDepth] = useState<number | undefined>();

  // =========================
  // FETCH DATASETS
  // =========================
  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {

    try {

      const data =
        await getDashboardStats();

      setDatasets(
        data?.uploadedDatasets || []
      );

    } catch (error) {

      console.log(error);
    }
  };

  // =========================
  // NEXT STEP
  // =========================
  const nextStep = () => {

    if (currentStep < 4) {

      setCurrentStep(
        currentStep + 1
      );
    }
  };

  // =========================
  // PREVIOUS STEP
  // =========================
  const prevStep = () => {

    if (currentStep > 1) {

      setCurrentStep(
        currentStep - 1
      );
    }
  };

  // =========================
  // TRAIN MODEL
  // =========================
  const handleTraining =
    async () => {

      try {

        setIsTraining(true);

        setProgress(10);

        setStatus(
          "Loading Dataset..."
        );

        const timer1 =
          setTimeout(() => {

            setProgress(30);

            setStatus(
              "Preprocessing Dataset..."
            );

          }, 1000);

        const timer2 =
          setTimeout(() => {

            setProgress(60);

            setStatus(
              "Training ML Model..."
            );

          }, 2000);

        const timer3 =
          setTimeout(async () => {

            setProgress(85);

            setStatus(
              "Generating Metrics..."
            );

            const response =
              await trainModel(
                selectedDataset,
                targetColumn,
                selectedAlgorithm,
                taskType,
                testSize,
                randomState,
                epochs,
                learningRate,
                validationStrategy,
                100,
                undefined
              );
            console.log("FULL RESPONSE:", response);

            console.log("SUCCESS:", response.success);

            console.log("METRICS:", response.metrics);

            console.log("FEATURES:", response.features_used);

            setTrainingResult(
              response
            );

            setModelResult(response);

            console.log("Saved to Zustand Store"); 
            console.log("Stored Result:", response);

            console.log(
              "SUCCESS:",
               response.success
            );

            console.log(
              "FEATURES:",
              response.features_used
            );

            console.log(
             "METRICS:",
             response.metrics
            );

            setProgress(100);

            setStatus(
              "Training Completed Successfully"
            );

          }, 3000);

      } catch (error) {

        console.log(error);

        setStatus(
          "Training Failed"
        );

      } finally {

        setIsTraining(false);
      }
    };

  return (

    <div className="flex bg-gray-100 min-h-screen">

      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1">

        {/* Navbar */}
        <Navbar />

        <div className="p-8">

          {/* HEADING */}
          <div className="mb-8">

            <h1 className="text-4xl font-bold text-gray-900">
              Model Training Wizard
            </h1>

            <p className="text-gray-600 mt-2 text-lg">
              Configure, train, and monitor your ML model step-by-step
            </p>

          </div>

          {/* STEP INDICATOR */}
          <div className="flex items-center gap-6 mb-10">

            {[1, 2, 3, 4].map(
              (step) => (

                <div
                  key={step}
                  className="flex items-center gap-3"
                >

                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                    ${
                      currentStep >= step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                  >
                    {step}
                  </div>

                  <span className="font-medium text-gray-700">
                    {
                      [
                        "Task & Data",
                        "Algorithm",
                        "Hyperparameters",
                        "Train & Monitor",
                      ][step - 1]
                    }
                  </span>

                </div>
              )
            )}
          </div>

          {/* ========================= */}
          {/* STEP 1 */}
          {/* ========================= */}
          {currentStep === 1 && (

            <div className="bg-white rounded-2xl border p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Task Type
              </h2>

              {/* TASK CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {[
                  {
                    title: "Classification",
                    desc: "Predict categories",
                  },
                  {
                    title: "Regression",
                    desc: "Predict numeric values",
                  },
                  {
                    title: "Clustering",
                    desc: "Group similar records",
                  },
                  {
                    title: "Anomaly Detection",
                    desc: "Find outliers",
                  },
                ].map((task) => (

                  <div
                    key={task.title}
                    onClick={() =>
                      setTaskType(
                        task.title
                      )
                    }
                    className={`p-6 rounded-2xl border cursor-pointer transition
                    ${
                      taskType === task.title
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >

                    <h3 className="text-xl font-bold text-gray-900">
                      {task.title}
                    </h3>

                    <p className="text-gray-600 mt-2">
                      {task.desc}
                    </p>

                  </div>
                ))}
              </div>

              {/* DATASET */}
              <div className="mt-10">

                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Dataset and Target
                </h2>

                <div className="space-y-6">

                  {/* DATASET */}
                  <div>

                    <label className="block text-gray-700 font-semibold mb-2">
                      Dataset
                    </label>

                    <select
                      value={selectedDataset}
                      onChange={(e) =>
                        setSelectedDataset(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-4 text-gray-900"
                    >

                      <option value="">
                        -- Select Dataset --
                      </option>

                      {datasets.map(
                        (
                          dataset,
                          index
                        ) => (

                          <option
                            key={index}
                            value={dataset}
                          >
                            {dataset}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  {/* TARGET */}
                  <div>

                    <label className="block text-gray-700 font-semibold mb-2">
                      Target Column
                    </label>

                    <input
                      type="text"
                      value={targetColumn}
                      onChange={(e) =>
                        setTargetColumn(
                          e.target.value
                        )
                      }
                      placeholder="Enter target column"
                      className="w-full border border-gray-300 rounded-xl p-4 text-gray-900"
                    />

                  </div>

                  {/* VALIDATION */}
                  <div>

                    <label className="block text-gray-700 font-semibold mb-2">
                      Validation Strategy
                    </label>

                    <select
                      value={validationStrategy}
                      onChange={(e) =>
                        setValidationStrategy(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-4 text-gray-900"
                    >

                      <option>
                        K-Fold Cross Validation
                      </option>

                      <option>
                        Train/Test Split
                      </option>

                    </select>

                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ========================= */}
          {/* STEP 2 */}
          {/* ========================= */}
          {currentStep === 2 && (

            <div className="bg-white rounded-2xl border p-8 shadow-sm">

              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Algorithm Selection
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* REGRESSION */}
                {taskType ===
                  "Regression" && (
                  <>
                    {[
                      "Linear Regression",
                      "Decision Tree",
                      "Random Forest",
                    ].map((algo) => (

                      <div
                        key={algo}
                        onClick={() =>
                          setSelectedAlgorithm(
                            algo
                          )
                        }
                        className={`p-6 rounded-2xl border cursor-pointer transition
                        ${
                          selectedAlgorithm === algo
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >

                        <h3 className="text-xl font-bold text-gray-900">
                          {algo}
                        </h3>

                      </div>
                    ))}
                  </>
                )}

                {/* CLASSIFICATION */}
                {taskType ===
                  "Classification" && (
                  <>
                    {[
                      "Logistic Regression",
                      "Random Forest",
                    ].map((algo) => (

                      <div
                        key={algo}
                        onClick={() =>
                          setSelectedAlgorithm(
                            algo
                          )
                        }
                        className={`p-6 rounded-2xl border cursor-pointer transition
                        ${
                          selectedAlgorithm === algo
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >

                        <h3 className="text-xl font-bold text-gray-900">
                          {algo}
                        </h3>

                      </div>
                    ))}
                  </>
                )}

              </div>

              {selectedAlgorithm && (

                <div className="mt-8 bg-blue-50 border border-blue-200 p-5 rounded-2xl">

                  <p className="text-lg font-semibold text-blue-800">
                    Selected Algorithm:
                    {" "}
                    {selectedAlgorithm}
                  </p>

                </div>
              )}

            </div>
          )}

          {/* ========================= */}
          {/* STEP 3 */}
          {/* ========================= */}
          {currentStep === 3 && (

            <div className="bg-white rounded-2xl border p-8 shadow-sm">

              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Hyperparameter Tuning
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div>

                  <label className="block mb-2 font-semibold text-gray-700">
                    Test Size (%)
                  </label>

                  <input
                    type="number"
                    value={testSize}
                    onChange={(e) =>
                      setTestSize(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full border rounded-xl p-4"
                  />

                </div>

                <div>

                  <label className="block mb-2 font-semibold text-gray-700">
                    Random State
                  </label>

                  <input
                    type="number"
                    value={randomState}
                    onChange={(e) =>
                      setRandomState(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full border rounded-xl p-4"
                  />

                </div>

                <div>

                  <label className="block mb-2 font-semibold text-gray-700">
                    Epochs
                  </label>

                  <input
                    type="number"
                    value={epochs}
                    onChange={(e) =>
                      setEpochs(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full border rounded-xl p-4"
                  />

                </div>

                <div>

                  <label className="block mb-2 font-semibold text-gray-700">
                    Learning Rate
                  </label>

                  <input
                    type="number"
                    step="0.001"
                    value={learningRate}
                    onChange={(e) =>
                      setLearningRate(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full border rounded-xl p-4"
                  />

                </div>

              </div>

            </div>
          )}

          {/* ========================= */}
          {/* STEP 4 */}
          {/* ========================= */}
          {currentStep === 4 && (

            <div className="space-y-6">

              {/* TRAIN CARD */}
              <div className="bg-white rounded-2xl border p-8 shadow-sm">

                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Train & Monitor
                </h2>

                <div className="space-y-6">

                  {/* PROGRESS */}
                  <div>

                    <p className="font-semibold text-gray-700 mb-2">
                      Training Progress
                    </p>

                    <div className="w-full bg-gray-200 rounded-full h-5">

                      <div
                        className="bg-blue-600 h-5 rounded-full transition-all duration-500"
                        style={{
                          width:
                            `${progress}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* STATUS */}
                  <div className="bg-gray-50 p-6 rounded-2xl border">

                    <p className="text-xl font-semibold text-gray-800">
                      {status}
                    </p>

                    <p className="text-gray-600 mt-2">
                      Progress:
                      {" "}
                      {progress}%
                    </p>

                  </div>

                  {/* TRAIN BUTTON */}
                  <button
                    onClick={
                      handleTraining
                    }
                    disabled={isTraining}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                  >
                    🚀 Start Training
                  </button>

                </div>

              </div>

              {/* RESULTS */}
              {trainingResult && (

                <>
                  {/* SUMMARY */}
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">

                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Model Training Result
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="bg-gray-50 p-5 rounded-xl border">
                        <h3 className="text-gray-600 font-semibold">
                          Model Type
                        </h3>

                        <p className="text-2xl font-bold text-black mt-2">
                          {trainingResult.model_type}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-xl border">
                        <h3 className="text-gray-600 font-semibold">
                          Accuracy
                        </h3>

                        <p className="text-2xl font-bold text-green-700 mt-2">
                          {trainingResult.accuracy}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-xl border">
                        <h3 className="text-gray-600 font-semibold">
                          Training Samples
                        </h3>

                        <p className="text-2xl font-bold text-blue-700 mt-2">
                          {trainingResult.training_samples}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-xl border">
                        <h3 className="text-gray-600 font-semibold">
                          Testing Samples
                        </h3>

                        <p className="text-2xl font-bold text-purple-700 mt-2">
                          {trainingResult.testing_samples}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* FEATURES */}
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">

                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Features Used
                    </h2>

                    <div className="flex flex-wrap gap-3">

                      {trainingResult.features_used?.map(
                        (
                          feature: string,
                          index: number
                        ) => (

                          <span
                            key={index}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium"
                          >
                            {feature}
                          </span>
                        )
                      )}

                    </div>

                  </div>

                  {/* CHARTS */}
                  {trainingResult.chart_data && (
                    <PredictionChart
                      data={
                        trainingResult.chart_data
                      }
                    />
                  )}

                  {trainingResult.feature_importance && (
                    <FeatureImportance
                      data={
                        trainingResult.feature_importance
                      }
                    />
                  )}

                  {trainingResult.metrics && (
                    <PerformanceMetrics
                      metrics={
                        trainingResult.metrics
                      }
                    />
                  )}

                </>
              )}

            </div>
          )}

          {/* NAVIGATION */}
          <div className="flex justify-between mt-10">

            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Back
            </button>

            <button
              onClick={nextStep}
              disabled={currentStep === 4}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              Next
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}