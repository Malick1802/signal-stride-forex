import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CrashRecoveryProps {
  onRecovery: () => void;
}

export const CrashRecovery: React.FC<CrashRecoveryProps> = ({ onRecovery }) => {
  const [crashInfo, setCrashInfo] = useState<string>('');

  useEffect(() => {
    // Detect platform and potential crash causes
    const detectCrashCause = () => {
      const info = {
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100),
        online: navigator.onLine,
        timestamp: new Date().toISOString()
      };
      
      setCrashInfo(JSON.stringify(info, null, 2));
      console.log('🚨 Crash recovery info:', info);
    };

    detectCrashCause();
  }, []);

  const handleRestart = () => {
    console.log('🔄 User initiated app restart');
    
    // Clear any stored error states
    try {
      localStorage.removeItem('app-error-state');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    
    // Reload the app completely
    if (Capacitor.isNativePlatform()) {
      window.location.reload();
    } else {
      onRecovery();
    }
  };

  const handleSafeMode = () => {
    console.log('🛡️ User selected safe mode');
    
    // Store safe mode flag
    try {
      localStorage.setItem('safe-mode', 'true');
    } catch (e) {
      console.warn('Failed to set safe mode flag:', e);
    }
    
    onRecovery();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-6" />
        
        <h2 className="text-2xl font-bold text-white mb-4">
          App Recovery
        </h2>
        
        <p className="text-gray-300 text-sm mb-6">
          The app encountered an issue during startup. You can try restarting or continue in safe mode.
        </p>
        
        {Capacitor.isNativePlatform() && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-6">
            <p className="text-gray-400 text-xs">
              Platform: {Capacitor.getPlatform()}
            </p>
            <p className="text-gray-400 text-xs">
              Status: {navigator.onLine ? 'Online' : 'Offline'}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <Button
            onClick={handleRestart}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart App
          </Button>
          
          <Button
            onClick={handleSafeMode}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            Continue in Safe Mode
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CrashRecovery;