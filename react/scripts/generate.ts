#!/usr/bin/env tsx

import { generateClients } from '../../common/src/generate-utils';
import path from 'path';

generateClients({
  projectName: 'React',
  specsDir: path.join(__dirname, '../../openapi-specs'),
  srcGeneratedDir: path.join(__dirname, '../src/generated'),
  mutatorPath: path.join(__dirname, '../src/fetch-instance.ts'),
  projectRoot: path.join(__dirname, '..'),
  rootDir: path.join(__dirname, '../..'),
  client: 'react-query',
});
