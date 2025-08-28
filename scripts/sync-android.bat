@echo off
echo 🔄 Syncing Android app with latest changes...

echo 📦 Installing dependencies...
call npm install

echo 🏗️ Building for production...
call npm run build -- --config vite.config.android.ts --mode production --force

echo 📱 Copying Android HTML template...
copy android.html dist\index.html

echo 🔄 Syncing with Capacitor...
call npx cap sync android

echo ✅ Android sync complete! 
echo 📱 Run 'npx cap open android' to open in Android Studio
echo 🚀 Or run 'npx cap run android' to launch directly

pause