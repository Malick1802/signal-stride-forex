
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
    analysisText: string;
    chartData: Array<{ time: number; price: number }>;
    targetsHit?: number[];
  } | null;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
}

const SignalCard = memo(({ signal, analysis }: SignalCardProps) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Enhanced null safety checks
  if (!signal) {
    console.warn('SignalCard: Null signal provided, rendering fallback');
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Signal data unavailable
        </div>
      </div>
    );
  }

  // Enhanced validation with detailed logging
  if (!signal.id || !signal.pair || !signal.type || !signal.entryPrice) {
    console.warn('SignalCard: Signal missing required properties:', {
      hasId: !!signal.id,
      hasPair: !!signal.pair,
      hasType: !!signal.type,
      hasEntryPrice: !!signal.entryPrice,
      signal: signal
    });
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Invalid signal data for {signal.pair || 'unknown pair'}
        </div>
      </div>
    );
  }

  // At this point, TypeScript knows signal is not null and has required properties
  const validatedSignal = signal;

  if (!validateSignal(validatedSignal)) {
    console.warn('SignalCard: Signal failed validation:', validatedSignal);
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Signal validation failed for {validatedSignal.pair}
        </div>
      </div>
    );
  }

  let safeSignal;
  try {
    safeSignal = createSafeSignal(validatedSignal);
  } catch (error) {
    console.error('SignalCard: Error creating safe signal:', error);
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Error processing signal for {validatedSignal.pair}
        </div>
      </div>
    );
  }

  if (!safeSignal || !safeSignal.id || !safeSignal.pair || !safeSignal.type) {
    console.error('SignalCard: Safe signal creation failed for:', validatedSignal.id);
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Failed to process signal for {validatedSignal.pair}
        </div>
      </div>
    );
  }

  // Enhanced market data fetching with error handling
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

  // Enhanced price validation
  let signalEntryPrice;
  try {
    signalEntryPrice = parseFloat(safeSignal.entryPrice);
    if (isNaN(signalEntryPrice) || signalEntryPrice <= 0) {
      throw new Error(`Invalid entry price: ${safeSignal.entryPrice}`);
    }
  } catch (error) {
    console.error('SignalCard: Invalid entry price after validation:', error);
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-white/60 text-center">
          Invalid price data for {safeSignal.pair}
        </div>
      </div>
    );
  }
  
  // Enhanced current price handling
  const currentPrice = liveCurrentPrice && liveCurrentPrice > 0 ? liveCurrentPrice : signalEntryPrice;
  
  // Enhanced price change calculation with null safety
  let change = 0;
  let percentage = 0;
  try {
    const priceChangeData = getPriceChange();
    change = priceChangeData?.change || 0;
    percentage = priceChangeData?.percentage || 0;
  } catch (error) {
    console.error('SignalCard: Error getting price change:', error);
  }

  // Enhanced chart data processing with validation
  let chartDataToDisplay = [];
  try {
    if (Array.isArray(centralizedChartData) && centralizedChartData.length > 0) {
      chartDataToDisplay = centralizedChartData
        .filter(point => {
          if (!point || typeof point !== 'object') return false;
          if (!point.timestamp || !point.price) return false;
          if (typeof point.price !== 'number' || point.price <= 0) return false;
          return true;
        })
        .map(point => ({
          timestamp: point.timestamp,
          time: point.time || new Date(point.timestamp).toLocaleTimeString(),
          price: point.price
        }));
    }
  } catch (error) {
    console.error('SignalCard: Error processing chart data:', error);
    chartDataToDisplay = [];
  }

  // Fallback chart data if needed
  if (chartDataToDisplay.length === 0 && safeSignal.chartData && Array.isArray(safeSignal.chartData)) {
    try {
      chartDataToDisplay = safeSignal.chartData
        .filter(point => point && point.time && point.price && point.price > 0)
        .map(point => ({
          timestamp: point.time,
          time: new Date(point.time).toLocaleTimeString(),
          price: point.price
        }));
    } catch (error) {
      console.error('SignalCard: Error using fallback chart data:', error);
    }
  }

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
        takeProfit4={validatedSignal?.takeProfit4 || '0.00000'}
        takeProfit5={validatedSignal?.takeProfit5 || '0.00000'}
        currentPrice={currentPrice}
        signalType={safeSignal.type}
        targetsHit={validatedSignal?.targetsHit || []}
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
