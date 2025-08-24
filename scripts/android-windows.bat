@echo off
echo 🚀 ForexAlert Pro - Android Build for Windows
echo.

:: Change to project directory
cd /d "%~dp0.."

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ Node.js and npm are ready
echo.

:: Step 1: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

:: Step 2: Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "android\app\build" rmdir /s /q "android\app\build"
echo ✅ Previous builds cleaned
echo.

:: Step 3: Build for Android
echo 🏗️ Building for Android...
call node scripts\build-android.js
if %errorlevel% neq 0 (
    echo ❌ Android build failed
    echo.
    echo 💡 Troubleshooting steps:
    echo 1. Run: npm install
    echo 2. Check if vite.config.android.ts exists
    echo 3. Check if android.html exists
    echo 4. Run: node scripts\troubleshoot-android.js --fix
    pause
    exit /b 1
)
echo ✅ Android build complete
echo.

:: Step 4: Add Android platform if missing
if not exist "android" (
    echo 📱 Adding Android platform...
    call npx cap add android
    if %errorlevel% neq 0 (
        echo ❌ Failed to add Android platform
        pause
        exit /b 1
    )
    echo ✅ Android platform added
    echo.
)

:: Step 5: Sync with Capacitor
echo 🔄 Syncing with Capacitor...
call npx cap sync android --force
if %errorlevel% neq 0 (
    echo ❌ Capacitor sync failed
    echo.
    echo 💡 Try running: npx cap doctor
    pause
    exit /b 1
)
echo ✅ Capacitor sync complete
echo.

:: Step 6: Clean Android project cache
echo 🧹 Cleaning Android project cache...
cd android
if exist "app\build" rmdir /s /q "app\build"
if exist ".gradle" rmdir /s /q ".gradle"
call gradlew.bat clean 2>nul
cd ..
echo ✅ Android cache cleaned
echo.

:: Success message
echo 🎉 Android APK is ready for deployment!
echo.
echo 📱 Next steps:
echo 1. Open Android Studio: npx cap open android
echo 2. In Android Studio:
echo    • File → Sync Project with Gradle Files
echo    • Build → Clean Project
echo    • Build → Rebuild Project
echo    • Run the app on your device/emulator
echo.
echo 🚀 Quick deploy: call npx cap run android
echo.

pause