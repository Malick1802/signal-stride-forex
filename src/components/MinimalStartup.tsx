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
    const startupSequence = async () => {
      try {
        // Step 1: Basic platform detection
        setStep('Detecting platform...');
        setProgress(20);
        await new Promise(resolve => setTimeout(resolve, 100));

        if (Capacitor.isNativePlatform()) {
          console.log('📱 Native platform detected:', Capacitor.getPlatform());
          
          // Step 2: Hide splash screen ONLY - most critical
          setStep('Loading interface...');
          setProgress(50);
          
          try {
            const { SplashScreen } = await import('@capacitor/splash-screen');
            await new Promise(resolve => setTimeout(resolve, 300));
            await SplashScreen.hide({ fadeOutDuration: 150 });
            console.log('✅ Splash screen hidden');
          } catch (error) {
            console.warn('⚠️ Splash screen failed (continuing anyway):', error);
          }

          setStep('Preparing app...');
          setProgress(80);
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.log('🌐 Web platform detected');
          setStep('Loading web app...');
          setProgress(80);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Step 3: Complete startup
        setStep('Ready!');
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 100));

        onStartupComplete();

      } catch (error) {
        console.error('❌ Startup error (continuing anyway):', error);
        // Even if there's an error, continue to app
        onStartupComplete();
      }
    };

    startupSequence();
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