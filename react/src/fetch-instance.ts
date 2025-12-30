export const INSTANCE = {
  baseURL: "https://localhost:6443",
  headers: {
    Authorization: "Bearer secret-token",
  },
};

export const customInstance = <T>(config: {
  url: string;
  method: string;
  params?: any;
  data?: any;
  headers?: any;
  signal?: AbortSignal;
}): Promise<T> => {
  const url = `${INSTANCE.baseURL}${config.url}`;

  const options: RequestInit = {
    method: config.method,
    headers: {
      "Content-Type": "application/json",
      ...INSTANCE.headers,
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
