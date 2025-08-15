import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface LoadingPhase {
  name: string;
  component: React.ComponentType<any>;
  props?: any;
  timeout: number;
  critical: boolean;
}

interface ProgressiveLoaderProps {
  phases: LoadingPhase[];
  children: React.ReactNode;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ phases, children }) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseComponents, setPhaseComponents] = useState<React.ComponentType<any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const loadPhase = async (phaseIndex: number) => {
      if (phaseIndex >= phases.length) {
        return;
      }

      const phase = phases[phaseIndex];
      console.log(`🔄 Loading phase: ${phase.name}`);

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Phase ${phase.name} timeout`)), phase.timeout)
        );

        // Load the component
        await Promise.race([
          Promise.resolve(phase.component),
          timeoutPromise
        ]);

        setPhaseComponents(prev => [...prev, phase.component]);
        console.log(`✅ Phase loaded: ${phase.name}`);
        
        // Move to next phase after a small delay
        setTimeout(() => {
          setCurrentPhase(phaseIndex + 1);
        }, 50);

      } catch (error) {
        console.warn(`⚠️ Phase failed: ${phase.name}`, error);
        setErrors(prev => [...prev, `${phase.name}: ${error}`]);
        
        if (phase.critical) {
          console.error(`❌ Critical phase failed: ${phase.name}`);
          // For critical phases, still continue but log the error
        }
        
        // Continue to next phase even if this one failed
        setTimeout(() => {
          setCurrentPhase(phaseIndex + 1);
        }, 100);
      }
    };

    loadPhase(currentPhase);
  }, [currentPhase, phases]);

  // If all phases are complete, render children
  if (currentPhase >= phases.length) {
    return (
      <>
        {errors.length > 0 && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500/10 border-b border-yellow-500/20 p-2 z-50">
            <p className="text-yellow-400 text-xs text-center">
              Some features may be limited due to initialization issues
            </p>
          </div>
        )}
        {children}
      </>
    );
  }

  // Show loading for current phase
  const currentPhaseName = phases[currentPhase]?.name || 'Loading...';
  const progress = Math.round((currentPhase / phases.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-4 mx-auto"></div>
        <p className="text-white text-lg mb-2">ForexAlert Pro</p>
        <p className="text-gray-300 mb-4">{currentPhaseName}</p>
        
        <div className="w-64 bg-gray-700 rounded-full h-2 mb-2 mx-auto">
          <div 
            className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-gray-400 text-sm">
          {Capacitor.isNativePlatform() ? 'Mobile App' : 'Web App'}
        </p>
      </div>
    </div>
  );
};