@echo off
echo 🔄 Syncing Android app with latest changes...

echo 📂 Current directory: %CD%
echo 📱 Checking for android folder...
if exist "android" (
    echo ✅ Android folder found
) else (
    echo ❌ Android folder not found - run 'npx cap add android' first
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

echo 🏗️ Building for production...
call npm run build -- --config vite.config.android.ts --mode production

echo 📋 Copying android.html to dist/index.html...
copy android.html dist\index.html /Y


echo 🔄 Syncing with Capacitor...
call npx cap sync android

echo ✅ Android sync complete! 
echo 📱 Run 'npx cap open android' to open in Android Studio
echo 🚀 Or run 'npx cap run android' to launch directly

pause