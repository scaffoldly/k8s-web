# k8s-web (React)

TypeScript client library for Kubernetes API, generated from official OpenAPI v3 specifications. This is the **React** version using TanStack Query hooks with native `fetch`.

## Installation

```bash
# Install latest React build
npm install k8s-web@react @tanstack/react-query

# Or install specific version
npm install k8s-web@1.34.0-react.20251230161234.fb08210 @tanstack/react-query
```

## Quick Start

### 1. Configure TanStack Query Provider

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureK8sClient } from 'k8s-web';

const queryClient = new QueryClient();

// Configure Kubernetes API client
configureK8sClient({
  baseURL: 'https://my-cluster.example.com',
  token: 'my-service-account-token',
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### 2. Use Kubernetes API hooks

```typescript
import { useListCoreV1NamespacedPod } from 'k8s-web';

function PodsList() {
  const { data, isLoading, error } = useListCoreV1NamespacedPod({
    namespace: 'default',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.items?.map((pod) => (
        <div key={pod.metadata?.uid}>{pod.metadata?.name}</div>
      ))}
    </div>
  );
}
```

## Convenience Hooks

High-level hooks for common operations:

```typescript
import { usePods, useDeployments, useNamespaces } from 'k8s-web';

// List pods with auto-refresh
function PodsView() {
  const { data: pods } = usePods('default', {
    labelSelector: 'app=nginx',
    query: { refetchInterval: 5000 }, // Auto-refresh every 5s
  });

  return <div>{/* render pods */}</div>;
}

// List all namespaces
function NamespacesView() {
  const { data: namespaces } = useNamespaces();
  return <div>{/* render namespaces */}</div>;
}

// List deployments with field selector
function DeploymentsView() {
  const { data: deployments } = useDeployments('production', {
    fieldSelector: 'status.replicas=3',
  });
  return <div>{/* render deployments */}</div>;
}
```

### Available Convenience Hooks

- `usePods(namespace, options?)` - List pods
- `useNamespaces(options?)` - List namespaces
- `useServices(namespace, options?)` - List services
- `useNodes(options?)` - List nodes
- `useDeployments(namespace, options?)` - List deployments
- `useStatefulSets(namespace, options?)` - List StatefulSets
- `useDaemonSets(namespace, options?)` - List DaemonSets
- `useConfigMaps(namespace, options?)` - List ConfigMaps
- `useSecrets(namespace, options?)` - List Secrets

## Environment Variables

Optional configuration via environment variables:

```bash
K8S_API_URL=https://my-cluster.example.com
K8S_API_TOKEN=my-service-account-token
```

If `K8S_API_URL` is set, the client auto-configures. Otherwise, call `configureK8sClient()` manually.

## Custom Headers

```typescript
configureK8sClient({
  baseURL: 'https://my-cluster.example.com',
  headers: {
    Authorization: 'Bearer my-token',
    'X-Custom-Header': 'value',
  },
});
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
import { useListCoreV1NamespacedPod } from 'k8s-web/core-v1';
import { useListAppsV1NamespacedDeployment } from 'k8s-web/apps-v1';
import type { IoK8sApiCoreV1Pod } from 'k8s-web/models';
```

## Advanced TanStack Query Options

All hooks accept standard TanStack Query options:

```typescript
const { data, refetch } = useListCoreV1NamespacedPod(
  { namespace: 'default' },
  {
    refetchInterval: 10000, // Auto-refresh every 10s
    staleTime: 5000, // Consider data fresh for 5s
    cacheTime: 60000, // Keep in cache for 1min
    retry: 3, // Retry failed requests 3 times
    onSuccess: (data) => console.log('Fetched:', data),
    onError: (error) => console.error('Error:', error),
  }
);
```

## Mutations (Create, Update, Delete)

```typescript
import { useCreateCoreV1NamespacedPod } from 'k8s-web';

function CreatePod() {
  const mutation = useCreateCoreV1NamespacedPod();

  const handleCreate = () => {
    mutation.mutate({
      namespace: 'default',
      data: {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: { name: 'my-pod' },
        spec: {
          containers: [{ name: 'nginx', image: 'nginx:latest' }],
        },
      },
    });
  };

  return <button onClick={handleCreate}>Create Pod</button>;
}
```

## Version Information

This package version includes:
- Kubernetes API version
- Build timestamp
- Git commit SHA

Example: `1.34.0-react.20251230161234.fb08210`

## Links

- [GitHub Repository](https://github.com/scaffoldly/k8s-web)
- [Angular Version](https://www.npmjs.com/package/k8s-web?activeTab=versions) (use `npm install k8s-web@angular`)
- [TanStack Query Docs](https://tanstack.com/query/latest)

## License

MIT
