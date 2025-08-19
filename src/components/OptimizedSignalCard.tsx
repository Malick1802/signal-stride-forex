
import React, { memo, useState, useCallback } from 'react';
import { validateSignal, createSafeSignal } from '@/utils/signalValidation';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import SignalHeader from './SignalHeader';
import RealTimeChart from './RealTimeChart';
import RealTimePriceDisplay from './RealTimePriceDisplay';
import SignalPriceDetails from './SignalPriceDetails';
import SignalAnalysis from './SignalAnalysis';
import SignalActions from './SignalActions';

interface OptimizedSignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    takeProfit3: string;
    takeProfit4?: string;
    takeProfit5?: string;
    confidence: number;
    timestamp: string;
    analysisText?: string;
    chartData: Array<{ time: number; price: number }>;
    targetsHit?: number[];
    // Centralized performance data
    current_pips?: number;
    current_percentage?: number;
    current_pnl?: number;
    current_price?: number | null;
  } | null;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
  isVisible: boolean; // New prop for intersection observer
}

const OptimizedSignalCard = memo<OptimizedSignalCardProps>(({ 
  signal, 
  analysis, 
  analyzingSignal, 
  onGetAIAnalysis,
  isVisible 
}) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Enhanced validation with early returns
  if (!signal || !isVisible) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading signal...</div>
      </div>
    );
  }

  // Validation checks
  if (!validateSignal(signal)) {
    console.warn('SignalCard: Signal failed validation:', signal);
    return null;
  }

  const safeSignal = createSafeSignal(signal);
  if (!safeSignal) {
    console.error('SignalCard: Safe signal creation failed');
    return null;
  }

  // Use centralized performance data from database (server-calculated)
  const currentPips = signal.current_pips || 0;
  const currentPercentage = signal.current_percentage || 0;
  const currentPnl = signal.current_pnl || 0;
  const serverCurrentPrice = signal.current_price;
  
  // Get live market price for display only
  const { currentPrice: liveCurrentPrice, isMarketOpen, dataSource } = useRealTimeMarketData({
    pair: safeSignal.pair,
    enabled: isVisible
  });

  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  if (isNaN(signalEntryPrice) || signalEntryPrice <= 0) {
    return null;
  }
  
  // Use server price or live price, fallback to entry price
  const currentPrice = serverCurrentPrice || liveCurrentPrice || signalEntryPrice;
  
  // Use centralized chart data from signal for consistency
  const chartDataToDisplay = Array.isArray(safeSignal.chartData) 
    ? safeSignal.chartData
        .filter(point => point && typeof point === 'object' && point.time && point.price)
        .map(point => ({
          timestamp: point.time,
          time: new Date(point.time).toLocaleTimeString(),
          price: point.price
        }))
    : [];

  const connectionStatus = isMarketOpen && chartDataToDisplay.length > 0;

  const handleAnalysisToggle = useCallback((open: boolean) => {
    setIsAnalysisOpen(open);
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <SignalHeader
        pair={safeSignal.pair}
        type={safeSignal.type}
        currentPrice={currentPrice}
        confidence={safeSignal.confidence}
        isMarketOpen={isMarketOpen}
        change={currentPips}
        percentage={currentPercentage}
        dataSource="Centralized Database"
        lastUpdateTime=""
        entryPrice={signalEntryPrice}
      />

      <RealTimePriceDisplay
        currentPrice={liveCurrentPrice}
        change={currentPips}
        percentage={currentPercentage}
        lastUpdateTime=""
        dataSource="Centralized Database"
        isConnected={connectionStatus}
        isMarketOpen={isMarketOpen}
        entryPrice={signalEntryPrice}
        signalType={safeSignal.type}
        pair={safeSignal.pair}
      />

      <RealTimeChart
        priceData={chartDataToDisplay}
        signalType={safeSignal.type}
        currentPrice={liveCurrentPrice}
        isConnected={connectionStatus}
        entryPrice={signalEntryPrice}
        isLoading={false}
      />

      <SignalPriceDetails
        entryPrice={safeSignal.entryPrice}
        stopLoss={safeSignal.stopLoss}
        takeProfit1={safeSignal.takeProfit1}
        takeProfit2={safeSignal.takeProfit2}
        takeProfit3={safeSignal.takeProfit3}
        takeProfit4={signal?.takeProfit4 || '0.00000'}
        takeProfit5={signal?.takeProfit5 || '0.00000'}
        currentPrice={currentPrice}
        signalType={safeSignal.type}
        targetsHit={signal?.targetsHit || []}
        pair={safeSignal.pair}
      />

      <div className="px-4">
        <SignalAnalysis
          analysisText={safeSignal.analysisText}
          analysis={analysis[safeSignal.id]}
          isAnalysisOpen={isAnalysisOpen}
          onToggleAnalysis={handleAnalysisToggle}
        />

        <SignalActions
          pair={safeSignal.pair}
          type={safeSignal.type}
          timestamp={safeSignal.timestamp}
        />
      </div>
    </div>
  );
});

OptimizedSignalCard.displayName = 'OptimizedSignalCard';

export default OptimizedSignalCard;
