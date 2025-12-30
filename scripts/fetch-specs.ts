#!/usr/bin/env tsx

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// Node.js 18+ fetch configuration for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_SERVER = 'https://localhost:6443';

interface OpenAPIGroup {
  name: string;
  serverRelativeURL: string;
}

interface OpenAPIV3Discovery {
  paths: Record<string, OpenAPIGroup>;
}

async function fetchOpenAPIDiscovery(): Promise<OpenAPIV3Discovery> {
  console.log(`Fetching OpenAPI v3 discovery from ${API_SERVER}/openapi/v3...`);

  try {
    const response = await fetch(`${API_SERVER}/openapi/v3`, {
      headers: {
        Authorization: 'Bearer secret-token',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch OpenAPI discovery:', error);
    throw error;
  }
}

async function fetchOpenAPISpec(path: string): Promise<any> {
  const url = `${API_SERVER}${path}`;
  console.log(`Fetching OpenAPI spec from ${url}...`);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer secret-token',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch OpenAPI spec from ${path}:`, error);
    throw error;
  }
}

function sanitizeGroupName(groupName: string): string {
  // Convert group names like "apis/apps/v1" to "apps-v1"
  return groupName
    .replace(/^apis?\//, '')
    .replace(/\//g, '-')
    .replace(/\./g, '-');
}

async function fetchSpecs() {
  try {
    // Create output directory
    mkdirSync('openapi-specs', { recursive: true });

    // Fetch the discovery document
    const discovery = await fetchOpenAPIDiscovery();

    console.log(`\nFound ${Object.keys(discovery.paths).length} API groups\n`);

    // Process each API group
    for (const [pathKey, groupInfo] of Object.entries(discovery.paths)) {
      const groupName = sanitizeGroupName(pathKey);
      console.log(`Processing API group: ${groupName}`);

      // Fetch the OpenAPI spec for this group
      const spec = await fetchOpenAPISpec(groupInfo.serverRelativeURL);

      // Save the spec to a file
      const specPath = path.join('openapi-specs', `${groupName}.json`);
      writeFileSync(specPath, JSON.stringify(spec, null, 2));
      console.log(`  ✓ Saved spec to ${specPath}\n`);
    }

    console.log(`\n✓ OpenAPI spec fetching complete!`);
    console.log(`Fetched ${Object.keys(discovery.paths).length} API groups`);

  } catch (error) {
    console.error('\n✗ Failed to fetch OpenAPI specs:', error);
    process.exit(1);
  }
}

// Run the fetch
fetchSpecs();
