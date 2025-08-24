# Windows Android Deployment Guide

## Quick Start (Recommended)

For the fastest Android deployment on Windows, use our automated batch script:

```batch
scripts\android-windows.bat
```

This script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Clean previous builds
- ✅ Build for Android
- ✅ Sync with Capacitor
- ✅ Clean Android caches
- ✅ Prepare for deployment

## Manual Step-by-Step Process

### 1. Prerequisites Check

Ensure you have:
- Node.js (v16 or higher)
- npm
- Android Studio
- Java JDK (v8 or higher)
- Android SDK

### 2. Install Dependencies

```batch
npm install
```

### 3. Clean Previous Builds

```batch
node scripts\android-clean.js
```

### 4. Build for Android

```batch
node scripts\build-android.js
```

### 5. Add Android Platform (if needed)

```batch
npx cap add android
```

### 6. Sync with Capacitor

```batch
npx cap sync android --force
```

### 7. Clean Android Project Cache

```batch
cd android
gradlew.bat clean
cd ..
```

### 8. Deploy to Device

**Option A: Use Android Studio**
```batch
npx cap open android
```
Then in Android Studio:
- File → Sync Project with Gradle Files
- Build → Clean Project
- Build → Rebuild Project
- Run on device/emulator

**Option B: Direct Command Line**
```batch
npx cap run android
```

## Troubleshooting Windows-Specific Issues

### "vite is not recognized" Error

**Solution:**
```batch
npm install
npm run build
```

### "gradlew is not recognized" Error

**Solution:**
Navigate to android directory first:
```batch
cd android
.\gradlew.bat clean
cd ..
```

### Android Studio Not Opening

**Solution:**
1. Ensure Android Studio is in your PATH
2. Or manually open: `android/` folder in Android Studio

### APK Not Updating

**Symptoms:** Changes don't appear in the APK after building

**Complete Reset Solution:**
```batch
:: Clean everything
node scripts\android-clean.js

:: Remove Android platform
rmdir /s /q android

:: Rebuild from scratch
npx cap add android
node scripts\build-android.js
npx cap sync android --force

:: Clean Android caches
cd android
.\gradlew.bat clean
cd ..
```

### Gradle Sync Failed

**Solution:**
1. Open Android Studio
2. File → Invalidate Caches and Restart
3. File → Sync Project with Gradle Files
4. Build → Clean Project

### Device Not Detected

**Solution:**
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Install device drivers (if Windows doesn't auto-install)
4. Run: `adb devices` to verify connection

## Build Verification

To verify your build is correct:

```batch
node scripts\android-verify.js
```

This will check:
- ✅ Web build artifacts
- ✅ Android platform setup
- ✅ Capacitor configuration
- ✅ Build scripts availability

## Performance Tips for Windows

### 1. Use Windows Terminal
For better performance and color support:
```batch
winget install Microsoft.WindowsTerminal
```

### 2. Exclude from Windows Defender
Add these directories to Windows Defender exclusions:
- `node_modules/`
- `android/`
- `dist/`

### 3. Use SSD Storage
Ensure your project is on an SSD for faster build times.

### 4. PowerShell Alternative
You can also run scripts in PowerShell:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
node scripts/build-android.js
```

## Emergency Reset

If everything fails, use the nuclear option:

```batch
:: Delete everything
rmdir /s /q node_modules
rmdir /s /q android
rmdir /s /q dist
del package-lock.json

:: Rebuild from scratch
npm install
npx cap add android
node scripts\android-setup.js
```

## Common Windows Commands

| Task | Windows Command |
|------|----------------|
| Clean build | `node scripts\android-clean.js` |
| Build app | `node scripts\build-android.js` |
| Full setup | `node scripts\android-setup.js` |
| Verify build | `node scripts\android-verify.js` |
| Troubleshoot | `node scripts\troubleshoot-android.js --fix` |
| Quick deploy | `scripts\android-windows.bat` |

## Success Indicators

✅ **Build Success:**
- `dist/` directory exists with assets
- No error messages during build
- `dist/index.html` references correct assets

✅ **Sync Success:**
- `android/app/src/main/assets/public/` contains web files
- No Capacitor sync errors
- `npx cap doctor` shows green checkmarks

✅ **Deploy Success:**
- App installs on device
- Latest changes are visible
- No runtime errors in Android Studio logcat

## Support

If you're still having issues:

1. Run the diagnostic tool:
   ```batch
   node scripts\troubleshoot-android.js --fix
   ```

2. Check the build verification:
   ```batch
   node scripts\android-verify.js
   ```

3. Review the Android logs in Android Studio's Logcat

Remember: Always clean builds when switching between development and production modes!