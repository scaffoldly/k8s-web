#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];
if (!version) {
  console.error('Error: VERSION argument required');
  console.error('Usage: node update-versions.js 1.34');
  process.exit(1);
}

const angularPkgPath = path.join(__dirname, '../angular/package.json');
const reactPkgPath = path.join(__dirname, '../react/package.json');

const angularPkg = JSON.parse(fs.readFileSync(angularPkgPath, 'utf8'));
const reactPkg = JSON.parse(fs.readFileSync(reactPkgPath, 'utf8'));

// Generate timestamp in format: YYYYMMDDHHMMSS
const now = new Date();
const timestamp = now
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}Z$/, '')
  .replace('T', '');

// Get git commit SHA (short form)
let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Warning: Could not get git commit SHA');
}

// Format: 1.34.0-angular.20250930234754.ffd57d3
angularPkg.version = `${version}.0-angular.${timestamp}.${commitSha}`;
reactPkg.version = `${version}.0-react.${timestamp}.${commitSha}`;

fs.writeFileSync(angularPkgPath, JSON.stringify(angularPkg, null, 2) + '\n');
fs.writeFileSync(reactPkgPath, JSON.stringify(reactPkg, null, 2) + '\n');

console.log(`✓ Updated versions:`);
console.log(`  Angular: ${angularPkg.version}`);
console.log(`  React: ${reactPkg.version}`);
