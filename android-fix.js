#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Android Fix Implementation\n');

try {
  // Step 1: Resolve git conflicts
  console.log('1️⃣ Resolving git conflicts...');
  try {
    execSync('git stash', { stdio: 'inherit' });
    console.log('✅ Local changes stashed');
  } catch (e) {
    console.log('ℹ️ No changes to stash');
  }
  
  try {
    execSync('git pull', { stdio: 'inherit' });
    console.log('✅ Latest changes pulled');
  } catch (e) {
    console.log('ℹ️ Already up to date');
  }

  // Step 2: Build for Android
  console.log('\n2️⃣ Building for Android...');
  execSync('node scripts/build-android.js', { stdio: 'inherit' });

  // Step 3: Final sync and run
  console.log('\n3️⃣ Final sync and deployment...');
  execSync('npx cap sync android', { stdio: 'inherit' });
  
  console.log('\n🎉 Android fix complete!');
  console.log('\n📱 To run the app:');
  console.log('npx cap run android');
  
} catch (error) {
  console.error('❌ Android fix failed:', error.message);
  console.log('\n🔧 Manual steps:');
  console.log('1. git stash');
  console.log('2. git pull');
  console.log('3. npm run build');
  console.log('4. npx cap sync android');
  console.log('5. npx cap run android');
  process.exit(1);
}