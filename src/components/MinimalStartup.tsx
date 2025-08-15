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
        console.log('🚀 Crash-safe startup sequence beginning...');
        
        if (!isMounted) return;

        // Step 1: Immediate UI feedback
        setStep('Starting...');
        setProgress(20);
        
        // Minimal delay for UI rendering
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMounted) return;

        if (Capacitor.isNativePlatform()) {
          console.log('📱 Native platform detected:', Capacitor.getPlatform());
          
          setStep('Initializing...');
          setProgress(50);
          
          // Very safe delay before attempting splash screen
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!isMounted) return;

          // Safe splash screen handling with multiple fallbacks
          try {
            setStep('Loading...');
            setProgress(80);
            
            // Import dynamically to avoid early initialization issues
            const { SplashScreen } = await import('@capacitor/splash-screen');
            
            // Additional safety delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (!isMounted) return;

            // Try the safest approach first - just hide without options
            await SplashScreen.hide();
            console.log('✅ Splash screen hidden safely');
            
          } catch (error) {
            console.warn('⚠️ Splash screen hide failed, continuing anyway:', error);
            // Don't try fallbacks - just continue, splash will auto-hide
          }
        } else {
          console.log('🌐 Web platform - quick initialization');
          setStep('Loading...');
          setProgress(80);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!isMounted) return;

        setStep('Ready!');
        setProgress(100);
        
        // Final short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (isMounted) {
          console.log('✅ Crash-safe startup completed');
          onStartupComplete();
        }

      } catch (error) {
        console.error('❌ Startup error (recovering):', error);
        
        // Emergency recovery - always try to continue
        if (isMounted) {
          setStep('Recovering...');
          setTimeout(() => {
            if (isMounted) {
              console.log('🔄 Emergency recovery - force continuing');
              onStartupComplete();
            }
          }, 300);
        }
      }
    };

    // Set a shorter timeout as final safety net
    startupTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Startup timeout - emergency start');
        onStartupComplete();
      }
    }, 3000);

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