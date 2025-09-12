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
  const [initStatus, setInitStatus] = useState<string>('');
  
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
        setInitStatus('Configuring battery optimization...');
        onStatusUpdate?.('Configuring battery optimization...');
        
        // Request battery optimization exemption
        await requestBatteryOptimizationExemption();
        
        setInitStatus('Setting up enhanced notifications...');
        onStatusUpdate?.('Setting up enhanced notifications...');
        
        // Initialize enhanced push notifications
        await EnhancedMobileNotificationManager.initializeEnhancedPushNotifications();
        
        setInitStatus('Configuring background tasks...');
        onStatusUpdate?.('Configuring background tasks...');
        
        // Set up background sync task
        await startBackgroundTask(async () => {
          console.log('🔄 Background sync task executing...');
          // Background sync logic would go here
        });
        
        setInitStatus('Configuring status bar...');
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
          setInitStatus('');
          onStatusUpdate?.('');
        }, 2000);
        
        console.log('✅ Enhanced mobile initialization complete');
        onInitializationComplete?.();
        
      } catch (error) {
        console.error('❌ Enhanced mobile initialization failed:', error);
        setInitStatus(`Initialization failed: ${error}`);
        onStatusUpdate?.(`Initialization failed: ${error}`);
        // Still call completion to prevent blocking
        onInitializationComplete?.();
      }
    };

    // Small delay to prevent blocking app startup
    setTimeout(initializeEnhancedFeatures, 1000);

  }, [onInitializationComplete, onStatusUpdate, requestBatteryOptimizationExemption, startBackgroundTask]);

  // Only show status on native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Show initialization status as a small overlay
  if (initStatus) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs px-3 py-2 rounded-lg max-w-48">
        {initStatus}
      </div>
    );
  }

  return null;
};

export default EnhancedMobileInitializer;