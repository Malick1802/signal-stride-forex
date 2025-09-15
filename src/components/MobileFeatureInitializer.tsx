import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface MobileFeatureInitializerProps {
  onInitializationComplete?: () => void;
}

export const MobileFeatureInitializer: React.FC<MobileFeatureInitializerProps> = ({ 
  onInitializationComplete 
}) => {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping mobile feature initialization');
      onInitializationComplete?.();
      return;
    }

    console.log('🔄 Starting mobile feature initialization...');
    
    // Extremely delayed initialization to prevent all crashes
    setTimeout(async () => {
      try {
        console.log('Configuring status bar...');
        
        // Import and configure status bar safely with long delays
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        
        console.log('✅ Status bar configured');
      } catch (error) {
        console.warn('⚠️ Status bar initialization failed (non-critical):', error);
      }
    }, 20000); // 20 seconds delay

    // Complete initialization callback immediately - don't wait for features
    setTimeout(() => {
      console.log('✅ Mobile initialization marked as complete (features loading in background)');
      onInitializationComplete?.();
    }, 1000); // Complete after just 1 second

  }, [onInitializationComplete]);

  return null;
};

export default MobileFeatureInitializer;