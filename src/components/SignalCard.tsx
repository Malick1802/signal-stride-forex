
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SignalHeader from './SignalHeader';
import SignalChart from './SignalChart';
import SignalPriceDetails from './SignalPriceDetails';
import SignalAnalysis from './SignalAnalysis';
import SignalActions from './SignalActions';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

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

const SignalCard = ({ signal, analysis }: SignalCardProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('FastForex API');

  // Early return if signal is null or invalid
  if (!signal || typeof signal !== 'object') {
    console.error('SignalCard: Invalid or null signal provided');
    return null;
  }

  // Create safe signal with proper null checking
  const safeSignal = {
    id: signal?.id || 'unknown',
    pair: signal?.pair || 'UNKNOWN',
    type: signal?.type || 'BUY',
    entryPrice: signal?.entryPrice || '0.00000',
    stopLoss: signal?.stopLoss || '0.00000',
    takeProfit1: signal?.takeProfit1 || '0.00000',
    takeProfit2: signal?.takeProfit2 || '0.00000',
    takeProfit3: signal?.takeProfit3 || '0.00000',
    confidence: signal?.confidence || 0,
    timestamp: signal?.timestamp || new Date().toISOString(),
    analysisText: signal?.analysisText || 'No analysis available',
    chartData: signal?.chartData || []
  };

  // Additional validation for critical fields
  if (!safeSignal.id || safeSignal.id === 'unknown' || 
      !safeSignal.pair || safeSignal.pair === 'UNKNOWN' || 
      !safeSignal.type) {
    console.error('SignalCard: Invalid signal data after validation:', safeSignal);
    return null;
  }

  console.log(`SignalCard: Processing signal ${safeSignal.id} - ${safeSignal.pair} ${safeSignal.type}`);

  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
  };

  const fetchRealMarketData = async () => {
    try {
      console.log(`Fetching market data for ${safeSignal.pair}`);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', safeSignal.pair)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error(`Error fetching market data for ${safeSignal.pair}:`, error);
        setFallbackData();
        return;
      }

      if (marketData && marketData.length > 0) {
        console.log(`📊 Found ${marketData.length} records for ${safeSignal.pair}`);
        const transformedData = marketData.reverse().map((item, index) => ({
          timestamp: new Date(item.created_at || item.timestamp).getTime(),
          time: new Date(item.created_at || item.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }),
          price: parseFloat((item.price || 0).toString()),
          volume: Math.random() * 500000
        }));

        // Filter out invalid prices
        const validData = transformedData.filter(item => 
          !isNaN(item.price) && item.price > 0 && isFinite(item.price)
        );

        if (validData.length > 0) {
          setPriceData(validData);
          const latestPrice = validData[validData.length - 1]?.price;
          setCurrentPrice(latestPrice);
          setLastUpdateTime(new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }));
          setDataSource('FastForex API (Live)');
          console.log(`📊 Updated ${safeSignal.pair} with real price: ${latestPrice}`);
        } else {
          console.log(`Invalid price data for ${safeSignal.pair}, using fallback`);
          setFallbackData();
        }
      } else {
        console.log(`No recent data for ${safeSignal.pair}, using entry price`);
        setFallbackData();
      }
    } catch (error) {
      console.error('Error in fetchRealMarketData:', error);
      setFallbackData();
    }
  };

  const setFallbackData = () => {
    // Use entry price as fallback with validation
    const entryPrice = parseFloat(safeSignal.entryPrice) || 1.0;
    if (isNaN(entryPrice) || entryPrice <= 0) {
      console.error(`Invalid entry price for ${safeSignal.pair}: ${safeSignal.entryPrice}`);
      return;
    }
    
    setCurrentPrice(entryPrice);
    setDataSource('Entry Price (Demo)');
    
    // Create minimal chart data
    const now = Date.now();
    const fallbackData = Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - (10 - i) * 60000,
      time: new Date(now - (10 - i) * 60000).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: entryPrice * (1 + (Math.random() - 0.5) * 0.001),
      volume: Math.random() * 100000
    }));
    
    setPriceData(fallbackData);
  };

  useEffect(() => {
    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);
    
    // Initialize with fallback data first
    setFallbackData();
    
    // Then try to fetch real data
    fetchRealMarketData();
    
    // Update every 30 seconds during market hours
    if (marketOpen) {
      const interval = setInterval(fetchRealMarketData, 30000);
      return () => clearInterval(interval);
    }
  }, [safeSignal.pair]);

  // Real-time subscription with error handling
  useEffect(() => {
    const channel = supabase
      .channel(`market-updates-${safeSignal.pair}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${safeSignal.pair}`
        },
        () => {
          console.log(`🔔 Real-time update for ${safeSignal.pair}`);
          setTimeout(fetchRealMarketData, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [safeSignal.pair]);

  const getPriceChange = () => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    const current = priceData[priceData.length - 1]?.price || 0;
    const previous = priceData[0]?.price || 0;
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();

  // Show loading state if no price data yet
  if (!currentPrice || priceData.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <div className="text-center">
          <div className="text-xl font-bold text-white mb-2">{safeSignal.pair}</div>
          <div className="text-gray-400 mb-4">Loading market data...</div>
          <div className="animate-pulse bg-white/10 h-4 w-3/4 mx-auto rounded"></div>
        </div>
      </div>
    );
  }

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

      <SignalChart
        priceData={priceData}
        signalType={safeSignal.type}
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
};

export default SignalCard;
