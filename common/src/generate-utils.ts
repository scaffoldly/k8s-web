import { writeFileSync, readdirSync, existsSync, readFileSync } from 'fs';
import { generate } from 'orval';
import prettier from 'prettier';
import { ESLint } from 'eslint';
import path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

export function sanitizeGroupName(fileName: string): string {
  // Remove .json extension
  return fileName.replace('.json', '');
}

function generateReactHooks(): string {
  // Define common Kubernetes resources and their hooks
  const resources = [
    {
      name: 'Pods',
      hook: 'usePods',
      generatedHook: 'useListCoreV1NamespacedPod',
      type: 'IoK8sApiCoreV1PodList',
      import: './generated/core-v1/core-v1',
      namespaced: true,
      description: 'List pods in a namespace',
      examples: [
        "// List all pods in the default namespace\nconst { data: pods, isLoading } = usePods('default');",
        "// List pods with a label selector\nconst { data: pods } = usePods('default', {\n  labelSelector: 'app=nginx',\n});",
        "// With auto-refresh every 5 seconds\nconst { data: pods } = usePods('default', {\n  query: { refetchInterval: 5000 },\n});",
      ],
    },
    {
      name: 'Namespaces',
      hook: 'useNamespaces',
      generatedHook: 'useListCoreV1Namespace',
      type: 'IoK8sApiCoreV1NamespaceList',
      import: './generated/core-v1/core-v1',
      namespaced: false,
      description: 'List all namespaces',
      examples: [
        'const { data: namespaces, isLoading } = useNamespaces();',
        "// With label selector\nconst { data: namespaces } = useNamespaces({\n  labelSelector: 'environment=production',\n});",
      ],
    },
    {
      name: 'Services',
      hook: 'useServices',
      generatedHook: 'useListCoreV1NamespacedService',
      type: 'IoK8sApiCoreV1ServiceList',
      import: './generated/core-v1/core-v1',
      namespaced: true,
      description: 'List services in a namespace',
      examples: [
        "const { data: services } = useServices('default');",
        "// With label selector\nconst { data: services } = useServices('default', {\n  labelSelector: 'app=api',\n});",
      ],
    },
    {
      name: 'Nodes',
      hook: 'useNodes',
      generatedHook: 'useListCoreV1Node',
      type: 'IoK8sApiCoreV1NodeList',
      import: './generated/core-v1/core-v1',
      namespaced: false,
      description: 'List all nodes',
      examples: [
        'const { data: nodes } = useNodes();',
        '// With field selector to get only ready nodes\nconst { data: readyNodes } = useNodes({\n  fieldSelector: \'status.conditions[?(@.type=="Ready")].status=True\',\n});',
      ],
    },
    {
      name: 'Deployments',
      hook: 'useDeployments',
      generatedHook: 'useListAppsV1NamespacedDeployment',
      type: 'IoK8sApiAppsV1DeploymentList',
      import: './generated/apps-v1/apps-v1',
      namespaced: true,
      description: 'List deployments in a namespace',
      examples: [
        "const { data: deployments } = useDeployments('default');",
        "// With label selector\nconst { data: deployments } = useDeployments('default', {\n  labelSelector: 'app=frontend',\n});",
      ],
    },
    {
      name: 'StatefulSets',
      hook: 'useStatefulSets',
      generatedHook: 'useListAppsV1NamespacedStatefulSet',
      type: 'IoK8sApiAppsV1StatefulSetList',
      import: './generated/apps-v1/apps-v1',
      namespaced: true,
      description: 'List StatefulSets in a namespace',
      examples: ["const { data: statefulSets } = useStatefulSets('default');"],
    },
    {
      name: 'DaemonSets',
      hook: 'useDaemonSets',
      generatedHook: 'useListAppsV1NamespacedDaemonSet',
      type: 'IoK8sApiAppsV1DaemonSetList',
      import: './generated/apps-v1/apps-v1',
      namespaced: true,
      description: 'List DaemonSets in a namespace',
      examples: ["const { data: daemonSets } = useDaemonSets('kube-system');"],
    },
    {
      name: 'ConfigMaps',
      hook: 'useConfigMaps',
      generatedHook: 'useListCoreV1NamespacedConfigMap',
      type: 'IoK8sApiCoreV1ConfigMapList',
      import: './generated/core-v1/core-v1',
      namespaced: true,
      description: 'List ConfigMaps in a namespace',
      examples: ["const { data: configMaps } = useConfigMaps('default');"],
    },
    {
      name: 'Secrets',
      hook: 'useSecrets',
      generatedHook: 'useListCoreV1NamespacedSecret',
      type: 'IoK8sApiCoreV1SecretList',
      import: './generated/core-v1/core-v1',
      namespaced: true,
      description: 'List Secrets in a namespace',
      examples: [
        "const { data: secrets } = useSecrets('default');",
        "// Filter by type\nconst { data: tlsSecrets } = useSecrets('default', {\n  fieldSelector: 'type=kubernetes.io/tls',\n});",
      ],
    },
  ];

  // Group imports by source
  const importGroups = new Map<string, Set<string>>();
  const typeImports = new Set<string>();

  resources.forEach((resource) => {
    if (!importGroups.has(resource.import)) {
      importGroups.set(resource.import, new Set());
    }
    importGroups.get(resource.import)!.add(resource.generatedHook);
    typeImports.add(resource.type);
  });

  // Generate imports
  const imports: string[] = [
    '/**',
    ' * Convenience hooks for common Kubernetes operations',
    ' * These are auto-generated wrappers around the generated TanStack Query hooks',
    ' * ',
    ' * @generated by common/src/generate-utils.ts',
    ' */',
    "import type { UseQueryOptions } from '@tanstack/react-query';",
  ];

  // Add hook imports
  importGroups.forEach((hooks, importPath) => {
    imports.push(`import { ${Array.from(hooks).join(', ')} } from '${importPath}';`);
  });

  // Add type imports
  imports.push(`import type { ${Array.from(typeImports).join(', ')} } from './generated/models';`);

  // Generate ListQueryOptions interface
  const interfaceCode = `
/**
 * Common query options for list operations
 */
export interface ListQueryOptions<TData = unknown, TError = unknown> {
  /**
   * Label selector to filter resources
   * @example 'app=nginx,environment=production'
   */
  labelSelector?: string;

  /**
   * Field selector to filter resources
   * @example 'status.phase=Running'
   */
  fieldSelector?: string;

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Continue token for pagination
   */
  continue?: string;

  /**
   * Additional TanStack Query options
   */
  query?: Partial<UseQueryOptions<TData, TError, TData>>;
}
`;

  // Generate hook functions
  const hookFunctions = resources.map((resource) => {
    const examples = resource.examples.map((ex) => ` * ${ex}`).join('\n *\n * ');

    const namespaceParam = resource.namespaced ? 'namespace: string, ' : '';
    const namespaceArg = resource.namespaced ? 'namespace, ' : '';

    return `
/**
 * ${resource.description}
 *
 * @example
 * \`\`\`typescript
 * ${examples}
 * \`\`\`
 */
export function ${resource.hook}(
  ${namespaceParam}options?: ListQueryOptions<${resource.type}, void>
) {
  return ${resource.generatedHook}(
    ${namespaceArg}{
      labelSelector: options?.labelSelector,
      fieldSelector: options?.fieldSelector,
      limit: options?.limit,
      continue: options?.continue,
    },
    { query: options?.query }
  );
}`;
  });

  return [...imports, '', interfaceCode, ...hookFunctions].join('\n');
}

