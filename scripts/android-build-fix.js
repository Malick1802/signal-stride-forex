#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Android Build Fix - Ensuring proper build process');

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
    console.log('1. Building web app with Android configuration...');
    
    // Try multiple build approaches
    const buildCommands = [
      'npx vite build --config vite.config.android.ts',
      'npm run build -- --config vite.config.android.ts',
      'npx vite build --mode production'
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
    
    console.log('2. Ensuring Android HTML is properly configured...');
    
    // Copy android.html to dist/index.html
    const androidHtml = path.join(process.cwd(), 'android.html');
    const distIndex = path.join(process.cwd(), 'dist', 'index.html');
    
    if (fs.existsSync(androidHtml)) {
      fs.copyFileSync(androidHtml, distIndex);
      console.log('✅ Android HTML configured');
    }
    
    console.log('3. Syncing with Capacitor...');
    if (run('npx cap sync android')) {
      console.log('✅ Android build completed successfully!');
      console.log('\nNext steps:');
      console.log('- Run: npx cap run android');
      console.log('- Or: npx cap open android');
      return true;
    } else {
      console.log('❌ Capacitor sync failed');
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