/**
 * Configuration for K8s Web React client
 */

export interface K8sClientConfig {
  /**
   * Base URL for the Kubernetes API server
   * @example 'https://my-cluster.example.com'
   */
  baseURL: string;

  /**
   * Authentication token for Bearer token authentication
   * @default undefined
   */
  token?: string;

  /**
   * Custom headers to include in all requests
   * @default {}
   */
  headers?: Record<string, string>;

  /**
   * Whether to reject unauthorized SSL certificates
   * Note: This is only relevant in Node.js environments
   * @default false (allows self-signed certs in development)
   */
  rejectUnauthorized?: boolean;
}

// Internal configuration state
interface InternalConfig {
  baseURL: string;
  token: string;
  headers: Record<string, string>;
  rejectUnauthorized: boolean;
  configured: boolean;
}

// Initialize from environment variables if available
const envBaseURL = typeof process !== 'undefined' ? process.env?.K8S_API_URL : undefined;
const envToken = typeof process !== 'undefined' ? process.env?.K8S_API_TOKEN : undefined;

// Current active configuration
let activeConfig: InternalConfig = {
  baseURL: envBaseURL || '',
  token: envToken || '',
  headers: {},
  rejectUnauthorized: false,
  configured: !!envBaseURL,
};

/**
 * Configure the K8s client globally
 *
 * @example
 * ```typescript
 * import { configureK8sClient } from '@k8s-web/react';
 *
 * // Configure with bearer token
 * configureK8sClient({
 *   baseURL: 'https://my-cluster.example.com',
 *   token: 'my-service-account-token',
 * });
 *
 * // Configure with custom headers
 * configureK8sClient({
 *   baseURL: 'https://my-cluster.example.com',
 *   headers: {
 *     'Authorization': 'Bearer my-token',
 *     'X-Custom-Header': 'value',
 *   },
 * });
 * ```
 */
export function configureK8sClient(config: Partial<K8sClientConfig> & { baseURL: string }): void {
  activeConfig.baseURL = config.baseURL;
  activeConfig.configured = true;

  if (config.token !== undefined) {
    activeConfig.token = config.token;
  }

  if (config.headers !== undefined) {
    activeConfig.headers = { ...config.headers };
  }

  if (config.rejectUnauthorized !== undefined) {
    activeConfig.rejectUnauthorized = config.rejectUnauthorized;
  }
}

/**
 * Get the current active configuration
 * @internal
 * @throws {Error} If baseURL has not been configured
 */
export function getK8sClientConfig(): Required<K8sClientConfig> {
  if (!activeConfig.configured) {
    throw new Error(
      'K8s client not configured. Call configureK8sClient({ baseURL: "..." }) before making API calls, or set K8S_API_URL environment variable.'
    );
  }

  return {
    baseURL: activeConfig.baseURL,
    token: activeConfig.token,
    headers: activeConfig.headers,
    rejectUnauthorized: activeConfig.rejectUnauthorized,
  };
}

/**
 * Reset configuration to initial state
 * @internal
 */
export function resetK8sClientConfig(): void {
  activeConfig = {
    baseURL: envBaseURL || '',
    token: envToken || '',
    headers: {},
    rejectUnauthorized: false,
    configured: !!envBaseURL,
  };
}
