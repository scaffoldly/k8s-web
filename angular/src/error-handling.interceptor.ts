/**
 * HTTP Interceptor for enhanced error handling
 * Provides detailed error messages for Kubernetes API errors
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Kubernetes API error response
 */
export interface K8sErrorResponse {
  apiVersion?: string;
  kind: string;
  message: string;
  reason?: string;
  details?: {
    name?: string;
    group?: string;
    kind?: string;
    causes?: Array<{
      reason?: string;
      message?: string;
      field?: string;
    }>;
  };
  code?: number;
  status?: string;
}

/**
 * Enhanced error class for Kubernetes API errors
 */
export class K8sApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly reason?: string,
    public readonly details?: K8sErrorResponse['details']
  ) {
    super(message);
    this.name = 'K8sApiError';
  }
}

/**
 * HTTP interceptor that enhances error handling for Kubernetes API calls
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { k8sClientInterceptor, k8sErrorHandlingInterceptor } from '@k8s-web/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([
 *         k8sClientInterceptor,
 *         k8sErrorHandlingInterceptor,  // Add after k8sClientInterceptor
 *       ])
 *     ),
 *   ]
 * };
 * ```
 */
export const k8sErrorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle errors from Kubernetes API (relative URLs we transformed)
      if (!req.url.startsWith('http') || req.url.includes('/api/')) {
        const k8sError = parseK8sError(error);
        return throwError(() => k8sError);
      }

      // Pass through other errors unchanged
      return throwError(() => error);
    })
  );
};

/**
 * Parse HTTP error response into K8sApiError
 */
function parseK8sError(error: HttpErrorResponse): K8sApiError {
  // Try to parse Kubernetes API error format
  if (error.error && typeof error.error === 'object') {
    const k8sErrorBody = error.error as Partial<K8sErrorResponse>;

    if (k8sErrorBody.kind === 'Status') {
      const message = k8sErrorBody.message || `Kubernetes API error: ${error.statusText}`;
      return new K8sApiError(message, error.status, k8sErrorBody.reason, k8sErrorBody.details);
    }
  }

  // Fallback to generic error message
  const message =
    error.error?.message || error.message || `HTTP ${error.status}: ${error.statusText}`;
  return new K8sApiError(message, error.status);
}
