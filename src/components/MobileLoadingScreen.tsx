
import React from 'react';
import { Loader2 } from 'lucide-react';

interface MobileLoadingScreenProps {
  message?: string;
  showProgress?: boolean;
}

const MobileLoadingScreen: React.FC<MobileLoadingScreenProps> = ({ 
  message = "Loading ForexAlert Pro...",
  showProgress = false 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/app-icon-new.png" alt="ForexAlert Pro" className="h-16 w-16 mb-4" />
          <h1 className="text-2xl font-bold text-white">ForexAlert Pro</h1>
        </div>
        
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        </div>
        
        <p className="text-gray-300 text-lg mb-2">{message}</p>
        
        {showProgress && (
          <div className="w-64 bg-gray-700 rounded-full h-2 mb-4">
            <div className="bg-emerald-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}
        
        <p className="text-gray-400 text-sm">Optimized for mobile trading</p>
      </div>
    </div>
  );
};

export default MobileLoadingScreen;
