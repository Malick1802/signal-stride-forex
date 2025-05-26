
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
    confidence: number;
    timestamp: string;
    analysisText?: string;
    chartData: Array<{ time: number; price: number }>;
  } | null;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
}

const SignalCard = memo(({ signal, analysis }: SignalCardProps) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  if (!validateSignal(signal)) {
    return null;
  }

  const safeSignal = createSafeSignal(signal);

  // Get real-time market data for current price updates
  const {
    currentPrice: liveCurrentPrice,
    getPriceChange,
    dataSource,
    lastUpdateTime,
    isConnected,
    isMarketOpen,
    priceData: liveChartData
  } = useRealTimeMarketData({
    pair: safeSignal.pair,
    entryPrice: safeSignal.entryPrice
  });

  // FIXED signal data (never changes after signal creation)
  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  
  // Use live current price for real-time updates, fallback to entry price
  const currentPrice = liveCurrentPrice || signalEntryPrice;
  
  // Get price change from live data
  const { change, percentage } = getPriceChange();

  // Transform stored signal chart data to match expected format
  const transformedSignalChartData = safeSignal.chartData.map(point => ({
    timestamp: point.time,
    time: new Date(point.time).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    price: point.price
  }));

  // Transform live chart data to match expected format
  const transformedLiveChartData = liveChartData.map(point => ({
    timestamp: typeof point.timestamp === 'number' ? point.timestamp : new Date(point.time).getTime(),
    time: typeof point.time === 'string' ? point.time : new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    price: point.price
  }));

  // Combine stored signal chart data with live updates for a complete view
  const combinedChartData = [
    // Start with stored signal chart data (fixed reference points)
    ...transformedSignalChartData,
    // Add recent live data points if available
    ...(transformedLiveChartData.length > 0 ? transformedLiveChartData.slice(-10) : [])
  ].filter((point, index, arr) => 
    // Remove duplicates based on timestamp
    arr.findIndex(p => Math.abs(p.timestamp - point.timestamp) < 1000) === index
  );

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
      />

      <RealTimePriceDisplay
        currentPrice={currentPrice}
        change={change}
        percentage={percentage}
        lastUpdateTime={lastUpdateTime}
        dataSource={dataSource}
        isConnected={isConnected}
        isMarketOpen={isMarketOpen}
      />

      <RealTimeChart
        priceData={combinedChartData}
        signalType={safeSignal.type}
        currentPrice={currentPrice}
        isConnected={isConnected}
        entryPrice={signalEntryPrice}
      />

      <SignalPriceDetails
        entryPrice={safeSignal.entryPrice}
        stopLoss={safeSignal.stopLoss}
        takeProfit1={safeSignal.takeProfit1}
        takeProfit2={safeSignal.takeProfit2}
        takeProfit3={safeSignal.takeProfit3}
        currentPrice={currentPrice}
        signalType={safeSignal.type}
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
