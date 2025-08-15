import React from 'react';
import { Smartphone } from 'lucide-react';

interface MinimalAndroidLoaderProps {
  message?: string;
  progress?: number;
}

const MinimalAndroidLoader: React.FC<MinimalAndroidLoaderProps> = ({ 
  message = "Loading ForexAlert Pro...", 
  progress 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">
        {/* App icon */}
        <div className="mb-6">
          <Smartphone className="h-16 w-16 text-emerald-400 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">ForexAlert Pro</h1>
        </div>

        {/* Loading spinner */}
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400/20 border-t-emerald-400 mx-auto"></div>
        </div>

        {/* Progress bar (if progress provided) */}
        {typeof progress === 'number' && (
          <div className="mb-4">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Status message */}
        <p className="text-gray-300 text-sm">{message}</p>

        {/* Platform indicator */}
        <p className="text-xs text-gray-500 mt-4 opacity-60">
          Android Native App
        </p>
      </div>
    </div>
  );
};

export default MinimalAndroidLoader;