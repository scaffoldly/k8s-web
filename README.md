# k8s-web

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://badge.fury.io/js/k8s-web.svg)](https://badge.fury.io/js/k8s-web)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

TypeScript Kubernetes API client libraries for Angular and React, generated from official Kubernetes OpenAPI v3 specifications.

## Features

- **Framework-native implementations**: Angular services with HttpClient, React hooks with TanStack Query
- **Full type safety**: Complete TypeScript definitions for all Kubernetes API resources
- **Multiple K8s versions**: Support for Kubernetes 1.29 through 1.34
- **Zero axios dependency**: Uses native fetch and framework HTTP clients
- **Auto-generated JSDoc**: Rich inline documentation from OpenAPI specs
- **Tree-shakeable**: Organized by API group for optimal bundle sizes

## Installation

### Angular

```bash
npm install k8s-web@1.34.0-angular
```

### React

```bash
npm install k8s-web@1.34.0-react
```

Replace `1.34.0` with your desired Kubernetes version (1.29, 1.30, 1.31, 1.32, 1.33, or 1.34).

## Usage

### Angular

Configure the client in your app:

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

Use the generated services:

```typescript
import { CoreV1Service } from 'k8s-web';
import type { IoK8sApiCoreV1Pod } from 'k8s-web';

@Component({
  // ...
})
export class MyComponent {
  constructor(private coreV1: CoreV1Service) {}

  listPods() {
    this.coreV1.listNamespacedPod({ namespace: 'default' }).subscribe(pods => {
      console.log(pods.items);
    });
  }
}
```

### React

Configure the client before use:

```typescript
import { configureK8sClient } from 'k8s-web';

configureK8sClient({
  baseURL: 'https://my-cluster.example.com',
  token: 'my-service-account-token',
});
```

Use the generated hooks:

```typescript
import { useListCoreV1NamespacedPod } from 'k8s-web';
import type { IoK8sApiCoreV1Pod } from 'k8s-web';

function MyComponent() {
  const { data, isLoading, error } = useListCoreV1NamespacedPod({
    namespace: 'default',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.items.map((pod: IoK8sApiCoreV1Pod) => (
        <li key={pod.metadata?.uid}>{pod.metadata?.name}</li>
      ))}
    </ul>
  );
}
```

### React Convenience Hooks

Simplified hooks for common operations:

```typescript
import { usePods, useDeployments, useNamespaces } from 'k8s-web';

function Dashboard() {
  // Simple pod listing
  const { data: pods } = usePods('default');

  // With label selector and auto-refresh
  const { data: deployments } = useDeployments('default', {
    labelSelector: 'app=frontend',
    query: { refetchInterval: 5000 },
  });

  // List all namespaces
  const { data: namespaces } = useNamespaces();

  return <div>{/* render resources */}</div>;
}
```

Available convenience hooks: `usePods`, `useDeployments`, `useStatefulSets`, `useDaemonSets`, `useServices`, `useConfigMaps`, `useSecrets`, `useNamespaces`, `useNodes`

## Development

### Prerequisites

- Node.js 18+
- Yarn 1.22+
- Docker (for running kube-apiserver)

### Project Structure

```
k8s-web/
├── angular/                 # Angular client library
│   ├── src/
│   │   ├── generated/      # Auto-generated (46 API groups + models)
│   │   ├── config.ts       # Configuration interface
│   │   ├── interceptor.ts  # HTTP interceptor
│   │   └── index.ts        # Barrel exports
│   └── dist/               # Built package
├── react/                   # React client library
│   ├── src/
│   │   ├── generated/      # Auto-generated (46 API groups + models)
│   │   ├── config.ts       # Configuration
│   │   ├── fetch-instance.ts # Fetch client
│   │   ├── hooks.ts        # Convenience hooks
│   │   └── index.ts        # Barrel exports
│   └── dist/               # Built package
├── util/                    # Dev-only generation utilities
├── angular-tests/           # Angular integration tests
├── react-tests/             # React integration tests
└── openapi-specs/           # Fetched K8s OpenAPI specs
```

### Generate Clients

```bash
# Generate for specific Kubernetes version
make 1.34                    # Both Angular and React
make angular 1.34            # Angular only
make react 1.34              # React only

# Publish after building and testing
PUBLISH=true make angular 1.34
```

### Build & Test

```bash
# Install dependencies
yarn install

# Fetch OpenAPI specs (requires running kube-apiserver)
yarn fetch-specs

# Generate TypeScript clients
yarn generate

# Build packages
yarn build

# Run integration tests
make test                    # Both frameworks
make test-angular            # Angular only
make test-react              # React only
```

### Clean Up

```bash
make clean                   # Remove generated code and builds
make clean-all              # Also remove specs and Docker containers
make stop-apiserver         # Stop Docker containers only
```

## How It Works

1. **Docker Compose** starts etcd and kube-apiserver for the specified K8s version
2. **Fetch specs** downloads all 46 API group OpenAPI v3 specifications
3. **Merge specs** combines them into a single OpenAPI document
4. **Orval** generates TypeScript clients using tags-split mode (one file per API group)
5. **JSDoc injection** adds inline documentation from OpenAPI descriptions
6. **Build** bundles with tsup (CommonJS + type definitions + source maps)
7. **Test** runs Playwright integration tests against real kube-apiserver
8. **Publish** temporarily renames packages to `k8s-web` and publishes with version tags

## Publishing

Packages are published to npm as `k8s-web` with version-specific tags:

- Angular: `k8s-web@1.34.0-angular`
- React: `k8s-web@1.34.0-react`

Users install by specifying the full version including the framework suffix.

## License

GNU General Public License v3.0

See [LICENSE](LICENSE) for full text.

## Links

- [npm package](https://www.npmjs.com/package/k8s-web)
- [GitHub repository](https://github.com/scaffoldly/k8s-web)
- [Issue tracker](https://github.com/scaffoldly/k8s-web/issues)

## Contributing

Contributions are welcome! Please read [CLAUDE.md](CLAUDE.md) for detailed project documentation and architecture.

## Credits

Generated using [Orval](https://orval.dev) from official Kubernetes OpenAPI specifications.
