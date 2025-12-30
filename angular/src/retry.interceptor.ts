/**
 * HTTP Interceptor for retry logic
 * Retries failed requests with exponential backoff for transient errors
 */
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Injectable, InjectionToken, Optional, Inject, Provider } from '@angular/core';
import { Observable, retry, timer } from 'rxjs';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between retries
   * @default 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * HTTP status codes that should trigger a retry
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Injection token for retry configuration
 */
export const K8S_RETRY_CONFIG = new InjectionToken<RetryConfig>('K8S_RETRY_CONFIG');

/**
 * HTTP interceptor that retries failed requests with exponential backoff
 *
 * @example
 * ```typescript
 * import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
 * import { K8sClientInterceptor, K8sRetryInterceptor, K8S_RETRY_CONFIG } from '@k8s-web/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(),
 *     {
 *       provide: HTTP_INTERCEPTORS,
 *       useClass: K8sClientInterceptor,
 *       multi: true,
 *     },
 *     {
 *       provide: HTTP_INTERCEPTORS,
 *       useClass: K8sRetryInterceptor,
 *       multi: true,
 *     },
 *     // Optional: Override default retry config
 *     {
 *       provide: K8S_RETRY_CONFIG,
 *       useValue: {
 *         maxRetries: 5,
 *         initialDelay: 2000,
 *       }
 *     }
 *   ]
 * };
 * ```
 */
@Injectable()
export class K8sRetryInterceptor implements HttpInterceptor {
  private readonly retryConfig: Required<RetryConfig>;

  constructor(@Optional() @Inject(K8S_RETRY_CONFIG) config?: RetryConfig) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      retry({
        count: this.retryConfig.maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Only retry on retryable status codes
          if (!this.retryConfig.retryableStatusCodes.includes(error.status)) {
            throw error;
          }

          // Only retry K8s API requests (relative URLs we transformed)
          if (!req.url.startsWith('http') || !req.url.includes('/api/')) {
            throw error;
          }

          // Calculate exponential backoff delay
          const delay = Math.min(
            this.retryConfig.initialDelay *
              Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1),
            this.retryConfig.maxDelay
          );

          console.warn(
            `Retrying request to ${req.url} (attempt ${retryCount}/${this.retryConfig.maxRetries}) after ${delay}ms`
          );

          return timer(delay);
        },
      })
    );
  }
}

/**
 * Provide K8sRetryInterceptor with custom configuration
 *
 * @example
 * ```typescript
 * import { provideHttpClient } from '@angular/common/http';
 * import { provideK8sRetryInterceptor } from '@k8s-web/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(),
 *     provideK8sRetryInterceptor({
 *       maxRetries: 5,
 *       initialDelay: 2000,
 *     }),
 *   ]
 * };
 * ```
 */
export function provideK8sRetryInterceptor(config?: RetryConfig): Provider[] {
  return [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: K8sRetryInterceptor,
      multi: true,
    },
    ...(config
      ? [
          {
            provide: K8S_RETRY_CONFIG,
            useValue: config,
          },
        ]
      : []),
  ];
}
