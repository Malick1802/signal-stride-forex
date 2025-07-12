
import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from '../contexts/AuthContext';
import ProgressiveAuthProvider from '../components/ProgressiveAuthProvider';
import MobileAppContent from '../components/MobileAppContent';

const Index = () => {
  useEffect(() => {
    console.log('📱 Index page loaded');
    console.log('🌐 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Current location:', window.location.href);
    console.log('🔧 User agent:', navigator.userAgent);
  }, []);

  return (
    <AuthProvider>
      <ProgressiveAuthProvider>
        <MobileAppContent />
      </ProgressiveAuthProvider>
    </AuthProvider>
  );
};

export default Index;
