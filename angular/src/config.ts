/**
 * Configuration for K8s Web Angular client
 */
import { InjectionToken } from '@angular/core';

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
}

/**
 * Default configuration
 * Note: baseURL must be provided via DI or environment variable
 */
export const DEFAULT_K8S_CONFIG: Partial<K8sClientConfig> = {
  token: undefined,
  headers: {},
};

/**
 * Injection token for K8s client configuration
 *
 * @example
 * ```typescript
 * import { K8S_CLIENT_CONFIG } from '@k8s-web/angular';
 *
 * // In your app module or standalone component
 * providers: [
 *   {
 *     provide: K8S_CLIENT_CONFIG,
 *     useValue: {
 *       baseURL: 'https://my-cluster.example.com',
 *       token: 'my-service-account-token',
 *     }
 *   }
 * ]
 * ```
 */
export const K8S_CLIENT_CONFIG = new InjectionToken<Partial<K8sClientConfig>>(
  'K8S_CLIENT_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_K8S_CONFIG,
  }
);
