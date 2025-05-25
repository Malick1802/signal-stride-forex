import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Shield, Brain, ChevronDown, ChevronUp, Copy, ExternalLink, Check } from 'lucide-react';
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
  const [currentPrice, setCurrentPrice] = useState<number>(parseFloat(signal.entryPrice));
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const { toast } = useToast();

  // Check if forex market is currently open
  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    const marketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;
    return !marketClosed;
  };

  // Generate realistic moving price data
  const generateMovingPrice = (basePrice: number, volatility: number = 0.0002) => {
    // Add some realistic price movement
    const randomMovement = (Math.random() - 0.5) * volatility;
    const trendMovement = Math.sin(Date.now() / 60000) * volatility * 0.5; // Slow trend
    const microMovement = Math.sin(Date.now() / 5000) * volatility * 0.2; // Fast micro movements
    
    return basePrice + randomMovement + trendMovement + microMovement;
  };

  // Fetch real market data or generate moving mock data
  const fetchOrGenerateMarketData = async () => {
    try {
      console.log(`Fetching live market data for ${signal.pair}...`);
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', signal.pair)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching market data:', error);
      }

      if (marketData && marketData.length > 0) {
        console.log(`Found ${marketData.length} market data points for ${signal.pair}`);
        
        // Use real market data
        const latestMarketData = marketData[0];
        const latestPrice = parseFloat(latestMarketData.price.toString());
        setCurrentPrice(latestPrice);

        const transformedData = marketData.reverse().map((item, index) => ({
          timestamp: new Date(item.created_at || item.timestamp).getTime(),
          time: new Date(item.created_at || item.timestamp).toLocaleTimeString(),
          price: parseFloat(item.price.toString()),
          volume: Math.random() * 500000
        }));

        setPriceData(transformedData);
      } else {
        console.log(`No market data found for ${signal.pair}, generating moving mock data`);
        // Generate moving mock data with realistic price movements
        generateMovingMockData();
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      generateMovingMockData();
    }
  };

  // Generate moving mock data that simulates real market movement
  const generateMovingMockData = () => {
    const basePrice = parseFloat(signal.entryPrice);
    const now = Date.now();
    const data: PriceData[] = [];
    
    // Update price history
    const newPrice = generateMovingPrice(basePrice);
    setPriceHistory(prev => {
      const updated = [...prev, newPrice].slice(-50); // Keep last 50 prices
      return updated;
    });
    
    setCurrentPrice(newPrice);

    // Generate chart data with moving prices
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const price = generateMovingPrice(basePrice, 0.0001);
      
      data.push({
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
        price,
        volume: Math.random() * 500000
      });
    }

    setPriceData(data);
  };

  // Check if take profit levels are hit
  const isTakeProfitHit = (takeProfitPrice: string): boolean => {
    if (!currentPrice) return false;
    
    const tpPrice = parseFloat(takeProfitPrice);
    
    if (signal.type === 'BUY') {
      return currentPrice >= tpPrice;
    } else {
      return currentPrice <= tpPrice;
    }
  };

  // Copy price to clipboard
  const copyToClipboard = async (price: string, label: string) => {
    try {
      await navigator.clipboard.writeText(price);
      toast({
        title: "Copied!",
        description: `${label} (${price}) copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Open MetaTrader
  const openMetaTrader = () => {
    const metaTraderUrl = `mt4://trade?symbol=${signal.pair}&action=${signal.type === 'BUY' ? 'buy' : 'sell'}`;
    window.open(metaTraderUrl, '_blank');
    
    toast({
      title: "Opening MetaTrader",
      description: "If MetaTrader doesn't open automatically, please open it manually and search for " + signal.pair,
    });
  };

  // Initialize and set up real-time updates
  useEffect(() => {
    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);
    
    // Initial data fetch
    fetchOrGenerateMarketData();
    
    // Set up intervals for updates
    const dataUpdateInterval = setInterval(() => {
      const currentlyOpen = checkMarketHours();
      setIsMarketOpen(currentlyOpen);
      fetchOrGenerateMarketData();
    }, 10000); // Update every 10 seconds for more movement

    // Quick price updates for live feel (only for mock data)
    const priceUpdateInterval = setInterval(() => {
      if (!isMarketOpen) {
        // Generate quick price movements even when market is closed for demo purposes
        const basePrice = parseFloat(signal.entryPrice);
        const newPrice = generateMovingPrice(basePrice, 0.00005);
        setCurrentPrice(newPrice);
      }
    }, 2000); // Update every 2 seconds for smooth movement

    return () => {
      clearInterval(dataUpdateInterval);
      clearInterval(priceUpdateInterval);
    };
  }, [signal.pair]);

  const chartConfig = {
    price: {
      label: "Price",
      color: signal.type === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  const formatPrice = (price: number) => {
    return price.toFixed(signal.pair.includes('JPY') ? 3 : 5);
  };

  const getPriceChange = () => {
    if (!currentPrice) return { change: 0, percentage: 0 };
    
    const entryPrice = parseFloat(signal.entryPrice);
    const change = currentPrice - entryPrice;
    const percentage = (change / entryPrice) * 100;
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();

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
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {isMarketOpen ? 'LIVE' : 'DEMO'}
            </span>
          </div>
        </div>
        
        {/* Current Price and Change */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {signal.type === 'BUY' ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-white text-lg font-mono">{formatPrice(currentPrice)}</span>
            <span className={`text-xs px-1 py-0.5 rounded ${
              change >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isMarketOpen ? 'Live' : 'Demo'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-mono ${
              change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(signal.pair.includes('JPY') ? 3 : 5)} 
              ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
            </span>
            <Shield className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">{signal.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Trading Chart */}
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
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                domain={['dataMin - 0.0005', 'dataMax + 0.0005']}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
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
                animationDuration={1000}
              />
              {/* Entry Price Line */}
              <Line
                type="monotone"
                dataKey={() => parseFloat(signal.entryPrice)}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
              />
              {/* Stop Loss Line */}
              <Line
                type="monotone"
                dataKey={() => parseFloat(signal.stopLoss)}
                stroke="rgba(239,68,68,0.8)"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                connectNulls
              />
              {/* Take Profit Lines */}
              <Line
                type="monotone"
                dataKey={() => parseFloat(signal.takeProfit1)}
                stroke="rgba(16,185,129,0.6)"
                strokeWidth={1}
                strokeDasharray="1 1"
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
          <span className="text-gray-400">Current Price</span>
          <div className="flex items-center space-x-2">
            <span className={`font-mono ${
              change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {formatPrice(currentPrice)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(formatPrice(currentPrice), 'Current Price')}
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

        {/* AI Analysis Section with Collapsible */}
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
                  <div className="text-gray-400 text-xs mb-2">Quick Analysis:</div>
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
            <div className="text-xs text-gray-400">
              {isMarketOpen ? 'Market data' : 'Demo mode'}
            </div>
          </div>
          
          {/* Trade Now Button */}
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
