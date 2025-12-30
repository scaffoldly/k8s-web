/**
 * HTTP Interceptor for enhanced error handling
 * Provides detailed error messages for Kubernetes API errors
 */
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

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
 * import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
 * import { K8sClientInterceptor, K8sErrorHandlingInterceptor } from '@k8s-web/angular';
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
 *       useClass: K8sErrorHandlingInterceptor,
 *       multi: true,
 *     },
 *   ]
 * };
 * ```
 */
@Injectable()
export class K8sErrorHandlingInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle errors from Kubernetes API (relative URLs we transformed)
        if (!req.url.startsWith('http') || req.url.includes('/api/')) {
          const k8sError = this.parseK8sError(error);
          return throwError(() => k8sError);
        }

        // Pass through other errors unchanged
        return throwError(() => error);
      })
    );
  }

  /**
   * Parse HTTP error response into K8sApiError
   */
  private parseK8sError(error: HttpErrorResponse): K8sApiError {
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
}
