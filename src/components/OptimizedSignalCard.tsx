
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

  // Only initialize real-time data when visible
  const {
    currentPrice: liveCurrentPrice,
    getPriceChange,
    dataSource,
    lastUpdateTime,
    isConnected,
    isMarketOpen,
    priceData: centralizedChartData,
    isLoading
  } = useRealTimeMarketData({
    pair: safeSignal.pair,
    entryPrice: safeSignal.entryPrice,
    enabled: isVisible // Only fetch when visible
  });

  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  if (isNaN(signalEntryPrice) || signalEntryPrice <= 0) {
    return null;
  }
  
  const currentPrice = liveCurrentPrice || signalEntryPrice;
  const { change, percentage } = getPriceChange();

  const chartDataToDisplay = Array.isArray(centralizedChartData) 
    ? centralizedChartData
        .filter(point => point && typeof point === 'object' && point.timestamp && point.price)
        .map(point => ({
          timestamp: point.timestamp,
          time: point.time,
          price: point.price
        }))
    : [];

  const connectionStatus = isConnected && chartDataToDisplay.length > 0;

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
        change={change}
        percentage={percentage}
        dataSource={dataSource}
        lastUpdateTime={lastUpdateTime}
        entryPrice={signalEntryPrice}
      />

      <RealTimePriceDisplay
        currentPrice={liveCurrentPrice}
        change={change}
        percentage={percentage}
        lastUpdateTime={lastUpdateTime}
        dataSource={dataSource}
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
        isLoading={isLoading}
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
