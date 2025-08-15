import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface MobileFeatureInitializerProps {
  onInitializationComplete?: () => void;
}

export const MobileFeatureInitializer: React.FC<MobileFeatureInitializerProps> = ({ 
  onInitializationComplete 
}) => {
  const [initStatus, setInitStatus] = useState<string>('');

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping mobile feature initialization');
      onInitializationComplete?.();
      return;
    }

    console.log('🔄 Starting mobile feature initialization...');
    
    // Phase 1: Essential native features (delayed to avoid startup conflicts)
    setTimeout(async () => {
      try {
        setInitStatus('Configuring status bar...');
        
        // Import and configure status bar
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        
        console.log('✅ Status bar configured');
        setInitStatus('Status bar ready');
      } catch (error) {
        console.warn('⚠️ Status bar initialization failed (non-critical):', error);
        setInitStatus('Status bar failed (continuing...)');
      }
    }, 3000);

    // Phase 2: Notification system (heavily delayed)
    setTimeout(async () => {
      try {
        setInitStatus('Setting up notifications...');
        
        // Dynamically import notification manager
        const { MobileNotificationManager } = await import('@/utils/mobileNotifications');
        await MobileNotificationManager.initialize();
        
        console.log('✅ Notifications initialized');
        setInitStatus('Notifications ready');
      } catch (error) {
        console.warn('⚠️ Notification initialization failed (non-critical):', error);
        setInitStatus('Notifications failed (continuing...)');
      }
    }, 6000);

    // Phase 3: Background features (very delayed)
    setTimeout(async () => {
      try {
        setInitStatus('Initializing background features...');
        
        // Load complex hooks and features here if needed
        console.log('✅ Background features ready');
        setInitStatus('All features ready');
        
        onInitializationComplete?.();
      } catch (error) {
        console.warn('⚠️ Background features failed (non-critical):', error);
        setInitStatus('Background features failed (app still functional)');
        
        // Still call completion even if some features fail
        onInitializationComplete?.();
      }
    }, 10000);

  }, [onInitializationComplete]);

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

export default MobileFeatureInitializer;