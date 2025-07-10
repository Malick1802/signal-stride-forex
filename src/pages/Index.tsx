
import React, { useEffect } from 'react';
import AppContent from '../components/AppContent';
import { Capacitor } from '@capacitor/core';

const Index = () => {
  useEffect(() => {
    console.log('📱 Index page loaded');
    console.log('🌐 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Current location:', window.location.href);
  }, []);

  return <AppContent />;
};

export default Index;
