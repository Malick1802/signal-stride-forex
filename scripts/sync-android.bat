@echo off
echo Starting Android build and sync process...

echo.
echo Step 1: Building Android application...
call npm run build:android
if %errorlevel% neq 0 (
    echo Build failed, trying alternative build command...
    call npm run build -- --config vite.config.android.ts
    if %errorlevel% neq 0 (
        echo Alternative build failed, trying direct vite build...
        call npx vite build --config vite.config.android.ts --mode production
        if %errorlevel% neq 0 (
            echo All build attempts failed!
            pause
            exit /b 1
        )
    )
)

echo.
echo Step 2: Copying android.html to dist/index.html...
if exist "android.html" (
    copy "android.html" "dist\index.html" >nul
    echo ✅ Android HTML copied successfully
) else (
    echo ⚠️ android.html not found, using existing dist/index.html
)

echo.
echo Step 3: Syncing with Capacitor Android platform...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Capacitor sync failed!
    echo.
    echo You may need to:
    echo 1. Run: npx cap add android
    echo 2. Run: npx cap update android
    echo 3. Then try this script again
    pause
    exit /b 1
)

echo.
echo ✅ Android build and sync completed successfully!
echo.
echo Next steps:
echo 1. Run: npx cap run android (to run on emulator/device)
echo 2. Or open Android Studio: npx cap open android
echo.
pause