import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useADXTrends } from "@/hooks/useADXTrends";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TIMEFRAMES = ['W', 'D', '4H'] as const;
const MAJOR_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY'
];

export const ADXMonitoringPanel = () => {
  const { trends, loading, lastUpdate } = useADXTrends();

  const getTrendIcon = (trend: string) => {
    if (trend === 'bullish') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'bearish') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendStrengthBadge = (adx: number | null, strength: string | null) => {
    if (adx === null) {
      return <Badge variant="outline" className="text-xs">No Data</Badge>;
    }

    if (adx >= 50) {
      return <Badge className="text-xs bg-gradient-to-r from-purple-600 to-pink-600">Very Strong ({adx.toFixed(1)})</Badge>;
    } else if (adx >= 40) {
      return <Badge className="text-xs bg-green-600">Strong ({adx.toFixed(1)})</Badge>;
    } else if (adx >= 25) {
      return <Badge className="text-xs bg-blue-600">Moderate ({adx.toFixed(1)})</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Weak ({adx.toFixed(1)})</Badge>;
    }
  };

  const getUpdateStatus = (lastUpdated: string) => {
    const updateTime = new Date(lastUpdated);
    const minutesAgo = (Date.now() - updateTime.getTime()) / 1000 / 60;

    if (minutesAgo > 5) {
      return <Badge variant="destructive" className="text-xs">Stale</Badge>;
    } else if (minutesAgo > 3) {
      return <Badge variant="outline" className="text-xs text-yellow-600">Warning</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-green-600">Fresh</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ADX/DMI Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading ADX trends...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ADX/DMI Real-Time Monitoring
          </CardTitle>
          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {MAJOR_PAIRS.map((pair) => {
            const pairSymbol = pair.replace('/', '');
            
            return (
              <div key={pair} className="border rounded-lg p-4">
                <div className="font-semibold text-lg mb-3">{pair}</div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {TIMEFRAMES.map((timeframe) => {
                    const key = `${pairSymbol}_${timeframe}`;
                    const trend = trends[key];

                    if (!trend) {
                      return (
                        <div key={timeframe} className="border rounded p-3 bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{timeframe}</span>
                            <Badge variant="outline" className="text-xs">No Data</Badge>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={timeframe} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{timeframe}</span>
                          {getUpdateStatus(trend.last_updated)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getTrendIcon(trend.trend)}
                          <span className="text-xs capitalize">{trend.trend}</span>
                        </div>

                        <div className="space-y-1">
                          {getTrendStrengthBadge(trend.adx, trend.trend_strength)}
                          
                          {trend.plus_di !== null && trend.minus_di !== null && (
                            <div className="text-xs text-muted-foreground">
                              +DI: {trend.plus_di.toFixed(1)} | -DI: {trend.minus_di.toFixed(1)}
                            </div>
                          )}
                          
                          {trend.di_separation !== null && (
                            <div className="text-xs text-muted-foreground">
                              Separation: {trend.di_separation.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-2">Legend:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div><strong>ADX &gt; 50:</strong> Very Strong Trend</div>
            <div><strong>ADX 40-50:</strong> Strong Trend</div>
            <div><strong>ADX 25-40:</strong> Moderate Trend</div>
            <div><strong>ADX &lt; 25:</strong> Weak/No Trend</div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <strong>+DI &gt; -DI:</strong> Bullish momentum | <strong>-DI &gt; +DI:</strong> Bearish momentum
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
