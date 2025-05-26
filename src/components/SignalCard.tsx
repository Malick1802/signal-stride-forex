import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Shield, ChevronDown, ChevronUp, Copy, ExternalLink, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();

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

  const isTakeProfitHit = (takeProfitPrice: string): boolean => {
    if (!currentPrice || !takeProfitPrice || takeProfitPrice === '0.00000') return false;
    
    try {
      const tpPrice = parseFloat(takeProfitPrice);
      
      if (signal.type === 'BUY') {
        return currentPrice >= tpPrice;
      } else {
        return currentPrice <= tpPrice;
      }
    } catch {
      return false;
    }
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

  const copyToClipboard = async (price: string, label: string) => {
    try {
      await navigator.clipboard.writeText(price);
      toast({
        title: "Copied!",
        description: `${label} (${price}) copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const openMetaTrader = () => {
    const metaTraderUrl = `mt4://trade?symbol=${signal.pair}&action=${signal.type === 'BUY' ? 'buy' : 'sell'}`;
    window.open(metaTraderUrl, '_blank');
    
    toast({
      title: "Opening MetaTrader",
      description: `Opening ${signal.pair} ${signal.type} in MetaTrader`,
    });
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

  const chartConfig = {
    price: {
      label: "Price",
      color: signal.type === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

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
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{signal.pair}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FOREX</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              signal.type === 'BUY' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {signal.type}
            </span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              isMarketOpen 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isMarketOpen ? 'LIVE' : 'CLOSED'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {signal.type === 'BUY' ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-white text-lg font-mono">{formatPrice(currentPrice)}</span>
            <div className="flex flex-col text-xs text-gray-400">
              <span>{dataSource}</span>
              {lastUpdateTime && <span>Updated: {lastUpdateTime}</span>}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-mono ${
              change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(5)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
            </span>
            <Shield className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">{signal.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 p-4">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                domain={['dataMin - 0.0005', 'dataMax + 0.0005']}
                tickFormatter={formatPrice}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [formatPrice(Number(value)), 'Price']}
                  labelFormatter={(label) => `Time: ${label}`}
                />} 
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={signal.type === 'BUY' ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Signal Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Entry Price</span>
          <div className="flex items-center space-x-2">
            <span className="text-white font-mono">{signal.entryPrice}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(signal.entryPrice, 'Entry Price')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Stop Loss</span>
          <div className="flex items-center space-x-2">
            <span className="text-red-400 font-mono">{signal.stopLoss}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(signal.stopLoss, 'Stop Loss')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 1</span>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-mono">{signal.takeProfit1}</span>
              {isTakeProfitHit(signal.takeProfit1) && (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(signal.takeProfit1, 'Target 1')}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 2</span>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-mono">{signal.takeProfit2}</span>
              {isTakeProfitHit(signal.takeProfit2) && (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(signal.takeProfit2, 'Target 2')}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 3</span>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-mono">{signal.takeProfit3}</span>
              {isTakeProfitHit(signal.takeProfit3) && (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(signal.takeProfit3, 'Target 3')}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        {(signal.analysisText || analysis[signal.id]) && (
          <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400">AI Analysis</span>
                  </div>
                  {isAnalysisOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3">
              {signal.analysisText && (
                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-2">Analysis:</div>
                  <div className="text-white text-xs bg-black/20 rounded p-2">
                    {signal.analysisText}
                  </div>
                </div>
              )}

              {analysis[signal.id] && (
                <div>
                  <div className="text-blue-400 text-xs mb-2">Detailed Analysis:</div>
                  <div className="text-white text-xs bg-blue-500/10 rounded p-2 max-h-40 overflow-y-auto">
                    {analysis[signal.id]}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center space-x-1 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
          
          <Button
            onClick={openMetaTrader}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Trade Now in MetaTrader
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
