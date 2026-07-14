import { apiClient } from '@/utils/api';

export interface HealthCheckPayload {
  targetColumn?: string | null;
  features?: string[] | null;
  mode: 'generic' | 'target-aware';
}

export const getDatasetHealth = async (
  datasetId: string,
  payload: HealthCheckPayload
) => {
  const response = await apiClient.post(
    `/api/v1/datasets/${datasetId}/health`,
    payload
  );
  return response.data;
};

export const uploadDataset = async (
  file: File
) => {
  const formData = new FormData();
  formData.append('dataset', file);

  const response = await apiClient.post(
    '/api/v1/datasets/upload',
    formData,
    {
      headers: {
        'Content-Type':
          'multipart/form-data',
      },
    }
  );

  return response.data;
};
