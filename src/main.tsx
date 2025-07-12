import React from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import MobileAppWrapper from './components/MobileAppWrapper'
import './index.css'

// Mobile debugging
console.log('🚀 App starting...', {
  platform: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
  userAgent: navigator.userAgent
});

const AppWithMobileSupport = () => {
  if (Capacitor.isNativePlatform()) {
    console.log('📱 Mobile platform detected, using MobileAppWrapper');
    return (
      <MobileAppWrapper>
        <App />
      </MobileAppWrapper>
    );
  }
  
  console.log('🌐 Web platform detected, using standard App');
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppWithMobileSupport />
  </React.StrictMode>
);
