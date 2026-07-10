import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_ML_URL || "http://localhost:8000";

export const trainModel = async (
  filename: string,
  targetColumn: string,
  algorithm: string,
  taskType: string,
  testSize: number,
  randomState: number,
  epochs: number,
  learningRate: number,
  validationStrategy: string,
  nEstimators?: number,
  maxDepth?: number
) => {

  try {

    const response = await axios.post(
      `${API_URL}/train`,
      {

        filename,

        target_column: targetColumn,

        algorithm,

        task_type: taskType,

        test_size: testSize,

        random_state: randomState,

        epochs,

        learning_rate: learningRate,

        validation_strategy: validationStrategy,

        n_estimators: nEstimators || 100,

        max_depth: maxDepth || null,
      }
    );

    return response.data;

  } catch (error: any) {

    console.log(
      "MODEL TRAINING ERROR:",
      error.response?.data
    );

    throw error;
  }
};