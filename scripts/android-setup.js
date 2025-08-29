#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (m) => console.log(m);
const warn = (m) => console.warn(m);
const error = (m) => console.error(m);

function run(cmd, opts = {}) {
  log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function safeRun(cmd, description) {
  try {
    run(cmd);
    return true;
  } catch (e) {
    warn(`⚠️  ${description || cmd} failed: ${e.message}`);
    return false;
  }
}

function ensurePackageScripts() {
  const pkgPath = path.resolve('package.json');
  if (!fs.existsSync(pkgPath)) {
    warn('package.json not found, skipping script injection.');
    return;
  }

  const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    warn('Invalid package.json, skipping script injection.');
    return;
  }

  pkg.scripts = pkg.scripts || {};

  const desired = {
    'build:android:vite': 'vite build --config vite.config.android.ts',
    'android:build': 'node scripts/build-android.js',
    'android:setup': 'node scripts/android-setup.js'
  };

  let changed = false;
  for (const [k, v] of Object.entries(desired)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  }

  if (changed) {
    const backupPath = path.resolve(`package.backup.${Date.now()}.json`);
    fs.writeFileSync(backupPath, pkgRaw);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    log(`✅ Updated package.json scripts. Backup created at ${path.basename(backupPath)}`);
  } else {
    log('✅ package.json already has Android scripts');
  }
}

function ensureAndroidPrereqs() {
  const files = [
    'vite.config.android.ts',
    'android.html',
    path.join('src', 'main-android.tsx'),
    path.join('scripts', 'build-android.js'),
  ];
  let ok = true;
  for (const f of files) {
    if (!fs.existsSync(f)) {
      warn(`⚠️ Missing required file: ${f}`);
      ok = false;
    }
  }
  if (!ok) {
    warn('Some Android prerequisites are missing. The build script will try fallbacks, but you may need to pull latest from repo.');
  } else {
    log('✅ Android prerequisites present');
  }
}

function ensureAndroidPlatform() {
  const hasAndroidFolder = fs.existsSync(path.join(process.cwd(), 'android'));
  if (hasAndroidFolder) {
    log('✅ Android platform already added');
    return true;
  }
  log('➕ Adding Android platform (Capacitor)...');
  return safeRun('npx cap add android', 'npx cap add android');
}

function main() {
  log('🚀 Android setup starting...\n');

  // 1) Ensure npm scripts exist (for future convenience)
  ensurePackageScripts();

  // 2) Verify required files
  ensureAndroidPrereqs();

  // 3) Add Android platform if needed
  ensureAndroidPlatform();

  // 4) Build + Sync via our robust builder
  log('\n🏗️ Building Android web bundle and syncing with Capacitor...');
  const built = safeRun('node scripts/build-android.js', 'Android build');
  if (!built) {
    warn('Attempting direct Vite build as a fallback...');
    const viteOk = safeRun('npx vite build --config vite.config.android.ts', 'Vite Android build');
    if (viteOk) {
      // Ensure index.html exists for Capacitor
      const androidHtml = path.join('dist', 'android.html');
      const distIndex = path.join('dist', 'index.html');
      if (fs.existsSync(androidHtml)) {
        fs.copyFileSync(androidHtml, distIndex);
        log('✅ Copied dist/android.html -> dist/index.html');
      } else {
        warn('⚠️ dist/android.html not found after build');
      }
      safeRun('npx cap sync android', 'Capacitor sync android');
    } else {
      error('❌ Android build failed. See logs above.');
      process.exit(1);
    }
  }

  log('\n🎉 Android setup complete!');
  log('\nNext steps:');
  log('1) npx cap run android   # run on emulator/device');
  log('   or');
  log('   npx cap open android  # open in Android Studio');
  log('\nIf you just pulled changes: run npx cap sync again to ensure native is up to date.');
}

try {
  main();
} catch (e) {
  error(`❌ Setup failed: ${e.message}`);
  process.exit(1);
}
