# k8s-web

TypeScript Kubernetes client libraries for Angular and React, generated from Kubernetes OpenAPI specifications using orval.

## Overview

This project uses yarn workspaces to manage TypeScript client libraries for Angular and React. The clients are automatically generated from Kubernetes OpenAPI v3 specifications using orval.

## Project Structure

```
k8s-web/
├── angular/                 # Angular client library workspace
│   ├── src/
│   │   ├── generated/      # Auto-generated API clients
│   │   └── index.ts        # Main export file
│   └── package.json
├── react/                   # React client library workspace
│   ├── src/
│   │   ├── generated/      # Auto-generated API clients
│   │   └── index.ts        # Main export file
│   └── package.json
├── common/                  # Shared utilities
│   └── src/
│       ├── fetch-instance.ts    # Fetch-based HTTP client for React
│       └── generate-utils.ts    # Client generation utilities
├── scripts/
│   └── generate-clients.ts # Client generation script
├── Makefile                # Build automation
└── package.json            # Root workspace configuration
```

## Usage

### Generate Clients for a Kubernetes Version

To generate TypeScript clients for a specific Kubernetes version:

```bash
make 1.34    # Generates clients for Kubernetes v1.34.0
make 1.31    # Generates clients for Kubernetes v1.31.0
```

This command will:
1. Start a kube-apiserver container for the specified version
2. Fetch all OpenAPI v3 specifications from `/openapi/v3`
3. Generate TypeScript clients for each API group
4. Build both Angular and React packages with type definitions and source maps

### Install Dependencies

```bash
yarn install
```

### Build Packages

```bash
yarn build
```

### Clean Generated Files

```bash
make clean
```

### Stop API Server

```bash
make stop-apiserver
```

## How It Works

1. **Makefile**: Orchestrates the process by:
   - Running kube-apiserver in a Docker container
   - Calling the client generation script
   - Building the packages

2. **generate-clients.ts**: Walks through the OpenAPI v3 discovery endpoint and:
   - Fetches each API group specification
   - Saves specs to `openapi-specs/` directory
   - Generates orval configurations dynamically
   - Runs orval to create TypeScript clients for both Angular and React
   - Creates index files that export all generated APIs

3. **orval**: Generates TypeScript clients with:
   - Angular: Native HttpClient with dependency injection
   - React: Fetch API with TanStack Query hooks
   - Full TypeScript type definitions
   - Custom HTTP instance for SSL/auth configuration

4. **tsup**: Builds the packages with:
   - CommonJS and ESM outputs
   - TypeScript declaration files (.d.ts)
   - Source maps for debugging

## Generated Output

Each workspace generates:
- `dist/index.js` - CommonJS bundle
- `dist/index.mjs` - ESM bundle
- `dist/index.d.ts` - TypeScript declarations
- `dist/index.js.map` - Source map

## Using the Generated Clients

### Angular

```typescript
import { getPods, createPod } from '@k8s-web/angular';

// Use the generated API clients
const pods = await getPods({ namespace: 'default' });
```

### React

```typescript
import { getPods, createPod } from '@k8s-web/react';

// Use the generated API clients
const pods = await getPods({ namespace: 'default' });
```

## Configuration

### HTTP Clients

#### Angular
Uses Angular's native HttpClient with dependency injection. Generated services are ready to use in your Angular application without additional configuration.

#### React
Uses a custom fetch-based instance at `common/src/fetch-instance.ts` with TanStack Query that:
- Configures the base URL for the Kubernetes API server
- Handles authentication headers
- Provides proper TypeScript typing

You can modify the fetch instance to add authentication, custom headers, or other HTTP configuration.

## Requirements

- Node.js 18+
- Yarn 1.22+
- Docker (for running kube-apiserver)

## License

MIT