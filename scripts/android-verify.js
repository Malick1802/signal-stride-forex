#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Android Build Verification Script\n');

function checkExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${description}: ${filePath}`);
  return exists;
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);
    return `${size} KB`;
  } catch {
    return 'N/A';
  }
}

function verifyWebBuild() {
  console.log('📦 Web Build Verification:');
  
  let score = 0;
  const maxScore = 6;
  
  // Check dist directory
  if (checkExists('dist', 'Build directory')) score++;
  
  // Check index.html
  if (checkExists('dist/index.html', 'Main HTML file')) {
    const size = getFileSize('dist/index.html');
    console.log(`      Size: ${size}`);
    score++;
  }
  
  // Check assets directory
  if (checkExists('dist/assets', 'Assets directory')) {
    const assetsPath = 'dist/assets';
    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    console.log(`      JS files: ${jsFiles.length} found`);
    console.log(`      CSS files: ${cssFiles.length} found`);
    
    if (jsFiles.length > 0) score++;
    if (cssFiles.length > 0) score++;
    
    // Show main files
    const mainJs = jsFiles.find(f => f.includes('main') || f.includes('index'));
    if (mainJs) {
      console.log(`      Main JS: ${mainJs} (${getFileSize(path.join(assetsPath, mainJs))})`);
      score++;
    }
    
    const mainCss = cssFiles.find(f => f.includes('main') || f.includes('index'));
    if (mainCss) {
      console.log(`      Main CSS: ${mainCss} (${getFileSize(path.join(assetsPath, mainCss))})`);
      score++;
    }
  }
  
  console.log(`\n   📊 Web Build Score: ${score}/${maxScore}\n`);
  return score >= 4; // Minimum passing score
}

function verifyAndroidPlatform() {
  console.log('📱 Android Platform Verification:');
  
  let score = 0;
  const maxScore = 5;
  
  // Check Android directory
  if (checkExists('android', 'Android platform directory')) score++;
  
  // Check AndroidManifest.xml
  if (checkExists('android/app/src/main/AndroidManifest.xml', 'Android Manifest')) score++;
  
  // Check build.gradle
  if (checkExists('android/app/build.gradle', 'App build.gradle')) score++;
  
  // Check capacitor.config.ts
  if (checkExists('capacitor.config.ts', 'Capacitor configuration')) {
    try {
      const config = fs.readFileSync('capacitor.config.ts', 'utf8');
      if (config.includes('appId') && config.includes('webDir')) {
        console.log(`      ✅ Valid Capacitor config found`);
        score++;
      } else {
        console.log(`      ❌ Invalid Capacitor config`);
      }
    } catch {
      console.log(`      ❌ Cannot read Capacitor config`);
    }
    score++;
  }
  
  // Check if www directory has content (Capacitor sync result)
  if (checkExists('android/app/src/main/assets/public', 'Capacitor web assets')) {
    const publicPath = 'android/app/src/main/assets/public';
    try {
      const files = fs.readdirSync(publicPath);
      console.log(`      📁 ${files.length} files synced to Android`);
      if (files.length > 0) score++;
    } catch {
      console.log(`      ❌ Cannot read Android web assets`);
    }
  }
  
  console.log(`\n   📊 Android Platform Score: ${score}/${maxScore}\n`);
  return score >= 3; // Minimum passing score
}

function verifyBuildScripts() {
  console.log('📜 Build Scripts Verification:');
  
  const scripts = [
    'scripts/build-android.js',
    'scripts/android-deploy.js',
    'scripts/troubleshoot-android.js',
    'scripts/android-clean.js',
    'scripts/android-setup.js'
  ];
  
  let found = 0;
  scripts.forEach(script => {
    if (checkExists(script, `Build script`)) {
      found++;
    }
  });
  
  console.log(`\n   📊 Build Scripts: ${found}/${scripts.length} found\n`);
  return found >= 3;
}

function verifyCapacitorHealth() {
  console.log('🏥 Capacitor Health Check:');
  
  try {
    console.log('   ⏳ Running Capacitor doctor...');
    const output = execSync('npx cap doctor', { encoding: 'utf8' });
    
    // Parse output for common issues
    const lines = output.split('\n');
    let issues = 0;
    
    lines.forEach(line => {
      if (line.includes('✖') || line.includes('❌') || line.includes('ERROR')) {
        console.log(`   ❌ ${line.trim()}`);
        issues++;
      } else if (line.includes('✔') || line.includes('✅')) {
        console.log(`   ✅ ${line.trim()}`);
      }
    });
    
    console.log(`\n   📊 Capacitor Health: ${issues === 0 ? 'Good' : `${issues} issues found`}\n`);
    return issues === 0;
    
  } catch (error) {
    console.log('   ❌ Capacitor doctor failed to run');
    console.log(`   💡 Try: npm install -g @capacitor/cli\n`);
    return false;
  }
}

function generateReport(webOk, androidOk, scriptsOk, capacitorOk) {
  console.log('📋 Verification Summary:');
  console.log('========================================');
  
  const checks = [
    { name: 'Web Build', status: webOk },
    { name: 'Android Platform', status: androidOk },
    { name: 'Build Scripts', status: scriptsOk },
    { name: 'Capacitor Health', status: capacitorOk }
  ];
  
  checks.forEach(check => {
    const status = check.status ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} ${check.name}`);
  });
  
  const allPassed = checks.every(check => check.status);
  
  console.log('========================================');
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your Android build is ready.');
    console.log('\n📱 Next steps:');
    console.log('1. npx cap open android (Open in Android Studio)');
    console.log('2. Build → Clean Project');
    console.log('3. Build → Rebuild Project');
    console.log('4. Run on device/emulator');
  } else {
    console.log('⚠️ Some checks failed. Please address the issues above.');
    console.log('\n🔧 Suggested fixes:');
    
    if (!webOk) {
      console.log('• Run: node scripts/build-android.js');
    }
    if (!androidOk) {
      console.log('• Run: npx cap add android');
      console.log('• Run: npx cap sync android');
    }
    if (!scriptsOk) {
      console.log('• Ensure all build scripts are present');
    }
    if (!capacitorOk) {
      console.log('• Run: npm install -g @capacitor/cli');
      console.log('• Run: npx cap doctor');
    }
  }
  
  return allPassed;
}

async function main() {
  try {
    const webOk = verifyWebBuild();
    const androidOk = verifyAndroidPlatform();
    const scriptsOk = verifyBuildScripts();
    const capacitorOk = verifyCapacitorHealth();
    
    const success = generateReport(webOk, androidOk, scriptsOk, capacitorOk);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };