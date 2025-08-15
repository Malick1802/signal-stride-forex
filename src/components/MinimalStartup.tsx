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
        console.log('🚀 Ultra-minimal startup sequence beginning...');
        
        if (!isMounted) return;

        // Step 1: Immediate UI feedback
        setStep('Starting...');
        setProgress(10);
        
        // Give React time to render
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (!isMounted) return;

        if (Capacitor.isNativePlatform()) {
          console.log('📱 Native platform detected:', Capacitor.getPlatform());
          
          setStep('Initializing...');
          setProgress(30);
          
          // Wait a bit longer before hiding splash
          await new Promise(resolve => setTimeout(resolve, 800));
          
          if (!isMounted) return;

          try {
            setStep('Loading interface...');
            setProgress(60);
            
            const { SplashScreen } = await import('@capacitor/splash-screen');
            
            // Give more time for app to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!isMounted) return;

            await SplashScreen.hide({ fadeOutDuration: 300 });
            console.log('✅ Splash screen hidden successfully');
            
          } catch (error) {
            console.warn('⚠️ Splash screen error (recovering):', error);
            // Try to hide without options as fallback
            try {
              const { SplashScreen } = await import('@capacitor/splash-screen');
              await SplashScreen.hide();
            } catch (fallbackError) {
              console.warn('⚠️ Fallback splash hide also failed:', fallbackError);
            }
          }
        } else {
          console.log('🌐 Web platform - quick initialization');
          setStep('Loading...');
          setProgress(60);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!isMounted) return;

        setStep('Ready!');
        setProgress(100);
        
        // Small delay for visual completion
        await new Promise(resolve => setTimeout(resolve, 150));
        
        if (isMounted) {
          console.log('✅ Startup completed successfully');
          onStartupComplete();
        }

      } catch (error) {
        console.error('❌ Critical startup error:', error);
        
        // Emergency recovery - try to continue anyway
        if (isMounted) {
          setStep('Recovering...');
          setTimeout(() => {
            if (isMounted) {
              console.log('🔄 Emergency recovery - starting app anyway');
              onStartupComplete();
            }
          }, 500);
        }
      }
    };

    // Set a maximum timeout as final safety net
    startupTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Startup timeout - forcing app start');
        onStartupComplete();
      }
    }, 5000);

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