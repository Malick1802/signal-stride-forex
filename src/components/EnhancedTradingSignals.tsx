
import React, { useState, memo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Clock, 
  Target, 
  Shield,
  Brain,
  BarChart3,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ProfessionalSignalCard from './ProfessionalSignalCard';
import { measurePerformance, PerformanceMonitor } from '@/utils/performanceMonitoring';
import { detectEnhancedPatterns } from '@/utils/chartPatternDetection';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import SignalCardLoading from './SignalCardLoading';

interface ProfessionalSignalData {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  stop_loss: number;
  take_profits: number[];
  targets_hit?: number[];
  tier_level?: number;
  professional_grade?: boolean;
  technical_score?: number;
  fundamental_score?: number;
  sentiment_score?: number;
  risk_reward_ratio?: number;
  expected_duration_hours?: number;
  pattern_detected?: string;
  market_regime?: string;
  volatility_profile?: string;
  technical_indicators?: any;
  market_context?: any;
  fibonacci_entry?: number;
  fibonacci_targets?: number[];
  session_optimal?: boolean;
  multi_timeframe_confirmed?: boolean;
  correlation_checked?: boolean;
  news_impact_assessed?: boolean;
  created_at: string;
  analysis_text?: string;
}

const EnhancedTradingSignals = memo(() => {
  const [signals, setSignals] = useState<ProfessionalSignalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const { toast } = useToast();
  const { isConnected } = useMobileConnectivity();

  // Fetch professional signals with performance monitoring
  const fetchProfessionalSignals = measurePerformance('fetch-professional-signals', async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          price,
          confidence,
          stop_loss,
          take_profits,
          targets_hit,
          tier_level,
          professional_grade,
          technical_score,
          fundamental_score,
          sentiment_score,
          risk_reward_ratio,
          expected_duration_hours,
          pattern_detected,
          market_regime,
          volatility_profile,
          technical_indicators,
          market_context,
          fibonacci_entry,
          fibonacci_targets,
          session_optimal,
          multi_timeframe_confirmed,
          correlation_checked,
          news_impact_assessed,
          created_at,
          analysis_text
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedSignals: ProfessionalSignalData[] = (data || []).map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        type: signal.type as 'BUY' | 'SELL',
        price: parseFloat(signal.price?.toString() || '0'),
        confidence: signal.confidence || 50,
        stop_loss: parseFloat(signal.stop_loss?.toString() || '0'),
        take_profits: signal.take_profits || [],
        targets_hit: signal.targets_hit || [],
        tier_level: signal.tier_level,
        professional_grade: signal.professional_grade,
        technical_score: signal.technical_score,
        fundamental_score: signal.fundamental_score,
        sentiment_score: signal.sentiment_score,
        risk_reward_ratio: signal.risk_reward_ratio,
        expected_duration_hours: signal.expected_duration_hours,
        pattern_detected: signal.pattern_detected,
        market_regime: signal.market_regime,
        volatility_profile: signal.volatility_profile,
        technical_indicators: signal.technical_indicators,
        market_context: signal.market_context,
        fibonacci_entry: signal.fibonacci_entry,
        fibonacci_targets: signal.fibonacci_targets,
        session_optimal: signal.session_optimal,
        multi_timeframe_confirmed: signal.multi_timeframe_confirmed,
        correlation_checked: signal.correlation_checked,
        news_impact_assessed: signal.news_impact_assessed,
        created_at: signal.created_at,
        analysis_text: signal.analysis_text
      }));

      setSignals(formattedSignals);
    } catch (error) {
      console.error('Error fetching professional signals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch professional signals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  });

  // Initialize and refresh signals
  useEffect(() => {
    fetchProfessionalSignals();
    
    // Set up periodic refresh
    const interval = setInterval(fetchProfessionalSignals, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Update performance stats periodically
  useEffect(() => {
    const updateStats = () => {
      const stats = PerformanceMonitor.getInstance().getAllStats();
      setPerformanceStats(stats);
    };
    
    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter signals by tab
  const filteredSignals = signals.filter(signal => {
    switch (activeTab) {
      case 'professional':
        return signal.professional_grade;
      case 'tier3':
        return signal.tier_level === 3;
      case 'tier2':
        return signal.tier_level === 2;
      case 'tier1':
        return signal.tier_level === 1;
      case 'buy':
        return signal.type === 'BUY';
      case 'sell':
        return signal.type === 'SELL';
      default:
        return true;
    }
  });

  // Get signal statistics
  const getSignalStats = () => {
    const total = signals.length;
    const professional = signals.filter(s => s.professional_grade).length;
    const tier3 = signals.filter(s => s.tier_level === 3).length;
    const tier2 = signals.filter(s => s.tier_level === 2).length;
    const tier1 = signals.filter(s => s.tier_level === 1).length;
    const buySignals = signals.filter(s => s.type === 'BUY').length;
    const sellSignals = signals.filter(s => s.type === 'SELL').length;
    
    return { total, professional, tier3, tier2, tier1, buySignals, sellSignals };
  };

  const stats = getSignalStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Professional Trading Signals</h2>
          <p className="text-muted-foreground">AI-powered multi-tier signal generation system</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={fetchProfessionalSignals}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Signal Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-gold">{stats.professional}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Pro
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-purple-400">{stats.tier3}</div>
          <div className="text-xs text-muted-foreground">Tier 3</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-400">{stats.tier2}</div>
          <div className="text-xs text-muted-foreground">Tier 2</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-gray-400">{stats.tier1}</div>
          <div className="text-xs text-muted-foreground">Tier 1</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-400">{stats.buySignals}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Buy
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-400">{stats.sellSignals}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Sell
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="professional">
            <Zap className="w-4 h-4 mr-1" />
            Pro
          </TabsTrigger>
          <TabsTrigger value="tier3">Tier 3</TabsTrigger>
          <TabsTrigger value="tier2">Tier 2</TabsTrigger>
          <TabsTrigger value="tier1">Tier 1</TabsTrigger>
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <SignalCardLoading key={i} pair="Loading..." />
              ))}
            </div>
          ) : filteredSignals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSignals.map((signal) => (
                <ProfessionalSignalCard
                  key={signal.id}
                  signal={signal}
                  currentPrice={signal.price} // This should be updated with real-time data
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Signals Available</h3>
                <p className="text-sm">
                  {activeTab === 'all' 
                    ? 'No signals are currently active. The AI is continuously monitoring markets.'
                    : `No ${activeTab} signals found. Try a different filter.`}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Performance Stats (Debug Mode) */}
      {performanceStats && Object.keys(performanceStats).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Performance Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(performanceStats).map(([operation, stats]: [string, any]) => (
                <div key={operation} className="bg-muted/50 rounded p-3">
                  <div className="text-sm font-medium text-foreground">{operation}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {stats.avg?.toFixed(1)}ms | 
                    Count: {stats.count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

EnhancedTradingSignals.displayName = 'EnhancedTradingSignals';

export default EnhancedTradingSignals;
