
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLocation } from 'react-router-dom';

interface RouteDebugInfo {
  timestamp: string;
  route: string;
  platform: string;
  href: string;
  isValid: boolean;
}

const MobileRouteDebugger: React.FC = () => {
  const location = useLocation();
  const [debugHistory, setDebugHistory] = useState<RouteDebugInfo[]>([]);

  useEffect(() => {
    const debugInfo: RouteDebugInfo = {
      timestamp: new Date().toISOString(),
      route: location.pathname,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
      href: window.location.href,
      isValid: ['/', '/test'].includes(location.pathname)
    };

    console.log('🔍 MobileRouteDebugger: Route change detected', debugInfo);
    
    setDebugHistory(prev => [...prev.slice(-4), debugInfo]);

    // Log additional mobile context
    if (Capacitor.isNativePlatform()) {
      console.log('🔍 Mobile Route Context:', {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        key: location.key
      });
    }
  }, [location]);

  // Only render debug info in development or when there are routing issues
  if (!Capacitor.isNativePlatform() && process.env.NODE_ENV === 'production') {
    return null;
  }

  return null; // This component only logs, doesn't render UI
};

export default MobileRouteDebugger;
