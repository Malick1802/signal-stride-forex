
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { Home, RefreshCw, Bug, Wifi, WifiOff } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Collect comprehensive debug information
    const info = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      href: window.location.href,
      origin: window.location.origin,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      online: navigator.onLine
    };

    setDebugInfo(info);

    console.error("🚨 404 Error: Comprehensive debug info", info);
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGoHome = () => {
    console.log('🏠 Navigating to home from 404');
    window.location.href = '/';
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing app from 404');
    window.location.reload();
  };

  const handleShowDebug = () => {
    if (debugInfo) {
      console.log('🐛 Full Debug Information:', debugInfo);
      alert(`Debug Info:\nPath: ${debugInfo.pathname}\nPlatform: ${debugInfo.platform}\nOnline: ${debugInfo.online}\nTime: ${debugInfo.timestamp}\n\nCheck console for full details.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="text-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md w-full mx-4">
        <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
        <p className="text-xl text-gray-300 mb-4">Oops! Page not found</p>
        <p className="text-gray-400 mb-6 text-sm">
          The page "{location.pathname}" doesn't exist.
        </p>
        
        {/* Network Status */}
        <div className="mb-4 flex items-center justify-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? 'Connected' : 'No Internet'}
          </span>
        </div>
        
        {Capacitor.isNativePlatform() && debugInfo && (
          <div className="mb-6 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <p className="text-blue-300 text-xs mb-2">Mobile App Debug Info:</p>
            <div className="text-blue-200 text-xs space-y-1">
              <p>Platform: {debugInfo.platform}</p>
              <p>Path: {debugInfo.pathname}</p>
              <p>Online: {debugInfo.online ? 'Yes' : 'No'}</p>
              <p>Time: {new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <Button
            onClick={handleGoHome}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh App
          </Button>

          <Button
            onClick={handleShowDebug}
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-white"
          >
            <Bug className="w-4 h-4 mr-2" />
            Show Debug Info
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
