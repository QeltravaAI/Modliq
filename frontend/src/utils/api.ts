import { createClient } from './supabase/client';
import axios from 'axios';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim();

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (e) {
    // ignore
  }
  return {};
}

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(async (config) => {
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
