import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import AndroidApp from './AndroidApp';

// Initialize Capacitor for Android native platform
console.log('🚀 Android native entry point starting');
console.log('📱 Platform:', Capacitor.getPlatform());
console.log('🔧 Is native platform:', Capacitor.isNativePlatform());

// Ensure Capacitor is properly initialized for native platform
if (Capacitor.isNativePlatform()) {
  console.log('✅ Capacitor native platform detected');
  
  // Initialize core Capacitor plugins for Android
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('📱 App state changed:', isActive ? 'active' : 'background');
    });
  }).catch(err => console.warn('⚠️ App plugin not available:', err));
  
} else {
  console.warn('⚠️ Not running on native platform - some features may not work');
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);
root.render(<AndroidApp />);

console.log('✅ Android native app rendered');