import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { TrendingUp } from 'lucide-react';

interface MinimalStartupProps {
  onStartupComplete: () => void;
}

export const MinimalStartup: React.FC<MinimalStartupProps> = ({ onStartupComplete }) => {
  const [step, setStep] = useState('Starting...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let startupTimeout: NodeJS.Timeout;

  const ultraMinimalStartup = async () => {
      try {
        console.log('🚀 Ultra-minimal startup (no splash screen handling)');
        
        if (!isMounted) return;

        // Step 1: Platform detection only
        setStep('Starting...');
        setProgress(30);
        
        // Tiny delay for UI
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (!isMounted) return;

        // Step 2: Ready immediately
        setStep('Ready!');
        setProgress(100);
        
        // Minimal delay before completion
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (isMounted) {
          console.log('✅ Ultra-minimal startup completed');
          onStartupComplete();
        }

      } catch (error) {
        console.error('❌ Startup error (force continuing):', error);
        
        // Emergency recovery - always continue
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              console.log('🔄 Force continuing despite error');
              onStartupComplete();
            }
          }, 100);
        }
      }
    };

    // Set a very short timeout as final safety net
    startupTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Startup timeout - emergency start');
        onStartupComplete();
      }
    }, 1000);

    ultraMinimalStartup();

    return () => {
      isMounted = false;
      if (startupTimeout) {
        clearTimeout(startupTimeout);
      }
    };
  }, [onStartupComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="flex items-center justify-center mb-6">
          <TrendingUp className="h-12 w-12 text-emerald-400 mr-3" />
          <h1 className="text-2xl font-bold text-white">ForexAlert Pro</h1>
        </div>
        
        <div className="w-64 bg-gray-700 rounded-full h-2 mb-4 mx-auto">
          <div 
            className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-gray-300 text-lg">{step}</p>
        
        <p className="text-gray-400 text-sm mt-2">
          {Capacitor.isNativePlatform() 
            ? `Mobile app on ${Capacitor.getPlatform()}`
            : 'Web application'
          }
        </p>
      </div>
    </div>
  );
};

export default MinimalStartup;