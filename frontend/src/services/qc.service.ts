import axios from "axios";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).trim();

export const runQcSummary = async (payload: {
  rows: Record<string, unknown>[];
  measurement_column: string;
  group_by?: string[];
}) => {
  const response = await axios.post(`${API_URL}/api/v1/qc/summary`, payload);
  return response.data;
};

export const runControlChart = async (payload: {
  chart_type: "imr" | "xbar_r" | "p";
  measurements?: number[];
  labels?: string[];
  subgroups?: number[][];
  subgroup_labels?: string[];
  defects?: number[];
  sample_sizes?: number[];
}) => {
  const response = await axios.post(
    `${API_URL}/api/v1/qc/control-chart`,
    payload
  );
  return response.data;
};

export const runCapabilityStudy = async (payload: {
  measurements: number[];
  lsl: number;
  usl: number;
  target?: number;
}) => {
  const response = await axios.post(`${API_URL}/api/v1/qc/capability`, payload);
  return response.data;
};

export const runAcceptanceSampling = async (payload: {
  lot_size: number;
  aql: number;
  inspection_level?: string;
  defects_found?: number;
}) => {
  const response = await axios.post(
    `${API_URL}/api/v1/qc/acceptance-sampling`,
    payload
  );
  return response.data;
};
