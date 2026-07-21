import axios from "axios";
import { API_URL } from "@/lib/config";

function authHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const token = localStorage.getItem("modliq_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const runQcSummary = async (payload: {
  rows: Record<string, unknown>[];
  measurement_column: string;
  group_by?: string[];
}) => {
  const response = await axios.post(`${API_URL}/api/v1/qc/summary`, payload, {
    headers: authHeaders(),
  });
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
  const response = await axios.post(`${API_URL}/api/v1/qc/control-chart`, payload, {
    headers: authHeaders(),
  });
  return response.data;
};

export const runCapabilityStudy = async (payload: {
  measurements: number[];
  lsl: number;
  usl: number;
  target?: number;
}) => {
  const response = await axios.post(`${API_URL}/api/v1/qc/capability`, payload, {
    headers: authHeaders(),
  });
  return response.data;
};

export const runAcceptanceSampling = async (payload: {
  lot_size: number;
  aql: number;
  inspection_level?: string;
  defects_found?: number;
}) => {
  const response = await axios.post(`${API_URL}/api/v1/qc/acceptance-sampling`, payload, {
    headers: authHeaders(),
  });
  return response.data;
};
