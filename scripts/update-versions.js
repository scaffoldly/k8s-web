#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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

angularPkg.version = `${version}.0-angular`;
reactPkg.version = `${version}.0-react`;

fs.writeFileSync(angularPkgPath, JSON.stringify(angularPkg, null, 2) + '\n');
fs.writeFileSync(reactPkgPath, JSON.stringify(reactPkg, null, 2) + '\n');

console.log(`✓ Updated versions to ${version}.0-angular and ${version}.0-react`);
