
import React, { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import AppContent from '../components/AppContent';
import MobileAppContent from '../components/MobileAppContent';
import ProgressiveAuthProvider from '../components/ProgressiveAuthProvider';
import { Capacitor } from '@capacitor/core';

const Index = () => {
  useEffect(() => {
    console.log('📱 Index page loaded');
    console.log('🌐 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Current location:', window.location.href);
  }, []);

  // Use simplified mobile content for native platforms
  const ContentComponent = Capacitor.isNativePlatform() ? MobileAppContent : AppContent;

  return (
    <AuthProvider>
      <ProgressiveAuthProvider>
        <ContentComponent />
      </ProgressiveAuthProvider>
    </AuthProvider>
  );
};

export default Index;
