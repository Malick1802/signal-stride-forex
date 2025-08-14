# 📱 Offline Mobile App Update Workflow

## Overview
This workflow allows you to update your mobile app with changes from Lovable while keeping the app completely offline (no dependency on development server).

## Step-by-Step Process

### 1. Make Changes in Lovable
- Edit your components, landing page, styles, etc. in the Lovable editor
- Test changes in the web preview to ensure they work correctly

### 2. Export to GitHub (if not already done)
- Click the GitHub button in the top right of Lovable
- Export your project to your GitHub repository

### 3. Pull Latest Changes
```bash
git pull origin main
```

### 4. Install Dependencies (if first time)
```bash
npm install
```

### 5. Build the Updated Web Assets
```bash
npm run build
```
This creates the `dist` folder with all your React components, CSS, and assets bundled as static files.

### 6. Sync with Capacitor
```bash
npx cap sync
```
This copies the new `dist` files to the Android project, updating the bundled web assets in the native app.

### 7. Build and Deploy to Device
**Option A - Direct Run:**
```bash
npx cap run android
```

**Option B - Open in Android Studio:**
```bash
npx cap open android
```
Then build and run from Android Studio.

## Important Notes

### ✅ Benefits of This Approach
- App works completely offline
- No dependency on external URLs
- Production-ready deployment
- All assets bundled in the APK
- Better performance (no network requests for UI)

### 🔄 When to Repeat This Process
- After any changes to components, styles, or functionality
- When updating the landing page
- After modifying any React code

### 📱 App Icons & Splash Screen
Your Android app icons and splash screen have been updated to match your uploaded icon. The changes will be applied after running `npx cap sync` and rebuilding.

### 🚀 Quick Update Commands
For frequent updates, you can chain the commands:
```bash
git pull && npm run build && npx cap sync && npx cap run android
```

## Troubleshooting

### Build Issues
If you encounter "Duplicate resources" errors during build:
```bash
# Clean Android build cache
cd android && ./gradlew clean && cd ..
# Sync and build
npx cap sync && npx cap run android
```

### App Updates Not Showing
- If changes don't appear, ensure you ran `npm run build` before `npx cap sync`
- Clear app data on your phone if needed: Settings > Apps > ForexAlert > Storage > Clear Data
- Check that your Android device is connected and recognized by `adb devices`

### Icon Issues Fixed
✅ Resolved duplicate Android app icon resources (.png/.webp conflicts)
✅ Added proper foreground icons for all densities