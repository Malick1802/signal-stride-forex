#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Android Cleanup Script\n');

function runCommand(command, description, options = {}) {
  try {
    console.log(`⏳ ${description}...`);
    execSync(command, { stdio: options.silent ? 'ignore' : 'inherit', ...options });
    console.log(`✅ ${description} complete`);
    return true;
  } catch (error) {
    if (!options.optional) {
      console.error(`❌ ${description} failed:`, error.message);
    } else {
      console.log(`⚠️ ${description} skipped (optional)`);
    }
    return false;
  }
}

function removeDirectory(dirPath, description) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed ${description}`);
    } else {
      console.log(`ℹ️ ${description} doesn't exist, skipping`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed to remove ${description}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('1️⃣ Cleaning build artifacts...');
    
    // Remove web build artifacts
    removeDirectory('dist', 'dist/ directory');
    removeDirectory('build', 'build/ directory');
    
    // Remove Android build artifacts
    removeDirectory('android/app/build', 'Android app build cache');
    removeDirectory('android/.gradle', 'Android Gradle cache');
    removeDirectory('android/build', 'Android project build cache');
    
    console.log('\n2️⃣ Cleaning Node.js caches...');
    
    // Remove node_modules/.vite and .cache directories
    removeDirectory('node_modules/.vite', 'Vite cache');
    removeDirectory('node_modules/.cache', 'Node cache');
    removeDirectory('.vite', 'Vite temp cache');
    
    console.log('\n3️⃣ Cleaning Capacitor caches...');
    
    // Clean Capacitor caches (optional)
    runCommand('npx cap doctor', 'Capacitor health check', { optional: true, silent: true });
    
    console.log('\n4️⃣ Platform-specific cleanup...');
    
    // Windows-specific cleanup
    if (process.platform === 'win32') {
      runCommand('del /s /q "%TEMP%\\capacitor*" 2>nul', 'Windows temp files', { optional: true, silent: true });
    } else {
      runCommand('rm -rf /tmp/capacitor* 2>/dev/null', 'Unix temp files', { optional: true, silent: true });
    }
    
    console.log('\n5️⃣ Gradle cleanup (if Android exists)...');
    
    if (fs.existsSync('android')) {
      const cwd = process.cwd();
      process.chdir('android');
      
      if (process.platform === 'win32') {
        runCommand('gradlew.bat clean', 'Gradle clean (Windows)', { optional: true });
      } else {
        runCommand('./gradlew clean', 'Gradle clean (Unix)', { optional: true });
      }
      
      process.chdir(cwd);
    } else {
      console.log('ℹ️ Android platform not found, skipping Gradle cleanup');
    }
    
    console.log('\n🎉 Cleanup complete!');
    console.log('\n📱 Next steps:');
    console.log('1. npm run android:build (or node scripts/build-android.js)');
    console.log('2. npx cap sync android');
    console.log('3. npx cap run android');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };