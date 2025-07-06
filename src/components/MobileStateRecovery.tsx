import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useAuth } from '@/contexts/AuthContext';

interface MobileStateRecoveryProps {
  onRecoveryComplete: () => void;
  inactivityDuration?: number;
}

export const MobileStateRecovery: React.FC<MobileStateRecoveryProps> = ({
  onRecoveryComplete,
  inactivityDuration = 0
}) => {
  const [recoveryStage, setRecoveryStage] = useState<'checking' | 'recovering' | 'complete' | 'error'>('checking');
  const [recoverySteps, setRecoverySteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

  const { isConnected, checkConnectivity } = useMobileConnectivity();
  const { fetchSignals } = useTradingSignals();
  const { checkSubscription } = useAuth();

  const addRecoveryStep = (step: string) => {
    setRecoverySteps(prev => [...prev, step]);
    setCurrentStep(step);
  };

  const performRecovery = async () => {
    setRecoveryStage('recovering');
    setProgress(10);
    
    try {
      // Step 1: Check connectivity
      addRecoveryStep('Checking network connectivity...');
      await checkConnectivity();
      setProgress(25);

      if (!isConnected) {
        throw new Error('No internet connection available');
      }

      // Step 2: Restore authentication state
      addRecoveryStep('Restoring authentication state...');
      await checkSubscription();
      setProgress(50);

      // Step 3: Refresh trading signals
      addRecoveryStep('Refreshing trading signals...');
      await fetchSignals();
      setProgress(75);

      // Step 4: Clear any cached states that might be stale
      addRecoveryStep('Clearing stale cache...');
      try {
        // Clear any potentially stale cache entries
        const cacheKeys = Object.keys(localStorage).filter(key => 
          key.includes('temp_') || key.includes('cache_') || key.includes('stale_')
        );
        cacheKeys.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Cache clearing failed:', error);
      }
      setProgress(90);

      // Step 5: Complete recovery
      addRecoveryStep('Recovery complete!');
      setProgress(100);
      setRecoveryStage('complete');

      // Auto-complete after a short delay
      setTimeout(() => {
        onRecoveryComplete();
      }, 1500);

    } catch (error) {
      console.error('State recovery failed:', error);
      setRecoveryStage('error');
      addRecoveryStep(`Recovery failed: ${error.message}`);
    }
  };

  useEffect(() => {
    // Start recovery automatically after mount
    const timer = setTimeout(performRecovery, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setRecoveryStage('checking');
    setRecoverySteps([]);
    setCurrentStep('');
    setProgress(0);
    performRecovery();
  };

  const handleSkip = () => {
    onRecoveryComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md mx-4 border border-white/20">
        <div className="text-center mb-6">
          <div className="mb-4">
            {recoveryStage === 'checking' || recoveryStage === 'recovering' ? (
              <RefreshCw className="h-12 w-12 text-blue-400 animate-spin mx-auto" />
            ) : recoveryStage === 'complete' ? (
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            ) : (
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {recoveryStage === 'checking' ? 'Checking App State' :
             recoveryStage === 'recovering' ? 'Restoring App' :
             recoveryStage === 'complete' ? 'Recovery Complete' :
             'Recovery Failed'}
          </h2>
          
          {inactivityDuration > 0 && (
            <p className="text-gray-300 text-sm mb-4">
              App was inactive for {Math.round(inactivityDuration / 1000 / 60)} minutes
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
          <div 
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current step */}
        <div className="mb-6">
          <p className="text-white text-sm font-medium mb-2">
            {currentStep || 'Preparing recovery...'}
          </p>
          
          {/* Connection status */}
          <div className="flex items-center space-x-2 text-sm">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'Connected' : 'No connection'}
            </span>
          </div>
        </div>

        {/* Recovery steps log */}
        {recoverySteps.length > 0 && (
          <div className="bg-black/20 rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
            {recoverySteps.map((step, index) => (
              <div key={index} className="text-xs text-gray-300 mb-1">
                • {step}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {recoveryStage === 'error' && (
            <>
              <Button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Continue Anyway
              </Button>
            </>
          )}
          
          {recoveryStage === 'complete' && (
            <Button
              onClick={onRecoveryComplete}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Continue
            </Button>
          )}
          
          {(recoveryStage === 'checking' || recoveryStage === 'recovering') && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="w-full text-gray-400 hover:text-white"
            >
              Skip Recovery
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};