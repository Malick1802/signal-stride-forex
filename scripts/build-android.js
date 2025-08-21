#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building ForexAlert Pro for Android...\n');

try {
  // Step 1: Clean previous builds
  console.log('1️⃣ Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('✅ Clean complete\n');

  // Step 2: Build the web app with Android config
  console.log('2️⃣ Building web application for Android...');
  let built = false;
  try {
    execSync('npm run build:android', { stdio: 'inherit' });
    built = true;
    console.log('✅ Android web build (package script) complete\n');
  } catch (e1) {
    console.warn('⚠️ npm run build:android failed, trying fallback...');
    try {
      execSync('npm run build -- --config vite.config.android.ts', { stdio: 'inherit' });
      built = true;
      console.log('✅ Android web build (npm build --config) complete\n');
    } catch (e2) {
      console.warn('⚠️ npm run build -- --config failed, trying direct vite...');
      execSync('npx vite build --config vite.config.android.ts', { stdio: 'inherit' });
      built = true;
      console.log('✅ Android web build (npx vite) complete\n');
    }
  }

  // Step 3: Copy Android-specific files
  console.log('3️⃣ Setting up Android files...');
  
  // Prefer the built android.html from Vite, then ensure index.html exists for Capacitor
  const builtAndroidHtmlPath = path.join('dist', 'android.html');
  const distIndexPath = path.join('dist', 'index.html');
  if (fs.existsSync(builtAndroidHtmlPath)) {
    fs.copyFileSync(builtAndroidHtmlPath, distIndexPath);
    console.log('✅ Using built android.html as index.html');
  } else if (fs.existsSync('android.html')) {
    const androidHtml = fs.readFileSync('android.html', 'utf8');
    // Fallback: Update the script path for production - match Vite's output structure
    const updatedHtml = androidHtml.replace(
      '/src/main-android.tsx',
      './assets/main-android.js'
    );
    fs.writeFileSync(distIndexPath, updatedHtml);
    console.log('✅ Android HTML configured (fallback)');
  } else {
    console.warn('⚠️ android.html not found. Ensure vite.config.android.ts input is correct.');
  }

  // Ensure assets directory exists (Vite should have created it)
  const assetsDir = 'dist/assets';
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Quick sanity check
  if (fs.existsSync('src/main-android.tsx')) {
    console.log('✅ Android entry point ready');
  }

  console.log('✅ Android setup complete\n');

  // Step 4: Sync with Capacitor
  console.log('4️⃣ Syncing with Capacitor...');
  try {
    execSync('npx cap sync android', { stdio: 'inherit' });
    console.log('✅ Capacitor sync complete\n');
  } catch (syncError) {
    console.warn('⚠️ Capacitor sync failed - you may need to add Android platform first');
    console.warn('Run: npx cap add android\n');
  }

  console.log('🎉 Android build complete!');
  console.log('\n📱 Next steps:');
  console.log('1. Run: npx cap add android (if not done)');
  console.log('2. Run: npx cap open android');
  console.log('3. Build and run from Android Studio');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}