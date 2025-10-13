import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, TrendingUp, CheckCircle2 } from 'lucide-react';

export function DataPopulationPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<{
    historical: boolean;
    fourHour: boolean;
    checking: boolean;
  }>({
    historical: false,
    fourHour: false,
    checking: false,
  });
  const [dataStatus, setDataStatus] = useState<{
    daily?: number;
    weekly?: number;
    fourHour?: number;
  }>({});

  const checkDataStatus = async () => {
    setLoading(prev => ({ ...prev, checking: true }));
    try {
      const { count: dailyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', '1D');

      const { count: weeklyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', 'W');

      const { count: fourHourCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', '4H');

      setDataStatus({
        daily: dailyCount || 0,
        weekly: weeklyCount || 0,
        fourHour: fourHourCount || 0,
      });

      toast({
        title: "Data Status",
        description: `Daily: ${dailyCount || 0} | Weekly: ${weeklyCount || 0} | 4H: ${fourHourCount || 0}`,
      });
    } catch (error: any) {
      toast({
        title: "Error checking data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, checking: false }));
    }
  };

  const populateHistoricalData = async () => {
    setLoading(prev => ({ ...prev, historical: true }));
    try {
      toast({
        title: "Fetching historical data",
        description: "This may take several minutes...",
      });

      const { data, error } = await supabase.functions.invoke('fetch-historical-data', {
        body: {
          symbols: [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
            'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
            'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
            'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
          ],
          timeframes: ['1D', 'W']
        }
      });

      if (error) throw error;

      toast({
        title: "Historical data populated",
        description: `Inserted ${data.totalInserted} candles from ${data.stats.fastforex} FastForex + ${data.stats.alphavantage} Alpha Vantage`,
      });

      await checkDataStatus();
    } catch (error: any) {
      toast({
        title: "Error populating data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, historical: false }));
    }
  };

  const build4HCandles = async () => {
    setLoading(prev => ({ ...prev, fourHour: true }));
    try {
      toast({
        title: "Building 4H candles",
        description: "Aggregating live price history...",
      });

      const { data, error } = await supabase.functions.invoke('aggregate-4h-candles', {
        body: {
          symbols: [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
            'EURGBP', 'GBPCAD', 'EURAUD', 'EURCAD', 'GBPAUD', 'CHFJPY', 'NZDJPY',
            'GBPNZD', 'AUDCHF', 'CADJPY', 'NZDCHF', 'NZDCAD', 'AUDNZD', 'AUDJPY',
            'EURNZD', 'EURJPY', 'CADCHF', 'EURCHF', 'GBPCHF', 'GBPJPY'
          ]
        }
      });

      if (error) throw error;

      toast({
        title: "4H candles built",
        description: `Created ${data.totalCandles} 4H candles for ${data.processedSymbols}/${data.totalSymbols} symbols`,
      });

      await checkDataStatus();
    } catch (error: any) {
      toast({
        title: "Error building 4H candles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, fourHour: false }));
    }
  };

  const getStatusBadge = (count?: number) => {
    if (count === undefined) return <Badge variant="secondary">Unknown</Badge>;
    if (count === 0) return <Badge variant="destructive">Empty</Badge>;
    if (count < 1000) return <Badge variant="outline">Partial</Badge>;
    return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Population & System Activation</CardTitle>
        <CardDescription>
          Step 1: Populate historical data (1D, W) | Step 2: Build 4H candles | Step 3: Test signals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Current Data Status</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={checkDataStatus}
              disabled={loading.checking}
            >
              {loading.checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Status
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Daily (1D)</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{dataStatus.daily?.toLocaleString() || '—'}</span>
                {getStatusBadge(dataStatus.daily)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Weekly (W)</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{dataStatus.weekly?.toLocaleString() || '—'}</span>
                {getStatusBadge(dataStatus.weekly)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">4-Hour (4H)</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{dataStatus.fourHour?.toLocaleString() || '—'}</span>
                {getStatusBadge(dataStatus.fourHour)}
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Historical Data */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 mt-0.5 text-blue-500" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold">Step 1: Populate Historical Data</h4>
              <p className="text-sm text-muted-foreground">
                Fetch 5 years of daily and 9 years of weekly OHLC data from FastForex and Alpha Vantage.
                This data is required for multi-timeframe confluence analysis.
              </p>
              <Button
                onClick={populateHistoricalData}
                disabled={loading.historical}
                className="mt-2"
              >
                {loading.historical && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch Historical Data (1D, W)
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: 4H Candles */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 mt-0.5 text-purple-500" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold">Step 2: Build 4H Candles</h4>
              <p className="text-sm text-muted-foreground">
                Aggregate live price history (1-minute ticks) into 4-hour candles for intraday structure analysis.
                Requires that centralized-market-stream has been running.
              </p>
              <Button
                onClick={build4HCandles}
                disabled={loading.fourHour}
                variant="secondary"
                className="mt-2"
              >
                {loading.fourHour && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Build 4H Candles
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Next Steps:</p>
          <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
            <li>Click "Fetch Historical Data" to populate W and 1D timeframes</li>
            <li>Click "Build 4H Candles" to create intraday data</li>
            <li>Go to Signal Generation Testing page to test the system</li>
            <li>Once verified, automated signals will run every 5 minutes via GitHub Actions</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
