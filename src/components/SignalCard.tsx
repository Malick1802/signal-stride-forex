
import React, { useState, memo } from 'react';
import { validateSignal, createSafeSignal } from '@/utils/signalValidation';
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

  // Use ONLY the stored entry price from the signal (fixed at creation time)
  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  
  // For centralized signals, the "current price" is just the latest point in stored chart data
  // This ensures all users see exactly the same current price
  const currentPrice = safeSignal.chartData.length > 0 
    ? safeSignal.chartData[safeSignal.chartData.length - 1].price 
    : signalEntryPrice;

  // Calculate change based on stored chart data (first vs last point)
  const getStoredPriceChange = () => {
    if (safeSignal.chartData.length < 2) {
      return { change: 0, percentage: 0 };
    }
    
    const firstPrice = safeSignal.chartData[0].price;
    const lastPrice = safeSignal.chartData[safeSignal.chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
    
    return { change, percentage };
  };

  const { change, percentage } = getStoredPriceChange();

  // Fixed values for centralized display
  const isMarketOpen = true; // Always show as open for centralized signals
  const lastUpdateTime = new Date(safeSignal.timestamp).toLocaleTimeString();
  const dataSource = "Centralized (Fixed)";
  const isConnected = true; // Always connected for centralized data

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
        priceData={safeSignal.chartData}
        signalType={safeSignal.type}
        currentPrice={currentPrice}
        isConnected={isConnected}
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
