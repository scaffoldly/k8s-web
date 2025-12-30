#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const angularPkgPath = path.join(__dirname, '../angular/package.json');
const reactPkgPath = path.join(__dirname, '../react/package.json');
const dryRun = process.argv.includes('--dry-run');
const framework = process.env.FRAMEWORK; // 'angular', 'react', or undefined (both)

function readPackage(pkgPath) {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function writePackage(pkgPath, pkg) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function renameTok8sWeb() {
  const angularPkg = readPackage(angularPkgPath);
  const reactPkg = readPackage(reactPkgPath);

  angularPkg.name = 'k8s-web';
  reactPkg.name = 'k8s-web';

  writePackage(angularPkgPath, angularPkg);
  writePackage(reactPkgPath, reactPkg);

  return { angularVersion: angularPkg.version, reactVersion: reactPkg.version };
}

function revertNames() {
  const angularPkg = readPackage(angularPkgPath);
  const reactPkg = readPackage(reactPkgPath);

  angularPkg.name = 'k8s-web-angular';
  reactPkg.name = 'k8s-web-react';

  writePackage(angularPkgPath, angularPkg);
  writePackage(reactPkgPath, reactPkg);
}

function publish() {
  const mode = dryRun ? 'DRY RUN' : 'LIVE';
  const frameworkFilter = framework ? ` (${framework} only)` : '';
  console.log(`Preparing to publish packages... [${mode}]${frameworkFilter}\n`);

  if (dryRun) {
    console.log('⚠️  Dry-run mode: no changes will be published to npm\n');
  }

  const publishAngular = !framework || framework === 'angular';
  const publishReact = !framework || framework === 'react';

  // Step 1: Rename packages
  console.log('Step 1: Temporarily renaming packages to "k8s-web"...');
  const { angularVersion, reactVersion } = renameTok8sWeb();
  console.log('✓ Renamed packages\n');

  try {
    const publishFlag = dryRun ? '--dry-run' : '';
    let stepNum = 2;

    // Step 2: Publish Angular
    if (publishAngular) {
      console.log(`Step ${stepNum}: Publishing k8s-web@${angularVersion}...`);
      execSync(`cd angular && npm publish --tag ${angularVersion} ${publishFlag}`, { stdio: 'inherit' });
      console.log('✓ Published Angular\n');
      stepNum++;
    }

    // Step 3: Publish React
    if (publishReact) {
      console.log(`Step ${stepNum}: Publishing k8s-web@${reactVersion}...`);
      execSync(`cd react && npm publish --tag ${reactVersion} ${publishFlag}`, { stdio: 'inherit' });
      console.log('✓ Published React\n');
      stepNum++;
    }

    // Success
    console.log(`Step ${stepNum}: Reverting package names...`);
    revertNames();
    console.log('✓ Reverted package names\n');

    if (dryRun) {
      console.log('✓ Dry-run completed successfully!');
      console.log('  No changes were published to npm.');
      console.log('\nTo publish for real, run: make publish');
    } else {
      const packages = [];
      if (publishAngular) packages.push(`k8s-web@${angularVersion}`);
      if (publishReact) packages.push(`k8s-web@${reactVersion}`);

      console.log(`✓ Successfully published ${packages.length} package(s)!`);
      packages.forEach(pkg => console.log(`  - ${pkg}`));
      console.log('');
      console.log('Users can install with:');
      if (publishAngular) console.log(`  npm install k8s-web@${angularVersion}`);
      if (publishReact) console.log(`  npm install k8s-web@${reactVersion}`);
    }
  } catch (error) {
    // Revert on failure
    console.error('\n✗ Publish failed, reverting package names...');
    revertNames();
    console.error('✓ Reverted package names');
    process.exit(1);
  }
}

publish();
