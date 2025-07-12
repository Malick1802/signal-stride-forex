
import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const MobileDebugger: React.FC = () => {
  useEffect(() => {
    // Log platform information
    console.log('MobileDebugger: Platform info', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      isPluginAvailable: Capacitor.isPluginAvailable('Device')
    });

    // Log network connectivity
    console.log('MobileDebugger: Network status', {
      online: navigator.onLine,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    });

    // Listen for click events globally
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      console.log('MobileDebugger: Click detected', {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.slice(0, 50)
      });
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default MobileDebugger;
