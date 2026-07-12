import axios from "axios";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").trim();

export const parseGoal = async (goal_text: string, template_id: string, columns: string[]) => {
  const response = await axios.post(`${API_URL}/api/v1/parse-goal`, {
    goal_text,
    template_id,
    columns,
  });
  return response.data;
};

export const runOptimization = async (payload: {
  filename: string;
  template_id?: string;
  intent: any;
  monthly_volume?: number;
  unit_value?: number;
}) => {
  const response = await axios.post(`${API_URL}/api/v1/optimization/run`, payload);
  return response.data;
};

export const getOptimizationResults = async (id: string) => {
  const response = await axios.get(`${API_URL}/api/v1/optimization/${id}/results`);
  return response.data;
};

export const getOptimizationReport = async (id: string) => {
  const response = await axios.get(`${API_URL}/api/v1/optimization/${id}/report`);
  return response.data;
};
