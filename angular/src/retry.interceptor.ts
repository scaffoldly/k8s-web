/**
 * HTTP Interceptor for retry logic
 * Retries failed requests with exponential backoff for transient errors
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

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
 * Create a retry interceptor with custom configuration
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { k8sClientInterceptor, createK8sRetryInterceptor } from '@k8s-web/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([
 *         k8sClientInterceptor,
 *         createK8sRetryInterceptor({
 *           maxRetries: 3,
 *           initialDelay: 1000,
 *         }),
 *       ])
 *     ),
 *   ]
 * };
 * ```
 */
export function createK8sRetryInterceptor(config: RetryConfig = {}): HttpInterceptorFn {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return (req, next) => {
    return next(req).pipe(
      retry({
        count: retryConfig.maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Only retry on retryable status codes
          if (!retryConfig.retryableStatusCodes.includes(error.status)) {
            throw error;
          }

          // Only retry K8s API requests (relative URLs we transformed)
          if (!req.url.startsWith('http') || !req.url.includes('/api/')) {
            throw error;
          }

          // Calculate exponential backoff delay
          const delay = Math.min(
            retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, retryCount - 1),
            retryConfig.maxDelay
          );

          console.warn(
            `Retrying request to ${req.url} (attempt ${retryCount}/${retryConfig.maxRetries}) after ${delay}ms`
          );

          return timer(delay);
        },
      })
    );
  };
}

/**
 * Default retry interceptor with standard configuration
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { k8sClientInterceptor, k8sRetryInterceptor } from '@k8s-web/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([
 *         k8sClientInterceptor,
 *         k8sRetryInterceptor,  // Use default configuration
 *       ])
 *     ),
 *   ]
 * };
 * ```
 */
export const k8sRetryInterceptor = createK8sRetryInterceptor();
