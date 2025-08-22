
import React, { useState, memo } from 'react';
import { validateSignal, createSafeSignal } from '@/utils/signalValidation';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import { mapTakeProfitsFromProps, mapTakeProfitsFromArray } from '@/utils/signalTargetMapping';
import SignalHeader from './SignalHeader';
import RealTimeChart from './RealTimeChart';
import RealTimePriceDisplay from './RealTimePriceDisplay';
import SignalPriceDetails from './SignalPriceDetails';
import SignalAnalysis from './SignalAnalysis';
import SignalActions from './SignalActions';

interface SignalCardProps {
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
    take_profits?: number[];
    confidence: number;
    timestamp: string;
    analysisText?: string;
    chartData: Array<{ time: number; price: number }>;
    targetsHit?: number[];
  } | null;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
}

const SignalCard = memo(({ signal, analysis }: SignalCardProps) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Enhanced null and type validation with comprehensive safety checks
  if (!signal) {
    console.warn('SignalCard: Null signal provided, skipping render');
    return null;
  }

  if (typeof signal !== 'object') {
    console.warn('SignalCard: Signal is not an object:', typeof signal);
    return null;
  }

  // Comprehensive property validation with type checking
  if (!signal.id || typeof signal.id !== 'string') {
    console.warn('SignalCard: Signal missing or invalid ID:', signal.id);
    return null;
  }

  if (!signal.pair || typeof signal.pair !== 'string') {
    console.warn('SignalCard: Signal missing or invalid pair:', signal.pair);
    return null;
  }

  if (!signal.type || typeof signal.type !== 'string') {
    console.warn('SignalCard: Signal missing or invalid type:', signal.type);
    return null;
  }

  if (signal.type !== 'BUY' && signal.type !== 'SELL') {
    console.warn('SignalCard: Signal has invalid type value:', signal.type);
    return null;
  }

  if (!signal.entryPrice || (typeof signal.entryPrice !== 'string' && typeof signal.entryPrice !== 'number')) {
    console.warn('SignalCard: Signal missing or invalid entryPrice:', signal.entryPrice);
    return null;
  }

  // Additional validation using existing validateSignal function
  if (!validateSignal(signal)) {
    console.warn('SignalCard: Signal failed validation:', signal);
    return null;
  }

  const safeSignal = createSafeSignal(signal);

  // Additional safety check after safe signal creation
  if (!safeSignal || !safeSignal.id || !safeSignal.pair || !safeSignal.type) {
    console.error('SignalCard: Safe signal creation failed for:', signal.id);
    return null;
  }

  // Final type validation for safeSignal
  if (safeSignal.type !== 'BUY' && safeSignal.type !== 'SELL') {
    console.error('SignalCard: Safe signal has invalid type after creation:', safeSignal.type);
    return null;
  }

  // Get live centralized real-time market data with error handling
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
    entryPrice: safeSignal.entryPrice
  });

  // Fixed signal entry price (never changes) with validation
  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  if (isNaN(signalEntryPrice) || signalEntryPrice <= 0) {
    console.error('SignalCard: Invalid entry price after validation:', safeSignal.entryPrice);
    return null;
  }
  
  // Use live current price for real-time updates, fallback to entry price only if no live data
  const currentPrice = liveCurrentPrice || signalEntryPrice;
  
  // Get live price change data (this will be market data, not signal performance)
  const { change, percentage } = getPriceChange();

  // Use ONLY centralized chart data for real-time updates with safety checks
  const chartDataToDisplay = Array.isArray(centralizedChartData) 
    ? centralizedChartData
        .filter(point => point && typeof point === 'object' && point.timestamp && point.price)
        .map(point => ({
          timestamp: point.timestamp,
          time: point.time,
          price: point.price
        }))
    : [];

  // Enhanced connection status
  const connectionStatus = isConnected && chartDataToDisplay.length > 0;

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
        takeProfits={
          signal?.take_profits && Array.isArray(signal.take_profits) 
            ? mapTakeProfitsFromArray(signal.take_profits, safeSignal.entryPrice, safeSignal.pair)
            : mapTakeProfitsFromProps(
                safeSignal.takeProfit1,
                safeSignal.takeProfit2,
                safeSignal.takeProfit3,
                safeSignal.entryPrice,
                safeSignal.pair,
                signal?.takeProfit4,
                signal?.takeProfit5
              )
        }
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
          onToggleAnalysis={setIsAnalysisOpen}
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

SignalCard.displayName = 'SignalCard';

export default SignalCard;
