#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Android Build Process Starting...');

function run(cmd, options = {}) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`Failed to run: ${cmd}`);
    console.error(error.message);
    return false;
  }
}

function main() {
  try {
    console.log('1. Cleaning dist directory...');
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    
    console.log('2. Building web app for Android...');
    
    // Try multiple build approaches without --force flag
    const buildCommands = [
      'npm run build:android',
      'npm run build -- --config vite.config.android.ts',
      'npx vite build --config vite.config.android.ts --mode production'
    ];
    
    let buildSuccess = false;
    for (const cmd of buildCommands) {
      console.log(`Trying: ${cmd}`);
      if (run(cmd)) {
        buildSuccess = true;
        break;
      }
    }
    
    if (!buildSuccess) {
      console.error('❌ All build commands failed');
      return false;
    }
    
    console.log('3. Setting up Android HTML...');
    
    // Copy android.html to dist/index.html if it exists
    const androidHtml = path.join(process.cwd(), 'android.html');
    const distIndex = path.join(process.cwd(), 'dist', 'index.html');
    
    if (fs.existsSync(androidHtml)) {
      fs.copyFileSync(androidHtml, distIndex);
      console.log('✅ Android HTML configured');
    } else {
      console.log('⚠️ android.html not found, using build output');
    }
    
    // Ensure assets directory exists
    const assetsDir = path.join(process.cwd(), 'dist', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    // Sanity check for Android entry point
    const androidEntry = path.join(process.cwd(), 'src', 'main-android.tsx');
    if (fs.existsSync(androidEntry)) {
      console.log('✅ Android entry point found');
    } else {
      console.log('⚠️ Android entry point not found at src/main-android.tsx');
    }
    
    console.log('4. Syncing with Capacitor...');
    if (run('npx cap sync android')) {
      console.log('✅ Android build completed successfully!');
      console.log('\nNext steps:');
      console.log('- Run: npx cap run android');
      console.log('- Or: npx cap open android');
      return true;
    } else {
      console.log('❌ Capacitor sync failed');
      console.log('\nTry:');
      console.log('- npx cap add android (if Android platform missing)');
      console.log('- npx cap update android');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Build process failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };