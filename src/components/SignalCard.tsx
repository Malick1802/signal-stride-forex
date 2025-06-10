
import React, { useState, memo } from 'react';
import { validateSignal, createSafeSignal } from '@/utils/signalValidation';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
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

  // Enhanced validation with early return
  if (!signal) {
    console.warn('SignalCard: Null signal provided');
    return null;
  }

  if (!validateSignal(signal)) {
    console.warn('SignalCard: Invalid signal data:', signal);
    return null;
  }

  const safeSignal = createSafeSignal(signal);

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
