# k8s-web (Angular)

TypeScript client library for Kubernetes API, generated from official OpenAPI v3 specifications. This is the **Angular** version using native `HttpClient`.

## Installation

```bash
# Install latest Angular build
npm install k8s-web@angular

# Or install specific version
npm install k8s-web@1.34.0-angular.20251230161234.fb08210
```

## Quick Start

### 1. Configure the Kubernetes API client

In your `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { k8sClientInterceptor, K8S_CLIENT_CONFIG } from 'k8s-web';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([k8sClientInterceptor])),
    {
      provide: K8S_CLIENT_CONFIG,
      useValue: {
        baseURL: 'https://my-cluster.example.com',
        token: 'my-service-account-token',
      },
    },
  ],
};
```

### 2. Use the Kubernetes API services

```typescript
import { Component, OnInit } from '@angular/core';
import { CoreV1Service } from 'k8s-web';
import type { IoK8sApiCoreV1Pod } from 'k8s-web';

@Component({
  selector: 'app-pods',
  template: `
    <div *ngFor="let pod of pods">
      {{ pod.metadata?.name }}
    </div>
  `,
})
export class PodsComponent implements OnInit {
  pods: IoK8sApiCoreV1Pod[] = [];

  constructor(private coreV1: CoreV1Service) {}

  ngOnInit() {
    this.coreV1.listNamespacedPod({ namespace: 'default' }).subscribe((response) => {
      this.pods = response.items || [];
    });
  }
}
```

## Advanced Features

### Error Handling Interceptor

```typescript
import {
  k8sClientInterceptor,
  k8sErrorHandlingInterceptor,
  K8sApiError,
} from 'k8s-web';

provideHttpClient(
  withInterceptors([
    k8sClientInterceptor,
    k8sErrorHandlingInterceptor, // Enhanced K8s error parsing
  ])
);

// In your component
this.coreV1.listNamespacedPod({ namespace: 'default' }).subscribe({
  error: (error) => {
    if (error instanceof K8sApiError) {
      console.error(`K8s error ${error.statusCode}: ${error.message}`);
    }
  },
});
```

### Retry Interceptor

```typescript
import {
  k8sClientInterceptor,
  k8sRetryInterceptor,
  createK8sRetryInterceptor,
} from 'k8s-web';

// Default retry (3 attempts, exponential backoff)
provideHttpClient(
  withInterceptors([k8sClientInterceptor, k8sRetryInterceptor])
);

// Custom retry configuration
provideHttpClient(
  withInterceptors([
    k8sClientInterceptor,
    createK8sRetryInterceptor({
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 60000,
    }),
  ])
);
```

## API Coverage

This library includes all Kubernetes APIs:

- **Core v1**: Pods, Services, Nodes, ConfigMaps, Secrets, etc.
- **Apps v1**: Deployments, StatefulSets, DaemonSets, ReplicaSets
- **Batch v1**: Jobs, CronJobs
- **Networking v1**: Ingresses, NetworkPolicies
- **RBAC v1**: Roles, RoleBindings, ClusterRoles, ClusterRoleBindings
- **And 40+ more API groups**

## Tree-Shaking

For better bundle sizes, import from specific API groups:

```typescript
import { CoreV1Service } from 'k8s-web/core-v1';
import { AppsV1Service } from 'k8s-web/apps-v1';
import type { IoK8sApiCoreV1Pod } from 'k8s-web/models';
```

## Version Information

This package version includes:
- Kubernetes API version
- Build timestamp
- Git commit SHA

Example: `1.34.0-angular.20251230161234.fb08210`

## Links

- [GitHub Repository](https://github.com/scaffoldly/k8s-web)
- [React Version](https://www.npmjs.com/package/k8s-web?activeTab=versions) (use `npm install k8s-web@react`)

## License

MIT
