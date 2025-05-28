
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTradingSignals } from './useTradingSignals';

interface AutoGenerationConfig {
  intervalMinutes: number;
  enabledDuringMarketHours: boolean;
  maxSignalsPerSession: number;
  cooldownMinutes: number;
}

const DEFAULT_CONFIG: AutoGenerationConfig = {
  intervalMinutes: 8, // Every 8 minutes
  enabledDuringMarketHours: true,
  maxSignalsPerSession: 5,
  cooldownMinutes: 15
};

export const useAutomaticSignalGeneration = (config: Partial<AutoGenerationConfig> = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { toast } = useToast();
  const { triggerAutomaticSignalGeneration } = useTradingSignals();
  
  const [isAutoGenerationActive, setIsAutoGenerationActive] = useState(false);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [generationsThisSession, setGenerationsThisSession] = useState(0);
  const [nextGenerationIn, setNextGenerationIn] = useState<number>(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Check if market is open (simplified forex market hours)
  const isMarketOpen = useCallback(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    // Forex market is closed from Friday 22:00 UTC to Sunday 22:00 UTC
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  }, []);

  // Check if we can generate signals
  const canGenerateSignals = useCallback(() => {
    const now = Date.now();
    const timeSinceLastGeneration = now - lastGenerationTime;
    const cooldownMs = fullConfig.cooldownMinutes * 60 * 1000;
    
    const conditions = {
      marketOpen: !fullConfig.enabledDuringMarketHours || isMarketOpen(),
      cooldownPassed: timeSinceLastGeneration >= cooldownMs,
      belowSessionLimit: generationsThisSession < fullConfig.maxSignalsPerSession,
      systemActive: isAutoGenerationActive
    };

    console.log('🤖 Auto-generation conditions check:', conditions);
    
    return conditions.marketOpen && conditions.cooldownPassed && 
           conditions.belowSessionLimit && conditions.systemActive;
  }, [lastGenerationTime, generationsThisSession, fullConfig, isMarketOpen, isAutoGenerationActive]);

  // Generate signals automatically
  const performAutomaticGeneration = useCallback(async () => {
    if (!canGenerateSignals()) {
      console.log('⏸️ Auto-generation skipped - conditions not met');
      return;
    }

    try {
      console.log('🚀 Auto-generating signals...');
      
      await triggerAutomaticSignalGeneration();
      
      const now = Date.now();
      setLastGenerationTime(now);
      setGenerationsThisSession(prev => prev + 1);
      
      toast({
        title: "🤖 Auto-Generated Signals",
        description: `New AI signals generated automatically (${generationsThisSession + 1}/${fullConfig.maxSignalsPerSession} this session)`,
        duration: 4000,
      });
      
      console.log(`✅ Auto-generation complete (${generationsThisSession + 1}/${fullConfig.maxSignalsPerSession})`);
      
    } catch (error) {
      console.error('❌ Auto-generation failed:', error);
      toast({
        title: "Auto-Generation Error",
        description: "Failed to generate signals automatically. Will retry next cycle.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [canGenerateSignals, triggerAutomaticSignalGeneration, toast, generationsThisSession, fullConfig.maxSignalsPerSession]);

  // Update countdown timer
  const updateCountdown = useCallback(() => {
    if (!isAutoGenerationActive) {
      setNextGenerationIn(0);
      return;
    }

    const now = Date.now();
    const intervalMs = fullConfig.intervalMinutes * 60 * 1000;
    const timeSinceLastGeneration = now - lastGenerationTime;
    const timeUntilNext = Math.max(0, intervalMs - timeSinceLastGeneration);
    
    setNextGenerationIn(Math.ceil(timeUntilNext / 1000));
  }, [isAutoGenerationActive, lastGenerationTime, fullConfig.intervalMinutes]);

  // Start automatic generation
  const startAutoGeneration = useCallback(() => {
    if (isAutoGenerationActive) return;
    
    console.log('🟢 Starting automatic signal generation');
    setIsAutoGenerationActive(true);
    setGenerationsThisSession(0);
    setLastGenerationTime(Date.now());
    
    toast({
      title: "🤖 Auto-Generation Started",
      description: `Signals will be generated every ${fullConfig.intervalMinutes} minutes during market hours`,
      duration: 5000,
    });
  }, [isAutoGenerationActive, fullConfig.intervalMinutes, toast]);

  // Stop automatic generation
  const stopAutoGeneration = useCallback(() => {
    console.log('🔴 Stopping automatic signal generation');
    setIsAutoGenerationActive(false);
    setNextGenerationIn(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    toast({
      title: "Auto-Generation Stopped",
      description: "Automatic signal generation has been disabled",
    });
  }, [toast]);

  // Setup intervals
  useEffect(() => {
    if (!isAutoGenerationActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    // Main generation interval
    intervalRef.current = setInterval(() => {
      performAutomaticGeneration();
    }, fullConfig.intervalMinutes * 60 * 1000);

    // Countdown update interval (every second)
    countdownRef.current = setInterval(updateCountdown, 1000);

    // Initial countdown update
    updateCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isAutoGenerationActive, performAutomaticGeneration, updateCountdown, fullConfig.intervalMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return {
    isAutoGenerationActive,
    lastGenerationTime,
    generationsThisSession,
    nextGenerationIn,
    maxSignalsPerSession: fullConfig.maxSignalsPerSession,
    intervalMinutes: fullConfig.intervalMinutes,
    isMarketOpen: isMarketOpen(),
    canGenerateSignals: canGenerateSignals(),
    startAutoGeneration,
    stopAutoGeneration,
    performAutomaticGeneration
  };
};
