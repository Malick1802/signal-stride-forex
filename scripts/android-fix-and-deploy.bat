@echo off
echo 🚀 ForexAlert Pro - Fix Android Issues and Deploy
echo.

:: Change to project directory
cd /d "%~dp0.."

echo 📱 Fixing Android build and sync issues...
echo.

:: Step 1: Force clean everything
echo 1️⃣ Deep cleaning all caches...
if exist "dist" rmdir /s /q "dist"
if exist "android\app\build" rmdir /s /q "android\app\build"
if exist "android\.gradle" rmdir /s /q "android\.gradle"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

:: Step 2: Build with Android config (force new build)
echo 2️⃣ Building with Android configuration...
call npx vite build --config vite.config.android.ts --mode production --force
if %errorlevel% neq 0 (
    echo ❌ Android build failed
    pause
    exit /b 1
)

:: Step 3: Verify build output
echo 3️⃣ Verifying build...
if not exist "dist\index.html" (
    echo ❌ dist/index.html not found
    pause
    exit /b 1
)

:: Step 4: Force Capacitor sync with cleaning
echo 4️⃣ Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Capacitor sync failed
    pause
    exit /b 1
)

:: Step 5: Clean Android cache again
echo 5️⃣ Cleaning Android project cache...
cd android
if exist "app\build" rmdir /s /q "app\build"
if exist ".gradle" rmdir /s /q ".gradle"
call gradlew.bat clean 2>nul
cd ..

echo ✅ Android fix and deploy complete!
echo.
echo 📱 Your Android app should now update with latest changes!
echo 🚀 Run: npx cap run android
echo 🔧 Or open Android Studio: npx cap open android
echo.

pause