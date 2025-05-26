
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
  };
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

  // Validate signal data
  if (!signal?.id || !signal?.pair || !signal?.type) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="text-center text-gray-400">
          Invalid signal data
        </div>
      </div>
    );
  }

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
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', signal.pair)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error(`Error fetching market data for ${signal.pair}:`, error);
        return;
      }

      if (marketData && marketData.length > 0) {
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

        setPriceData(transformedData);
        const latestPrice = transformedData[transformedData.length - 1]?.price;
        setCurrentPrice(latestPrice);
        setLastUpdateTime(new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }));
        
        console.log(`📊 Updated ${signal.pair} with real price: ${latestPrice}`);
      } else {
        console.log(`No recent data for ${signal.pair}, using entry price`);
        // Use entry price as fallback
        const entryPrice = parseFloat(signal.entryPrice);
        setCurrentPrice(entryPrice);
        
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
        setDataSource('Entry Price (No Live Data)');
      }
    } catch (error) {
      console.error('Error in fetchRealMarketData:', error);
    }
  };

  useEffect(() => {
    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);
    
    fetchRealMarketData();
    
    // Update every 15 seconds during market hours
    if (marketOpen) {
      const interval = setInterval(fetchRealMarketData, 15000);
      return () => clearInterval(interval);
    }
  }, [signal.pair]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`market-updates-${signal.pair}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${signal.pair}`
        },
        () => {
          console.log(`🔔 Real-time update for ${signal.pair}`);
          setTimeout(fetchRealMarketData, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [signal.pair]);

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
          <div className="text-xl font-bold text-white mb-2">{signal.pair}</div>
          <div className="text-gray-400 mb-4">Loading market data...</div>
          <div className="animate-pulse bg-white/10 h-4 w-3/4 mx-auto rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <SignalHeader
        pair={signal.pair}
        type={signal.type}
        currentPrice={currentPrice}
        confidence={signal.confidence}
        isMarketOpen={isMarketOpen}
        change={change}
        percentage={percentage}
        dataSource={dataSource}
        lastUpdateTime={lastUpdateTime}
      />

      <SignalChart
        priceData={priceData}
        signalType={signal.type}
      />

      <SignalPriceDetails
        entryPrice={signal.entryPrice}
        stopLoss={signal.stopLoss}
        takeProfit1={signal.takeProfit1}
        takeProfit2={signal.takeProfit2}
        takeProfit3={signal.takeProfit3}
        currentPrice={currentPrice}
        signalType={signal.type}
      />

      <div className="px-4">
        <SignalAnalysis
          analysisText={signal.analysisText}
          analysis={analysis[signal.id]}
          isAnalysisOpen={isAnalysisOpen}
          onToggleAnalysis={setIsAnalysisOpen}
        />

        <SignalActions
          pair={signal.pair}
          type={signal.type}
          timestamp={signal.timestamp}
        />
      </div>
    </div>
  );
};

export default SignalCard;
