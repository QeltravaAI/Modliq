import axios from 'axios';
import { verifyJwt, getAuthFromHeaders } from '@/lib/auth';
import { API_URL } from '@/lib/config';

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof document === 'undefined') {
    return {};
  }
  const token = localStorage.getItem('modliq_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(async (config: any) => {
  const headers = await getAuthHeaders();
  Object.assign(config.headers, headers);
  return config;
});

export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...headers,
    } as HeadersInit,
  });
}
