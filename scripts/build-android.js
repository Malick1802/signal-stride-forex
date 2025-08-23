#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building ForexAlert Pro for Android...\n');

// Helper function to run commands with better error handling
function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} complete\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Verification function
function verifyBuild() {
  const distExists = fs.existsSync('dist');
  const indexExists = fs.existsSync('dist/index.html');
  const assetsExists = fs.existsSync('dist/assets');
  
  console.log('🔍 Build verification:');
  console.log(`   dist/ exists: ${distExists ? '✅' : '❌'}`);
  console.log(`   index.html exists: ${indexExists ? '✅' : '❌'}`);
  console.log(`   assets/ exists: ${assetsExists ? '✅' : '❌'}`);
  
  if (assetsExists) {
    const assetFiles = fs.readdirSync('dist/assets');
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
    console.log(`   JS files: ${jsFiles.length} found`);
    console.log(`   CSS files: ${cssFiles.length} found`);
  }
  
  return distExists && indexExists && assetsExists;
}

try {
  // Step 1: Clean previous builds and caches
  console.log('1️⃣ Comprehensive cleanup...');
  
  // Remove build artifacts
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Clear Android build cache
  if (fs.existsSync('android/app/build')) {
    fs.rmSync('android/app/build', { recursive: true, force: true });
  }
  
  // Clear Vite caches
  const viteCaches = fs.readdirSync('node_modules').filter(dir => 
    dir.startsWith('.vite-cache') || dir.startsWith('.vite')
  );
  viteCaches.forEach(cache => {
    const cachePath = path.join('node_modules', cache);
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
    }
  });
  
  console.log('✅ Comprehensive cleanup complete\n');

  // Step 2: Build the web app with Android config
  console.log('2️⃣ Building web application for Android...');
  let built = false;
  
  // Try multiple build approaches with verification
  const buildCommands = [
    { cmd: 'npm run build:android', desc: 'Package script build' },
    { cmd: 'npx vite build --config vite.config.android.ts --mode production', desc: 'Direct Vite build (production)' },
    { cmd: 'npx vite build --config vite.config.android.ts', desc: 'Direct Vite build (default)' }
  ];
  
  for (const { cmd, desc } of buildCommands) {
    if (runCommand(cmd, desc)) {
      if (verifyBuild()) {
        built = true;
        break;
      } else {
        console.warn(`⚠️ Build succeeded but verification failed for: ${desc}`);
      }
    }
  }
  
  if (!built) {
    throw new Error('All build attempts failed');
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

  // Final verification
  if (!verifyBuild()) {
    throw new Error('Final build verification failed');
  }

  console.log('🎉 Android build complete and verified!');
  console.log('\n📱 Next steps for deployment:');
  console.log('1. npx cap sync android (to sync changes)');
  console.log('2. npx cap open android (opens Android Studio)');
  console.log('3. In Android Studio:');
  console.log('   • Build → Clean Project');
  console.log('   • Build → Rebuild Project'); 
  console.log('   • Run the app on device/emulator');
  console.log('\n🚀 Quick deploy: npm run android:release');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}