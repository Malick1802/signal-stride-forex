
import React, { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import AppContent from '../components/AppContent';
import ProgressiveAuthProvider from '../components/ProgressiveAuthProvider';
import { Capacitor } from '@capacitor/core';

const Index = () => {
  useEffect(() => {
    console.log('📱 Index page loaded');
    console.log('🌐 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Current location:', window.location.href);
  }, []);

  return (
    <AuthProvider>
      <ProgressiveAuthProvider>
        <AppContent />
      </ProgressiveAuthProvider>
    </AuthProvider>
  );
};

export default Index;
