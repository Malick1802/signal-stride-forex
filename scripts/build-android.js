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

  // Step 2: Build the web app
  console.log('2️⃣ Building web application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Web build complete\n');

  // Step 3: Copy Android-specific files
  console.log('3️⃣ Setting up Android files...');
  
  // Copy android.html to dist as index.html for Android
  if (fs.existsSync('android.html')) {
    const androidHtml = fs.readFileSync('android.html', 'utf8');
    // Update the script path for production
    const updatedHtml = androidHtml.replace(
      '/src/main-android.tsx',
      '/assets/main-android.js'
    );
    fs.writeFileSync('dist/index.html', updatedHtml);
    console.log('✅ Android HTML configured');
  }

  // Ensure main-android.tsx is built
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