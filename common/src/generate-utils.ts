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
  const {
    projectName,
    specsDir,
    srcGeneratedDir,
    mutatorPath,
    projectRoot,
    rootDir,
    client,
  } = options;

  console.log(`Generating ${projectName} clients...\n`);

  if (!existsSync(specsDir)) {
    console.error(`Error: OpenAPI specs directory not found: ${specsDir}`);
    console.error('Please run the root generate script first to fetch OpenAPI specs.');
    process.exit(1);
  }

  const specFiles = readdirSync(specsDir).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_')
  );

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
      target: path.join(srcGeneratedDir, 'kubernetes.ts'),
      client,
      mode: 'single',
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

  // Create index file that re-exports everything
  console.log('Creating index file...');
  const indexPath = path.join(srcGeneratedDir, '..', 'index.ts');
  const indexContent = `export * from './generated/kubernetes';\n`;

  // Format the index file content before writing
  const prettierConfig = (await prettier.resolveConfig(rootDir)) || {};
  const formattedIndex = await prettier.format(indexContent, {
    ...prettierConfig,
    filepath: indexPath,
  });

  writeFileSync(indexPath, formattedIndex);
  console.log(`✓ Created index file`);

  console.log(`\n✓ ${projectName} client generation complete!`);
  console.log('\nUsage:');
  console.log(`  import { CoreV1Api } from '@k8s-web/${projectName.toLowerCase()}';`);

  // Format generated code
  console.log('\nFormatting generated code with prettier...');
  try {
    const prettierConfig = (await prettier.resolveConfig(rootDir)) || {};
    const files = await glob('src/**/*.ts', { cwd: projectRoot, absolute: true });

    let formatted = 0;
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const formatted_content = await prettier.format(content, {
        ...prettierConfig,
        filepath: file,
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
