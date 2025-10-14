import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, TrendingUp, CheckCircle2, Play, Square } from 'lucide-react';

const FOREX_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD',
  'AUDJPY', 'AUDCHF', 'AUDCAD', 'AUDNZD',
  'NZDJPY', 'NZDCHF', 'NZDCAD',
  'CADJPY', 'CADCHF', 'CHFJPY'
];

interface PopulationProgress {
  current: number;
  total: number;
  status: string;
  lastResult?: string;
  stats: {
    '1D': { success: string[], failed: string[] };
    'W': { success: string[], failed: string[] };
    '4H': { success: string[], failed: string[] };
  };
}

export function DataPopulationPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dataStatus, setDataStatus] = useState<{
    daily?: number;
    weekly?: number;
    fourHour?: number;
  }>({});
  const [progress, setProgress] = useState<PopulationProgress | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const checkDataStatus = async () => {
    setChecking(true);
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
      setChecking(false);
    }
  };

  const populateHistoricalData = async () => {
    setLoading(true);
    setCancelRequested(false);
    
    const totalOps = FOREX_SYMBOLS.length * 3; // 3 timeframes per symbol
    
    setProgress({
      current: 0,
      total: totalOps,
      status: 'Starting...',
      stats: {
        '1D': { success: [], failed: [] },
        'W': { success: [], failed: [] },
        '4H': { success: [], failed: [] }
      }
    });

    try {
      for (let i = 0; i < FOREX_SYMBOLS.length; i++) {
        if (cancelRequested) {
          toast({
            title: "Population cancelled",
            description: `Stopped at ${FOREX_SYMBOLS[i]} (${i}/${FOREX_SYMBOLS.length})`,
          });
          break;
        }

        const symbol = FOREX_SYMBOLS[i];
        
        // Fetch 1D data
        setProgress(prev => ({
          ...prev!,
          current: i * 3 + 1,
          status: `${symbol} (${i + 1}/${FOREX_SYMBOLS.length}): Fetching daily...`
        }));
        
        try {
          const { data, error } = await supabase.functions.invoke('fetch-historical-data', {
            body: { symbol, timeframe: '1D' }
          });
          
          if (error) throw error;
          
          setProgress(prev => ({
            ...prev!,
            lastResult: `✓ ${symbol} 1D: ${data.inserted} candles`,
            stats: {
              ...prev!.stats,
              '1D': {
                ...prev!.stats['1D'],
                success: [...prev!.stats['1D'].success, symbol]
              }
            }
          }));
        } catch (err) {
          console.error(`Failed ${symbol} 1D:`, err);
          setProgress(prev => ({
            ...prev!,
            stats: {
              ...prev!.stats,
              '1D': {
                ...prev!.stats['1D'],
                failed: [...prev!.stats['1D'].failed, symbol]
              }
            }
          }));
        }
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Fetch W data
        setProgress(prev => ({
          ...prev!,
          current: i * 3 + 2,
          status: `${symbol} (${i + 1}/${FOREX_SYMBOLS.length}): Fetching weekly...`
        }));
        
        try {
          const { data, error } = await supabase.functions.invoke('fetch-historical-data', {
            body: { symbol, timeframe: 'W' }
          });
          
          if (error) throw error;
          
          setProgress(prev => ({
            ...prev!,
            lastResult: `✓ ${symbol} W: ${data.inserted} candles`,
            stats: {
              ...prev!.stats,
              'W': {
                ...prev!.stats['W'],
                success: [...prev!.stats['W'].success, symbol]
              }
            }
          }));
        } catch (err) {
          console.error(`Failed ${symbol} W:`, err);
          setProgress(prev => ({
            ...prev!,
            stats: {
              ...prev!.stats,
              'W': {
                ...prev!.stats['W'],
                failed: [...prev!.stats['W'].failed, symbol]
              }
            }
          }));
        }
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Fetch 4H data (synthetic)
        setProgress(prev => ({
          ...prev!,
          current: i * 3 + 3,
          status: `${symbol} (${i + 1}/${FOREX_SYMBOLS.length}): Fetching 4H synthetic...`
        }));
        
        try {
          const { data, error } = await supabase.functions.invoke('fetch-historical-data', {
            body: { symbol, timeframe: '4H' }
          });
          
          if (error) throw error;
          
          setProgress(prev => ({
            ...prev!,
            lastResult: `✓ ${symbol} 4H: ${data.inserted} candles (synthetic)`,
            stats: {
              ...prev!.stats,
              '4H': {
                ...prev!.stats['4H'],
                success: [...prev!.stats['4H'].success, symbol]
              }
            }
          }));
        } catch (err) {
          console.error(`Failed ${symbol} 4H:`, err);
          setProgress(prev => ({
            ...prev!,
            stats: {
              ...prev!.stats,
              '4H': {
                ...prev!.stats['4H'],
                failed: [...prev!.stats['4H'].failed, symbol]
              }
            }
          }));
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!cancelRequested) {
        setProgress(prev => ({
          ...prev!,
          current: totalOps,
          status: 'Complete!'
        }));
        
        toast({
          title: "Population complete",
          description: `1D: ${progress?.stats['1D'].success.length}/${FOREX_SYMBOLS.length}, W: ${progress?.stats['W'].success.length}/${FOREX_SYMBOLS.length}, 4H: ${progress?.stats['4H'].success.length}/${FOREX_SYMBOLS.length}`,
        });
      }

      checkDataStatus();
    } catch (error) {
      console.error('Error populating data:', error);
      toast({
        title: "Error",
        description: "Failed to populate historical data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        <CardTitle>Historical Data Population</CardTitle>
        <CardDescription>
          Fetch 1D (1 year), W (5 years), and 4H (6 months synthetic) data for all 27 forex pairs
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
              disabled={checking}
            >
              {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

        {/* Population Progress */}
        {progress && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{progress.status}</span>
              <span className="text-muted-foreground">
                {progress.current}/{progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
              </span>
            </div>
            
            <Progress value={(progress.current / progress.total) * 100} />
            
            {progress.lastResult && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {progress.lastResult}
              </p>
            )}
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="font-medium">1D:</span> {progress.stats['1D'].success.length}/{FOREX_SYMBOLS.length}
                {progress.stats['1D'].failed.length > 0 && (
                  <span className="text-destructive ml-1">({progress.stats['1D'].failed.length} failed)</span>
                )}
              </div>
              <div>
                <span className="font-medium">W:</span> {progress.stats['W'].success.length}/{FOREX_SYMBOLS.length}
                {progress.stats['W'].failed.length > 0 && (
                  <span className="text-destructive ml-1">({progress.stats['W'].failed.length} failed)</span>
                )}
              </div>
              <div>
                <span className="font-medium">4H:</span> {progress.stats['4H'].success.length}/{FOREX_SYMBOLS.length}
                {progress.stats['4H'].failed.length > 0 && (
                  <span className="text-destructive ml-1">({progress.stats['4H'].failed.length} failed)</span>
                )}
              </div>
            </div>
            
            {(progress.stats['1D'].failed.length > 0 || 
              progress.stats['W'].failed.length > 0 || 
              progress.stats['4H'].failed.length > 0) && (
              <details className="text-xs">
                <summary className="cursor-pointer text-destructive">Failed symbols</summary>
                <div className="mt-2 space-y-1 pl-4">
                  {progress.stats['1D'].failed.length > 0 && (
                    <div>1D: {progress.stats['1D'].failed.join(', ')}</div>
                  )}
                  {progress.stats['W'].failed.length > 0 && (
                    <div>W: {progress.stats['W'].failed.join(', ')}</div>
                  )}
                  {progress.stats['4H'].failed.length > 0 && (
                    <div>4H: {progress.stats['4H'].failed.join(', ')}</div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Population Button */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={populateHistoricalData} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Populate All Timeframes (1D, W, 4H)
                </>
              )}
            </Button>
            {loading && (
              <Button 
                variant="destructive" 
                onClick={() => setCancelRequested(true)}
                size="icon"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Estimated time: ~3 minutes for all 27 pairs × 3 timeframes (FastForex rate limited to 1 req/sec)
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">What happens:</p>
          <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
            <li>Fetches 1 year of daily data for each pair from FastForex</li>
            <li>Fetches 5 years of weekly data (aggregated from daily)</li>
            <li>Generates 6 months of synthetic 4H candles from daily data</li>
            <li>Live stream will gradually replace synthetic 4H with real data</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
