import { getK8sClientConfig } from './config';

export const customInstance = <T>(config: {
  url: string;
  method: string;
  params?: any;
  data?: any;
  headers?: any;
  signal?: AbortSignal;
}): Promise<T> => {
  const clientConfig = getK8sClientConfig();
  // Use URL class to properly combine baseURL and path (handles trailing slashes)
  const url = new URL(config.url, clientConfig.baseURL).toString();

  // Build headers with token if provided
  const authHeaders: Record<string, string> = {};
  if (clientConfig.token) {
    authHeaders.Authorization = `Bearer ${clientConfig.token}`;
  }

  const options: RequestInit = {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...clientConfig.headers,
      ...config.headers,
    },
    signal: config.signal,
  };

  if (config.data) {
    options.body = JSON.stringify(config.data);
  }

  // Handle query params
  let fullUrl = url;
  if (config.params) {
    const searchParams = new URLSearchParams();
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }
  }

  return fetch(fullUrl, options).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
  });
};

export default customInstance;
