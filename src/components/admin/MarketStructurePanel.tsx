import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const MAJOR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'EURGBP', 'EURCAD', 'EURCHF', 'EURAUD', 'EURNZD',
  'GBPCAD', 'GBPCHF', 'GBPAUD', 'GBPNZD', 'AUDJPY', 'AUDNZD', 'AUDCAD',
  'AUDCHF', 'CADJPY', 'CHFJPY', 'NZDJPY', 'NZDCAD', 'NZDCHF'
];

const TIMEFRAMES = ['W', 'D', '4H'];

interface DataStatus {
  timeframe: string;
  count: number;
  minDate: string | null;
  maxDate: string | null;
}

interface TrendStatus {
  totalRecords: number;
  neutralCount: number;
}

export default function MarketStructurePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInvoking, setIsInvoking] = useState<string | null>(null);

  // Fetch multi_timeframe_data status
  const { data: dataStatus, isLoading: isLoadingData } = useQuery({
    queryKey: ['market-data-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('multi_timeframe_data')
        .select('timeframe, timestamp')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const grouped = TIMEFRAMES.map(tf => {
        const records = data.filter(r => r.timeframe === tf);
        return {
          timeframe: tf,
          count: records.length,
          minDate: records.length > 0 ? records[records.length - 1].timestamp : null,
          maxDate: records.length > 0 ? records[0].timestamp : null
        };
      });

      return grouped as DataStatus[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch market_structure_trends status
  const { data: trendStatus, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['market-structure-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_structure_trends')
        .select('trend');

      if (error) throw error;

      const neutralCount = data.filter(r => r.trend === 'neutral').length;

      return {
        totalRecords: data.length,
        neutralCount
      } as TrendStatus;
    },
    refetchInterval: 10000,
  });

  // Invoke edge function mutation
  const invokeFunction = useMutation({
    mutationFn: async (functionName: string) => {
      setIsInvoking(functionName);
      
      const { data, error } = await supabase.functions.invoke('admin-invoke-function', {
        body: { functionName }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, functionName) => {
      toast({
        title: 'Function Invoked Successfully',
        description: `${functionName} completed. Check logs for details.`,
      });
      queryClient.invalidateQueries({ queryKey: ['market-data-status'] });
      queryClient.invalidateQueries({ queryKey: ['market-structure-status'] });
      setIsInvoking(null);
    },
    onError: (error: any, functionName) => {
      toast({
        title: 'Function Invocation Failed',
        description: error.message || `Failed to invoke ${functionName}`,
        variant: 'destructive',
      });
      setIsInvoking(null);
    },
  });

  const getStatusBadge = (count: number, expected: number) => {
    const percentage = (count / expected) * 100;
    
    if (percentage >= 90) {
      return <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Ready
      </Badge>;
    } else if (percentage >= 50) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Partial
      </Badge>;
    } else {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Missing
      </Badge>;
    }
  };

  const expectedDataCount = MAJOR_PAIRS.length * 365; // Roughly 1 year of daily data
  const expectedTrendCount = MAJOR_PAIRS.length * TIMEFRAMES.length; // 27 × 3 = 81

  const isSystemReady = 
    trendStatus?.totalRecords === expectedTrendCount &&
    dataStatus?.find(d => d.timeframe === 'D')?.count && 
    dataStatus.find(d => d.timeframe === 'D')!.count > 10000;

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Market Data System Status
          </CardTitle>
          <CardDescription>
            Monitor and manage market structure data for signal generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSystemReady ? (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                ✅ System is ready to generate signals! All market structure data is populated.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ System is NOT ready. Please fetch daily data and run market structure backfill.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Multi-Timeframe Data</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="space-y-2">
                    {dataStatus?.map(status => (
                      <div key={status.timeframe} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status.timeframe}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{status.count.toLocaleString()} records</span>
                          {getStatusBadge(status.count, expectedDataCount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Market Structure Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTrends ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Records:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {trendStatus?.totalRecords || 0} / {expectedTrendCount}
                        </span>
                        {getStatusBadge(trendStatus?.totalRecords || 0, expectedTrendCount)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Neutral Trends:</span>
                      <span className="text-sm text-muted-foreground">
                        {trendStatus?.neutralCount || 0}
                      </span>
                    </div>
                    {trendStatus && (
                      <Progress 
                        value={(trendStatus.totalRecords / expectedTrendCount) * 100} 
                        className="mt-2"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Market Data Operations
          </CardTitle>
          <CardDescription>
            Execute data fetching and backfill operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Step 1: Fetch Historical Data</h4>
              <p className="text-sm text-muted-foreground">
                Fetches daily OHLC data for all 27 major pairs. Takes 30-60 minutes.
              </p>
              <Button
                onClick={() => invokeFunction.mutate('batch-fetch-daily-data')}
                disabled={isInvoking !== null}
                className="w-full"
              >
                {isInvoking === 'batch-fetch-daily-data' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Fetch Daily Historical Data
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Step 2: Build Market Structure</h4>
              <p className="text-sm text-muted-foreground">
                Analyzes market structure trends across all timeframes. Takes 10-30 minutes.
              </p>
              <Button
                onClick={() => invokeFunction.mutate('backfill-market-structure')}
                disabled={isInvoking !== null}
                className="w-full"
                variant="secondary"
              >
                {isInvoking === 'backfill-market-structure' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Building Structure...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Run Market Structure Backfill
                  </>
                )}
              </Button>
            </div>
          </div>

          {isInvoking && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Function is running in the background. This may take several minutes. 
                The status will update automatically when complete.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Symbol Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol × Timeframe Status Matrix</CardTitle>
          <CardDescription>
            Expected: {expectedTrendCount} records (27 symbols × 3 timeframes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Current Coverage: {trendStatus?.totalRecords || 0} / {expectedTrendCount} combinations
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIMEFRAMES.map(tf => {
              const tfData = dataStatus?.find(d => d.timeframe === tf);
              const recordsPerSymbol = Math.floor((tfData?.count || 0) / MAJOR_PAIRS.length);
              
              return (
                <Card key={tf} className="p-3">
                  <div className="font-medium text-sm mb-2">{tf} Timeframe</div>
                  <div className="text-xs text-muted-foreground">
                    ~{recordsPerSymbol} records/symbol
                  </div>
                  {tfData && getStatusBadge(tfData.count, expectedDataCount)}
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
