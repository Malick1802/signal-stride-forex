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
    
    // Extremely delayed initialization to prevent all crashes
    setTimeout(async () => {
      try {
        setInitStatus('Configuring status bar...');
        
        // Import and configure status bar safely with long delays
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        
        console.log('✅ Status bar configured');
        setInitStatus('');
      } catch (error) {
        console.warn('⚠️ Status bar initialization failed (non-critical):', error);
        setInitStatus('');
      }
    }, 20000); // 20 seconds delay

    // Complete initialization callback immediately - don't wait for features
    setTimeout(() => {
      console.log('✅ Mobile initialization marked as complete (features loading in background)');
      onInitializationComplete?.();
    }, 1000); // Complete after just 1 second

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