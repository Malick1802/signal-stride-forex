import React, { useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useMobileSignalMonitoring } from '@/hooks/useMobileSignalMonitoring';
import { useMobilePerformanceOptimizer } from '@/hooks/useMobilePerformanceOptimizer';
import { useRealTimeConnection } from '@/hooks/useRealTimeConnection';
import { MobileSignalCard } from './MobileSignalCard';
import { MobileSignalMonitor } from './MobileSignalMonitor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MobileEnhancedTradingSignalsProps {
  showMonitor?: boolean;
}

export const MobileEnhancedTradingSignals: React.FC<MobileEnhancedTradingSignalsProps> = ({
  showMonitor = true
}) => {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showPerformanceOptimized, setShowPerformanceOptimized] = useState(false);

  // Hooks
  const { signals, loading, fetchSignals } = useTradingSignals();
  const { signalPerformance } = useMobileSignalMonitoring();
  const { optimizationLevel, performanceMetrics } = useMobilePerformanceOptimizer();
  const { isConnected, reconnect } = useRealTimeConnection();

  // Mobile-optimized signal filtering
  const optimizedSignals = useMemo(() => {
    if (!signals?.length) return [];

    const maxSignals = optimizationLevel === 'high' ? 10 : 
                      optimizationLevel === 'medium' ? 20 : 
                      signals.length;

    return signals
      .slice(0, maxSignals)
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return (b.confidence || 0) - (a.confidence || 0);
      });
  }, [signals, optimizationLevel]);

  // Performance-aware rendering
  useEffect(() => {
    if (performanceMetrics.memoryUsage > 80) {
      setShowPerformanceOptimized(true);
    }
  }, [performanceMetrics.memoryUsage]);

  // Manual refresh with haptic feedback
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }

    try {
      await fetchSignals();
      toast({
        title: "Signals Updated",
        description: `Loaded ${optimizedSignals.length} signals`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Please check your connection and try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  if (loading && !optimizedSignals.length) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-slate-800/50">
              <CardContent className="p-4">
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-6 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trading Signals
          </h2>
          {optimizedSignals.length > 0 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {optimizedSignals.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-400" />
                <span className="text-red-400">Offline</span>
                <Button size="sm" variant="ghost" onClick={reconnect} className="h-6 px-2 text-xs">
                  Reconnect
                </Button>
              </>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {showPerformanceOptimized && (
        <div className="mx-4">
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-orange-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                Performance mode active - showing optimized view
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showMonitor && <MobileSignalMonitor />}

      <div className="px-4 space-y-3">
        {optimizedSignals.length === 0 ? (
          <Card className="bg-slate-800/30 border-slate-600">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-2">No signals available</p>
            </CardContent>
          </Card>
        ) : (
          optimizedSignals.map((signal) => (
            <MobileSignalCard
              key={signal.id}
              signal={{
                id: signal.id,
                currency_pair: signal.pair,
                signal_type: signal.type.toLowerCase() as 'buy' | 'sell',
                entry_price: parseFloat(signal.entryPrice),
                target_price: parseFloat(signal.takeProfit1),
                stop_loss_price: parseFloat(signal.stopLoss),
                status: signal.status as 'active' | 'expired' | 'completed',
                confidence: signal.confidence,
                created_at: signal.timestamp
              }}
            />
          ))
        )}
      </div>

      {optimizationLevel === 'high' && signals && signals.length > optimizedSignals.length && (
        <div className="px-4 pb-4">
          <Card className="bg-slate-800/20 border-slate-600">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Showing {optimizedSignals.length} of {signals.length} signals for optimal performance
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};