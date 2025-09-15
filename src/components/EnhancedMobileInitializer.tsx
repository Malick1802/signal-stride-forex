import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useBackgroundTaskManager } from '@/hooks/useBackgroundTaskManager';
import { EnhancedMobileNotificationManager } from '@/utils/enhancedMobileNotifications';

interface EnhancedMobileInitializerProps {
  onInitializationComplete?: () => void;
  onStatusUpdate?: (status: string) => void;
}

export const EnhancedMobileInitializer: React.FC<EnhancedMobileInitializerProps> = ({ 
  onInitializationComplete,
  onStatusUpdate 
}) => {
  const { 
    startBackgroundTask,
    requestBatteryOptimizationExemption,
    acquireWakeLock 
  } = useBackgroundTaskManager({
    enableWakeLock: true,
    onAppStateChange: (state) => {
      console.log(`📱 App state: ${state.isActive ? 'active' : 'background'}`);
      onStatusUpdate?.(`App ${state.isActive ? 'activated' : 'backgrounded'}`);
    }
  });

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping enhanced mobile initialization');
      onInitializationComplete?.();
      return;
    }

    console.log('🔄 Starting enhanced mobile initialization...');
    
    const initializeEnhancedFeatures = async () => {
      try {
        console.log('Configuring battery optimization...');
        onStatusUpdate?.('Configuring battery optimization...');
        
        // Request battery optimization exemption
        await requestBatteryOptimizationExemption();
        
        console.log('Setting up enhanced notifications...');
        onStatusUpdate?.('Setting up enhanced notifications...');
        
        // Initialize enhanced push notifications
        await EnhancedMobileNotificationManager.initializeEnhancedPushNotifications();
        
        console.log('Configuring background tasks...');
        onStatusUpdate?.('Configuring background tasks...');
        
        // Set up background sync task
        await startBackgroundTask(async () => {
          console.log('🔄 Background sync task executing...');
          // Background sync logic would go here
        });
        
        console.log('Configuring status bar...');
        onStatusUpdate?.('Configuring status bar...');
        
        // Configure status bar with delay
        setTimeout(async () => {
          try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#0f172a' });
            console.log('✅ Status bar configured');
          } catch (error) {
            console.warn('⚠️ Status bar configuration failed (non-critical):', error);
          }
          onStatusUpdate?.('');
        }, 2000);
        
        console.log('✅ Enhanced mobile initialization complete');
        onInitializationComplete?.();
        
      } catch (error) {
        console.error('❌ Enhanced mobile initialization failed:', error);
        onStatusUpdate?.(`Initialization failed: ${error}`);
        // Still call completion to prevent blocking
        onInitializationComplete?.();
      }
    };

    // Small delay to prevent blocking app startup
    setTimeout(initializeEnhancedFeatures, 1000);

  }, [onInitializationComplete, onStatusUpdate, requestBatteryOptimizationExemption, startBackgroundTask]);

  return null;
};

export default EnhancedMobileInitializer;