/**
 * HTTP Interceptor for K8s Web Angular client
 * Adds base URL and authentication headers to all requests
 */
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { K8S_CLIENT_CONFIG, K8sClientConfig } from './config';

/**
 * HTTP interceptor that adds base URL and authentication headers
 *
 * @example
 * ```typescript
 * import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
 * import { K8sClientInterceptor, K8S_CLIENT_CONFIG } from '@k8s-web/angular';
 *
 * // In your app configuration
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(),
 *     {
 *       provide: HTTP_INTERCEPTORS,
 *       useClass: K8sClientInterceptor,
 *       multi: true,
 *     },
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
@Injectable()
export class K8sClientInterceptor implements HttpInterceptor {
  constructor(@Inject(K8S_CLIENT_CONFIG) private config: K8sClientConfig) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only intercept relative URLs (generated K8s API calls)
    if (req.url.startsWith('/')) {
      if (!this.config.baseURL) {
        throw new Error(
          'K8s client not configured. Provide K8S_CLIENT_CONFIG with baseURL in your app providers.'
        );
      }

      // Build headers
      const headers: Record<string, string> = {};

      // Add token if provided
      if (this.config.token) {
        headers['Authorization'] = `Bearer ${this.config.token}`;
      }

      // Add custom headers
      if (this.config.headers) {
        Object.assign(headers, this.config.headers);
      }

      // Use URL class to properly combine baseURL and path (handles trailing slashes)
      const url = new URL(req.url, this.config.baseURL);

      // Clone request with modified URL and headers
      const clonedReq = req.clone({
        url: url.toString(),
        setHeaders: headers,
      });

      return next.handle(clonedReq);
    }

    // Pass through non-K8s requests unchanged
    return next.handle(req);
  }
}
