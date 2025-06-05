
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
    targetsHit?: number[];
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

  // Get live centralized real-time market data
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

  // Fixed signal entry price (never changes)
  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  
  // Use live current price for real-time updates, fallback to entry price only if no live data
  const currentPrice = liveCurrentPrice || signalEntryPrice;
  
  // Get live price change data (this will be market data, not signal performance)
  const { change, percentage } = getPriceChange();

  // Use ONLY centralized chart data for real-time updates
  const chartDataToDisplay = centralizedChartData.map(point => ({
    timestamp: point.timestamp,
    time: point.time,
    price: point.price
  }));

  // Enhanced connection status
  const connectionStatus = isConnected && centralizedChartData.length > 0;

  // Check if this is a debug mode signal
  const isDebugSignal = safeSignal.analysisText?.includes('[DEBUG]');

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl border overflow-hidden ${
      isDebugSignal ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10'
    }`}>
      {/* Debug Mode Indicator */}
      {isDebugSignal && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400 text-xs font-medium">🐛 DEBUG MODE</span>
            <span className="text-yellow-300 text-xs">
              Generated with relaxed criteria for analysis verification
            </span>
          </div>
        </div>
      )}

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
        currentPrice={currentPrice}
        signalType={safeSignal.type}
        targetsHit={signal?.targetsHit || []}
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