function toNamespaceIdentifier(groupName: string): string {
  // Convert group name to a valid JavaScript identifier in camelCase
  // e.g., "v1" -> "v1", "apps-v1" -> "appsV1", "-well-known-openid-configuration" -> "wellKnownOpenidConfiguration"
  return groupName
    .split(/[-.]/)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (index === 0) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

export interface GenerateOptions {
  projectName: string;
  specsDir: string;
  srcGeneratedDir: string;
  mutatorPath?: string;
  projectRoot: string;
  rootDir: string;
  client: 'axios' | 'angular' | 'react-query';
}

function mergeOpenAPISpecs(specFiles: string[], specsDir: string): any {
  const mergedSpec: any = {
    openapi: '3.0.0',
    info: {
      title: 'Kubernetes API',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  for (const specFile of specFiles) {
    const specPath = path.join(specsDir, specFile);
    const spec = JSON.parse(readFileSync(specPath, 'utf-8'));

    // Merge paths (later specs overwrite earlier ones for duplicates)
    if (spec.paths) {
      Object.assign(mergedSpec.paths, spec.paths);
    }

    // Merge components/schemas
    if (spec.components?.schemas) {
      Object.assign(mergedSpec.components.schemas, spec.components.schemas);
    }

    // Merge other component types if they exist
    if (spec.components) {
      for (const [componentType, components] of Object.entries(spec.components)) {
        if (componentType !== 'schemas') {
          if (!mergedSpec.components[componentType]) {
            mergedSpec.components[componentType] = {};
          }
          Object.assign(mergedSpec.components[componentType], components);
        }
      }
    }

    // Copy over servers, security, etc from first spec
    if (!mergedSpec.servers && spec.servers) {
      mergedSpec.servers = spec.servers;
    }
  }

  return mergedSpec;
}

export async function generateClients(options: GenerateOptions) {
  const { projectName, specsDir, srcGeneratedDir, mutatorPath, projectRoot, rootDir, client } =
    options;

  console.log(`Generating ${projectName} clients...\n`);

  if (!existsSync(specsDir)) {
    console.error(`Error: OpenAPI specs directory not found: ${specsDir}`);
    console.error('Please run the root generate script first to fetch OpenAPI specs.');
    process.exit(1);
  }

  const specFiles = readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

  if (specFiles.length === 0) {
    console.error('Error: No OpenAPI spec files found.');
    console.error('Please run the root generate script first to fetch OpenAPI specs.');
    process.exit(1);
  }

  console.log(`Found ${specFiles.length} OpenAPI specs`);
  console.log('Merging all specs into a single OpenAPI document...\n');

  try {
    // Merge all specs into a single OpenAPI document
    const mergedSpecPath = path.join(specsDir, '_merged.json');
    const mergedSpec = mergeOpenAPISpecs(specFiles, specsDir);

    writeFileSync(mergedSpecPath, JSON.stringify(mergedSpec, null, 2));

    console.log(
      `\n  ✓ Merged ${specFiles.length} specs (${Object.keys(mergedSpec.paths || {}).length} paths, ${Object.keys(mergedSpec.components?.schemas || {}).length} schemas)\n`
    );

    const outputConfig: any = {
      target: srcGeneratedDir,
      client,
      mode: 'tags-split',
      schemas: path.join(srcGeneratedDir, 'models'),
    };

    // Add mutator for axios and react-query clients
    if ((client === 'axios' || client === 'react-query') && mutatorPath) {
      outputConfig.override = {
        mutator: {
          path: mutatorPath,
          name: 'customInstance',
        },
      };
    }

    await generate({
      input: mergedSpecPath,
      output: outputConfig,
    });

    console.log(`  ✓ Generated Kubernetes client\n`);
  } catch (error) {
    console.error(`  ✗ Failed to generate client:`, error);
    process.exit(1);
  }

  // Create index file that re-exports everything from all tag folders
  console.log('Creating index file...');
  const indexPath = path.join(srcGeneratedDir, '..', 'index.ts');

  // Get all tag directories
  const tagDirs = readdirSync(srcGeneratedDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== 'models')
    .map((dirent) => dirent.name)
    .sort();

  let indexContent =
    tagDirs
      .map((tag) => {
        const fileName = client === 'angular' ? `${tag}.service` : tag;
        return `export * from './generated/${tag}/${fileName}';`;
      })
      .join('\n') +
    '\n\n' +
    '// Re-export common models\n' +
    "export * from './generated/models';\n";

  // Add config and hooks exports
  if (client === 'angular') {
    indexContent += '\n// Re-export configuration utilities\n';
    indexContent += "export * from './config';\n";
    indexContent += "export * from './interceptor';\n";
  } else if (client === 'react-query') {
    indexContent += '\n// Re-export configuration utilities\n';
    indexContent += "export * from './config';\n";
    indexContent += '\n// Re-export convenience hooks\n';
    indexContent += "export * from './hooks';\n";
  }

  // Format the index file content before writing
  const prettierConfigPath = path.join(rootDir, '.prettierrc');
  let prettierConfig = {};
  try {
    const configContent = readFileSync(prettierConfigPath, 'utf-8');
    prettierConfig = JSON.parse(configContent);
  } catch (error) {
    console.warn('Could not read .prettierrc, using defaults');
  }

  const formattedIndex = await prettier.format(indexContent, {
    ...prettierConfig,
    parser: 'typescript',
  });

  writeFileSync(indexPath, formattedIndex);
  console.log(`✓ Created index file with ${tagDirs.length} tag exports`);

  // Generate convenience hooks for React
  if (client === 'react-query') {
    console.log('\nGenerating convenience hooks...');
    const hooksPath = path.join(srcGeneratedDir, '..', 'hooks.ts');
    const hooksContent = generateReactHooks();

    const formattedHooks = await prettier.format(hooksContent, {
      ...prettierConfig,
      parser: 'typescript',
    });

    writeFileSync(hooksPath, formattedHooks);
    console.log(`✓ Created hooks file with convenience wrappers`);
  }

  console.log(`\n✓ ${projectName} client generation complete!`);
  console.log('\nUsage:');
  console.log(`  // Import from root (barrel exports):`);
  console.log(`  import { CoreV1Service } from '@k8s-web/${projectName.toLowerCase()}';`);
  console.log(`  `);
  console.log(`  // Or import from specific tags for better tree-shaking:`);
  console.log(`  import { CoreV1Service } from '@k8s-web/${projectName.toLowerCase()}/core_v1';`);

  // Format generated code
  console.log('\nFormatting generated code with prettier...');
  try {
    // Read .prettierrc directly to ensure config is applied
    const prettierConfigPath = path.join(rootDir, '.prettierrc');
    let prettierConfig = {};
    try {
      const configContent = readFileSync(prettierConfigPath, 'utf-8');
      prettierConfig = JSON.parse(configContent);
    } catch (error) {
      console.warn('Could not read .prettierrc for formatting');
    }

    const files = await glob('src/**/*.ts', { cwd: projectRoot, absolute: true });

    let formatted = 0;
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const formatted_content = await prettier.format(content, {
        ...prettierConfig,
        parser: 'typescript',
      });

      if (content !== formatted_content) {
        writeFileSync(file, formatted_content);
        formatted++;
      }
    }

    console.log(`✓ Formatted ${formatted} files`);
  } catch (error) {
    console.error('✗ Formatting failed:', error);
  }

  // Lint generated code
  console.log('\nLinting generated code with eslint...');
  try {
    const eslint = new ESLint({
      cwd: rootDir,
      fix: true,
    });

    const files = await glob('src/generated/**/*.ts', { cwd: projectRoot, absolute: true });
    const results = await eslint.lintFiles(files);

    // Apply automatic fixes
    await ESLint.outputFixes(results);

    // Count results
    let errorCount = 0;
    let warningCount = 0;
    let fixedCount = 0;

    for (const result of results) {
      errorCount += result.errorCount;
      warningCount += result.warningCount;
      fixedCount += result.fixableErrorCount + result.fixableWarningCount;
    }

    if (fixedCount > 0) {
      console.log(`✓ Fixed ${fixedCount} lint issues`);
    }

    if (errorCount > 0 || warningCount > 0) {
      console.log(`⚠ Remaining: ${errorCount} errors, ${warningCount} warnings`);
    } else {
      console.log(`✓ No lint issues found`);
    }

    // Check for ESLint errors and fail if found
    if (errorCount > 0) {
      console.error(`\n✗ Generation failed: ${errorCount} ESLint errors found`);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Linting failed:', error);
    process.exit(1);
  }
}
