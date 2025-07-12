import React from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import MobileAppWrapper from './components/MobileAppWrapper'
import './index.css'

// Block browser extension interference on mobile
if (Capacitor.isNativePlatform()) {
  (window as any).chrome = undefined;
  (window as any).browser = undefined;
  // Block message port errors
  window.addEventListener('error', (e) => {
    if (e.message?.includes('message port') || e.message?.includes('extension')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
}

console.log('🚀 Starting app initialization...')
console.log('📱 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web')

const AppWithMobileSupport = () => {
  if (Capacitor.isNativePlatform()) {
    console.log('📱 Wrapping app with MobileAppWrapper for native platform')
    return (
      <MobileAppWrapper>
        <App />
      </MobileAppWrapper>
    )
  }
  
  console.log('🌐 Running on web platform')
  return <App />
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppWithMobileSupport />
  </React.StrictMode>
);
