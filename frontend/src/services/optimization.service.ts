import { apiClient } from '@/utils/api';

export const parseGoal = async (goal_text: string, template_id: string, columns: string[]) => {
  const response = await apiClient.post('/api/v1/parse-goal', {
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
  const response = await apiClient.post('/api/v1/optimization/run', payload);
  return response.data;
};

export const createOptimizationJob = async (payload: {
  filename: string;
  template_id?: string;
  intent: any;
  monthly_volume?: number;
  unit_value?: number;
}) => {
  const response = await apiClient.post('/api/v1/optimization/jobs', payload);
  return response.data;
};

export const getOptimizationJob = async (jobId: string) => {
  const response = await apiClient.get(`/api/v1/optimization/jobs/${jobId}`);
  return response.data;
};

export const getOptimizationResults = async (id: string) => {
  const response = await apiClient.get(`/api/v1/optimization/${id}/results`);
  return response.data;
};

export const getOptimizationReport = async (id: string) => {
  const response = await apiClient.get(`/api/v1/optimization/${id}/report`);
  return response.data;
};
