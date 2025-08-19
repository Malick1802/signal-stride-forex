
import React, { useState, memo, useMemo } from 'react';
import { validateSignal, createSafeSignal } from '@/utils/signalValidation';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import { processChartData, mergeChartDataWithCurrentPrice, createFallbackChartData } from '@/utils/chartDataUtils';
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
    // Centralized performance data
    current_pips?: number;
    current_percentage?: number;
    current_pnl?: number;
    current_price?: number | null;
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

  // Use centralized performance data from database (server-calculated)
  const currentPips = signal.current_pips || 0;
  const currentPercentage = signal.current_percentage || 0; 
  const currentPnl = signal.current_pnl || 0;
  const serverCurrentPrice = signal.current_price;
  
  // Get live market price for display only
  const { currentPrice: liveCurrentPrice, isMarketOpen, dataSource } = useRealTimeMarketData({
    pair: safeSignal.pair
  });

  // Fixed signal entry price (never changes) with validation
  const signalEntryPrice = parseFloat(safeSignal.entryPrice);
  if (isNaN(signalEntryPrice) || signalEntryPrice <= 0) {
    console.error('SignalCard: Invalid entry price after validation:', safeSignal.entryPrice);
    return null;
  }
  
  // Use server price or live price, fallback to entry price
  const currentPrice = serverCurrentPrice || liveCurrentPrice || signalEntryPrice;
  
  // Process and merge chart data with current price  
  const chartDataToDisplay = useMemo(() => {
    console.log('📊 SignalCard processing chart data:', {
      signalId: signal.id,
      hasChartData: !!signal.chartData,
      chartDataLength: Array.isArray(signal.chartData) ? signal.chartData.length : 0,
      hasCurrentPrice: !!currentPrice,
      currentPrice,
      serverCurrentPrice,
      liveCurrentPrice,
      isMarketOpen
    });

    let processedData: { timestamp: number; time: string; price: number; isEntry?: boolean; isFrozen?: boolean }[] = [];
    
    // Process historical chart data if available
    if (signal.chartData && Array.isArray(signal.chartData) && signal.chartData.length > 0) {
      try {
        processedData = processChartData(signal.chartData);
        console.log('📊 Processed historical chart data:', {
          originalLength: signal.chartData.length,
          processedLength: processedData.length,
          sampleData: processedData.slice(0, 2)
        });
      } catch (error) {
        console.error('❌ Error processing chart data:', error);
        processedData = [];
      }
    }
    
    // If no valid historical data, create fallback data
    if (processedData.length === 0) {
      const fallbackPrice = currentPrice || signal.current_price || signalEntryPrice;
      processedData = createFallbackChartData(
        fallbackPrice,
        signalEntryPrice,
        isMarketOpen ?? true
      );
      console.log('📊 Created fallback chart data:', {
        length: processedData.length,
        fallbackPrice,
        entryPrice: signalEntryPrice
      });
    }
    
    // Merge with current price if available and different from last point
    const priceToMerge = currentPrice || signal.current_price;
    if (priceToMerge && priceToMerge > 0) {
      const originalLength = processedData.length;
      processedData = mergeChartDataWithCurrentPrice(processedData, priceToMerge);
      console.log('📊 Merged current price:', {
        priceToMerge,
        originalLength,
        newLength: processedData.length
      });
    }

    return processedData;
  }, [signal.chartData, signal.id, signalEntryPrice, signal.current_price, currentPrice, liveCurrentPrice, serverCurrentPrice, isMarketOpen]);

  // Enhanced connection status
  const connectionStatus = (isMarketOpen || chartDataToDisplay.length > 0) && 
    chartDataToDisplay.some(point => typeof point.price === 'number' && !isNaN(point.price));

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
