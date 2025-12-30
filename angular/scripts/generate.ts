#!/usr/bin/env tsx

import { generateClients } from '../../util/src/generate-utils';
import path from 'path';

generateClients({
  projectName: 'Angular',
  specsDir: path.join(__dirname, '../../openapi-specs'),
  srcGeneratedDir: path.join(__dirname, '../src/generated'),
  projectRoot: path.join(__dirname, '..'),
  rootDir: path.join(__dirname, '../..'),
  client: 'angular',
});
