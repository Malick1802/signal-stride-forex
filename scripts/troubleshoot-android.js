#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Android Troubleshooting Script\n');

// Check system requirements
function checkSystemRequirements() {
  console.log('📋 System Requirements Check:');
  
  const checks = [
    {
      name: 'Node.js',
      check: () => {
        try {
          const version = execSync('node --version', { encoding: 'utf8' }).trim();
          return { status: true, info: version };
        } catch {
          return { status: false, info: 'Not installed' };
        }
      }
    },
    {
      name: 'npm',
      check: () => {
        try {
          const version = execSync('npm --version', { encoding: 'utf8' }).trim();
          return { status: true, info: version };
        } catch {
          return { status: false, info: 'Not installed' };
        }
      }
    },
    {
      name: 'Android Studio',
      check: () => {
        try {
          execSync('which android-studio || which studio', { encoding: 'utf8' });
          return { status: true, info: 'Found' };
        } catch {
          return { status: false, info: 'Not found in PATH' };
        }
      }
    },
    {
      name: 'Java/JDK',
      check: () => {
        try {
          const version = execSync('java -version 2>&1 | head -n 1', { encoding: 'utf8' }).trim();
          return { status: true, info: version };
        } catch {
          return { status: false, info: 'Not installed' };
        }
      }
    }
  ];
  
  checks.forEach(({ name, check }) => {
    const result = check();
    const status = result.status ? '✅' : '❌';
    console.log(`   ${status} ${name}: ${result.info}`);
  });
  
  console.log('');
}

// Check project files
function checkProjectFiles() {
  console.log('📁 Project Files Check:');
  
  const requiredFiles = [
    { path: 'package.json', desc: 'Package configuration' },
    { path: 'android.html', desc: 'Android HTML entry' },
    { path: 'src/main-android.tsx', desc: 'Android React entry' },
    { path: 'vite.config.android.ts', desc: 'Android Vite config' },
    { path: 'capacitor.config.ts', desc: 'Capacitor configuration' },
    { path: 'scripts/build-android.js', desc: 'Android build script' }
  ];
  
  requiredFiles.forEach(({ path: filePath, desc }) => {
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${filePath} - ${desc}`);
    
    if (exists && filePath.endsWith('.json')) {
      try {
        JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`      📝 Valid JSON format`);
      } catch {
        console.log(`      ⚠️ Invalid JSON format`);
      }
    }
  });
  
  console.log('');
}

// Check Android platform
function checkAndroidPlatform() {
  console.log('📱 Android Platform Check:');
  
  const androidExists = fs.existsSync('android');
  console.log(`   ${androidExists ? '✅' : '❌'} Android platform exists`);
  
  if (androidExists) {
    const manifestExists = fs.existsSync('android/app/src/main/AndroidManifest.xml');
    const gradleExists = fs.existsSync('android/app/build.gradle');
    
    console.log(`   ${manifestExists ? '✅' : '❌'} AndroidManifest.xml exists`);
    console.log(`   ${gradleExists ? '✅' : '❌'} build.gradle exists`);
  }
  
  console.log('');
}

// Check build artifacts
function checkBuildArtifacts() {
  console.log('🏗️ Build Artifacts Check:');
  
  const distExists = fs.existsSync('dist');
  console.log(`   ${distExists ? '✅' : '❌'} dist/ directory exists`);
  
  if (distExists) {
    const indexExists = fs.existsSync('dist/index.html');
    const assetsExists = fs.existsSync('dist/assets');
    
    console.log(`   ${indexExists ? '✅' : '❌'} dist/index.html exists`);
    console.log(`   ${assetsExists ? '✅' : '❌'} dist/assets/ directory exists`);
    
    if (assetsExists) {
      const assets = fs.readdirSync('dist/assets');
      const jsFiles = assets.filter(f => f.endsWith('.js'));
      const cssFiles = assets.filter(f => f.endsWith('.css'));
      
      console.log(`   📦 Assets found: ${jsFiles.length} JS, ${cssFiles.length} CSS files`);
    }
  }
  
  console.log('');
}

// Provide solutions
function provideSolutions() {
  console.log('💡 Common Solutions:');
  console.log('');
  
  console.log('🔄 Build Issues:');
  console.log('   • npm run android:clean');
  console.log('   • npm run android:build');
  console.log('   • npm run android:verify');
  console.log('');
  
  console.log('📱 Capacitor Issues:');
  console.log('   • npx cap add android (if platform missing)');
  console.log('   • npx cap sync android --force');
  console.log('   • npx cap doctor (diagnose issues)');
  console.log('');
  
  console.log('🎯 Android Studio Issues:');
  console.log('   • File → Invalidate Caches and Restart');
  console.log('   • Build → Clean Project');
  console.log('   • Build → Rebuild Project');
  console.log('   • Tools → SDK Manager (update Android SDK)');
  console.log('');
  
  console.log('🚀 Complete Reset:');
  console.log('   • npm run android:clean');
  console.log('   • rm -rf android/ (then npx cap add android)');
  console.log('   • npm run android:setup');
  console.log('   • npm run android:deploy');
}

// Run diagnostics
function runDiagnostics() {
  try {
    checkSystemRequirements();
    checkProjectFiles();
    checkAndroidPlatform();
    checkBuildArtifacts();
    provideSolutions();
    
    console.log('🎉 Troubleshooting scan complete!');
    console.log('\n🔍 Next steps based on findings above.');
    
  } catch (error) {
    console.error('❌ Troubleshooting failed:', error.message);
  }
}

// Auto-fix common issues
function autoFix() {
  console.log('🔧 Auto-fixing common issues...\n');
  
  try {
    // Ensure Android platform exists
    if (!fs.existsSync('android')) {
      console.log('Adding Android platform...');
      execSync('npx cap add android', { stdio: 'inherit' });
    }
    
    // Clean and rebuild
    console.log('Cleaning build artifacts...');
    execSync('npm run android:clean', { stdio: 'inherit' });
    
    console.log('Building for Android...');
    execSync('npm run android:build', { stdio: 'inherit' });
    
    console.log('Syncing with Capacitor...');
    execSync('npx cap sync android', { stdio: 'inherit' });
    
    console.log('✅ Auto-fix complete! Try running your app now.');
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error.message);
    console.log('Please run manual troubleshooting: npm run android:troubleshoot');
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--fix')) {
    autoFix();
  } else {
    runDiagnostics();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runDiagnostics, autoFix };