/**
 * HTTP Interceptor for K8s Web Angular client
 * Adds base URL and authentication headers to all requests
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { K8S_CLIENT_CONFIG } from './config';

/**
 * HTTP interceptor that adds base URL and authentication headers
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { k8sClientInterceptor, K8S_CLIENT_CONFIG } from '@k8s-web/angular';
 *
 * // In your app configuration
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([k8sClientInterceptor])
 *     ),
 *     {
 *       provide: K8S_CLIENT_CONFIG,
 *       useValue: {
 *         baseURL: 'https://my-cluster.example.com',
 *         token: 'my-service-account-token',
 *       }
 *     }
 *   ]
 * };
 * ```
 */
export const k8sClientInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(K8S_CLIENT_CONFIG);

  // Only intercept relative URLs (generated K8s API calls)
  if (req.url.startsWith('/')) {
    if (!config.baseURL) {
      throw new Error(
        'K8s client not configured. Provide K8S_CLIENT_CONFIG with baseURL in your app providers.'
      );
    }

    // Build headers
    const headers: Record<string, string> = {};

    // Add token if provided
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    // Add custom headers
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    // Clone request with modified URL and headers
    const clonedReq = req.clone({
      url: `${config.baseURL}${req.url}`,
      setHeaders: headers,
    });

    return next(clonedReq);
  }

  // Pass through non-K8s requests unchanged
  return next(req);
};
