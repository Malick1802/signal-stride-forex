#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('⚙️ Android Setup Script for Windows\n');

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

function checkRequiredFiles() {
  console.log('🔍 Checking required files...');
  
  const requiredFiles = [
    'android.html',
    'src/main-android.tsx',
    'vite.config.android.ts',
    'capacitor.config.ts'
  ];
  
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    console.error('❌ Missing required files:');
    missing.forEach(file => console.error(`   • ${file}`));
    console.log('\n💡 Please ensure these files exist before running setup.');
    return false;
  }
  
  console.log('✅ All required files found\n');
  return true;
}

async function main() {
  try {
    // Check prerequisites
    if (!checkRequiredFiles()) {
      process.exit(1);
    }
    
    console.log('1️⃣ Installing dependencies...');
    if (!runCommand('npm install', 'Installing Node.js dependencies', { exitOnFail: true })) {
      throw new Error('Dependency installation failed');
    }
    
    console.log('2️⃣ Adding Capacitor Android platform...');
    if (!fs.existsSync('android')) {
      if (!runCommand('npx cap add android', 'Adding Android platform', { exitOnFail: true })) {
        throw new Error('Failed to add Android platform');
      }
    } else {
      console.log('ℹ️ Android platform already exists, updating...');
      if (!runCommand('npx cap update android', 'Updating Android platform')) {
        console.warn('⚠️ Android update failed, continuing...');
      }
    }
    
    console.log('3️⃣ Building web assets for Android...');
    if (!runCommand('node scripts/build-android.js', 'Building Android web assets', { exitOnFail: true })) {
      throw new Error('Android build failed');
    }
    
    console.log('4️⃣ Syncing with Capacitor...');
    if (!runCommand('npx cap sync android', 'Syncing Capacitor', { exitOnFail: true })) {
      throw new Error('Capacitor sync failed');
    }
    
    console.log('5️⃣ Running Capacitor doctor...');
    runCommand('npx cap doctor', 'Running Capacitor diagnostics');
    
    console.log('🎉 Android setup complete!');
    console.log('\n📱 Your project is ready for Android development!');
    console.log('\n🚀 Quick commands:');
    console.log('• node scripts\\build-android.js   - Build for Android');
    console.log('• node scripts\\android-deploy.js  - Full deployment');
    console.log('• npx cap open android            - Open in Android Studio');
    console.log('• npx cap run android             - Run on device/emulator');
    
    console.log('\n💡 For Windows users:');
    console.log('• Run scripts\\android-windows.bat for guided setup');
    console.log('• Ensure Android Studio and Java SDK are installed');
    console.log('• Enable Developer Options on your Android device');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure Node.js and npm are installed');
    console.log('2. Check internet connectivity');
    console.log('3. Run: node scripts\\troubleshoot-android.js --fix');
    console.log('4. Verify Android SDK is properly configured');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };