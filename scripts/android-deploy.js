#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Android Deployment Script\n');

// Helper function to run commands with better error handling
function runCommand(command, description, options = {}) {
  try {
    console.log(`⏳ ${description}...`);
    execSync(command, { stdio: 'inherit', ...options });
    console.log(`✅ ${description} complete\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (options.exitOnFail) {
      process.exit(1);
    }
    return false;
  }
}

// Check prerequisites
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  const checks = [
    { file: 'android.html', desc: 'Android HTML entry' },
    { file: 'src/main-android.tsx', desc: 'Android React entry' },
    { file: 'vite.config.android.ts', desc: 'Android Vite config' },
    { file: 'capacitor.config.ts', desc: 'Capacitor config' }
  ];
  
  const missing = checks.filter(check => !fs.existsSync(check.file));
  
  if (missing.length > 0) {
    console.error('❌ Missing required files:');
    missing.forEach(item => console.error(`   • ${item.file} (${item.desc})`));
    return false;
  }
  
  console.log('✅ All prerequisites found\n');
  return true;
}

// Backup function for development
function createBackup() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const backupDir = `backups/android-${timestamp}`;
  
  try {
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups');
    }
    
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup critical files
    const filesToBackup = ['package.json', 'capacitor.config.ts', 'android.html'];
    filesToBackup.forEach(file => {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(backupDir, file));
      }
    });
    
    console.log(`📦 Backup created: ${backupDir}\n`);
    return backupDir;
  } catch (error) {
    console.warn('⚠️ Could not create backup:', error.message);
    return null;
  }
}

// Main deployment function
async function main() {
  try {
    // Check prerequisites
    if (!checkPrerequisites()) {
      process.exit(1);
    }
    
    // Create backup
    createBackup();
    
    // Build for Android
    console.log('1️⃣ Building for Android...');
    if (!runCommand('node scripts/build-android.js', 'Android build', { exitOnFail: true })) {
      throw new Error('Build failed');
    }
    
    // Sync with Capacitor
    console.log('2️⃣ Syncing with Capacitor...');
    if (!runCommand('npx cap sync android', 'Capacitor sync', { exitOnFail: true })) {
      throw new Error('Capacitor sync failed');
    }
    
    // Optional: Open Android Studio
    console.log('3️⃣ Opening Android Studio...');
    const openStudio = process.argv.includes('--open-studio');
    if (openStudio) {
      runCommand('npx cap open android', 'Opening Android Studio');
    }
    
    console.log('🎉 Deployment complete!');
    console.log('\n📱 Final steps in Android Studio:');
    console.log('1. Build → Clean Project');
    console.log('2. Build → Rebuild Project');
    console.log('3. Run on device/emulator');
    
    if (!openStudio) {
      console.log('\n💡 To open Android Studio: npm run android:release');
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check that Android Studio is installed');
    console.log('2. Verify Android SDK is configured');
    console.log('3. Run: npm run android:clean && npm run android:build');
    console.log('4. Check capacitor.config.ts settings');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, runCommand, checkPrerequisites };