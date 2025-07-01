
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    console.log('🌐 Platform:', Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web');
    console.log('🛣️ Full URL:', window.location.href);
    console.log('🛣️ Search params:', window.location.search);
    console.log('🛣️ Hash:', window.location.hash);
  }, [location.pathname]);

  const handleGoHome = () => {
    console.log('🏠 Navigating to home');
    window.location.href = '/';
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing app');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="text-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md w-full mx-4">
        <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
        <p className="text-xl text-gray-300 mb-4">Oops! Page not found</p>
        <p className="text-gray-400 mb-6 text-sm">
          The page "{location.pathname}" doesn't exist.
        </p>
        
        {Capacitor.isNativePlatform() && (
          <div className="mb-6 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <p className="text-blue-300 text-xs">
              Mobile App Debug Info:
            </p>
            <p className="text-blue-200 text-xs">
              Platform: {Capacitor.getPlatform()}
            </p>
            <p className="text-blue-200 text-xs">
              Path: {location.pathname}
            </p>
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
        </div>
      </div>
    </div>
  );
};

export default NotFound;
