import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReadinessCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'checking';
  message: string;
  required: boolean;
}

export function SystemReadinessCheck() {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[]>([
    { name: 'Historical Data (1D)', status: 'checking', message: 'Checking...', required: true },
    { name: 'Historical Data (W)', status: 'checking', message: 'Checking...', required: true },
    { name: '4H Candles', status: 'checking', message: 'Checking...', required: true },
    { name: 'Live Price Stream', status: 'checking', message: 'Checking...', required: true },
    { name: 'Market Data Quality', status: 'checking', message: 'Checking...', required: false },
  ]);

  const runChecks = async () => {
    setChecking(true);
    const newChecks: ReadinessCheck[] = [];

    try {
      // Check 1: Daily data
      const { count: dailyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', '1D');

      if (dailyCount && dailyCount > 3000) {
        newChecks.push({
          name: 'Historical Data (1D)',
          status: 'pass',
          message: `${dailyCount.toLocaleString()} daily candles available`,
          required: true
        });
      } else if (dailyCount && dailyCount > 1000) {
        newChecks.push({
          name: 'Historical Data (1D)',
          status: 'warning',
          message: `${dailyCount.toLocaleString()} daily candles (recommend 3000+)`,
          required: true
        });
      } else {
        newChecks.push({
          name: 'Historical Data (1D)',
          status: 'fail',
          message: `Only ${dailyCount || 0} daily candles (need 3000+)`,
          required: true
        });
      }

      // Check 2: Weekly data
      const { count: weeklyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', 'W');

      if (weeklyCount && weeklyCount > 1000) {
        newChecks.push({
          name: 'Historical Data (W)',
          status: 'pass',
          message: `${weeklyCount.toLocaleString()} weekly candles available`,
          required: true
        });
      } else if (weeklyCount && weeklyCount > 500) {
        newChecks.push({
          name: 'Historical Data (W)',
          status: 'warning',
          message: `${weeklyCount.toLocaleString()} weekly candles (recommend 1000+)`,
          required: true
        });
      } else {
        newChecks.push({
          name: 'Historical Data (W)',
          status: 'fail',
          message: `Only ${weeklyCount || 0} weekly candles (need 1000+)`,
          required: true
        });
      }

      // Check 3: 4H candles
      const { count: fourHourCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', '4H');

      if (fourHourCount && fourHourCount > 2000) {
        newChecks.push({
          name: '4H Candles',
          status: 'pass',
          message: `${fourHourCount.toLocaleString()} 4H candles available`,
          required: true
        });
      } else if (fourHourCount && fourHourCount > 500) {
        newChecks.push({
          name: '4H Candles',
          status: 'warning',
          message: `${fourHourCount.toLocaleString()} 4H candles (recommend 2000+)`,
          required: true
        });
      } else {
        newChecks.push({
          name: '4H Candles',
          status: 'fail',
          message: `Only ${fourHourCount || 0} 4H candles (need 2000+)`,
          required: true
        });
      }

      // Check 4: Live price stream
      const { data: recentPrices, error: priceError } = await supabase
        .from('centralized_market_state')
        .select('symbol, last_update, is_market_open')
        .gte('last_update', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (priceError) throw priceError;

      if (recentPrices && recentPrices.length > 20) {
        newChecks.push({
          name: 'Live Price Stream',
          status: 'pass',
          message: `${recentPrices.length} pairs streaming live prices`,
          required: true
        });
      } else if (recentPrices && recentPrices.length > 10) {
        newChecks.push({
          name: 'Live Price Stream',
          status: 'warning',
          message: `${recentPrices.length} pairs streaming (expected 27)`,
          required: true
        });
      } else {
        newChecks.push({
          name: 'Live Price Stream',
          status: 'fail',
          message: `Only ${recentPrices?.length || 0} pairs streaming (need 27)`,
          required: true
        });
      }

      // Check 5: Market data quality
      const { data: dataQuality } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price, bid, ask, fastforex_timestamp')
        .not('fastforex_timestamp', 'is', null)
        .limit(27);

      const recentData = dataQuality?.filter(d => {
        const timestamp = new Date(d.fastforex_timestamp!);
        return Date.now() - timestamp.getTime() < 2 * 60 * 1000; // Within 2 minutes
      });

      if (recentData && recentData.length > 20) {
        newChecks.push({
          name: 'Market Data Quality',
          status: 'pass',
          message: `${recentData.length}/27 pairs with fresh data (<2 min old)`,
          required: false
        });
      } else if (recentData && recentData.length > 10) {
        newChecks.push({
          name: 'Market Data Quality',
          status: 'warning',
          message: `${recentData.length}/27 pairs with fresh data`,
          required: false
        });
      } else {
        newChecks.push({
          name: 'Market Data Quality',
          status: 'warning',
          message: `${recentData?.length || 0}/27 pairs with fresh data`,
          required: false
        });
      }

      setChecks(newChecks);

      // Overall status
      const allRequiredPass = newChecks.filter(c => c.required).every(c => c.status === 'pass');
      if (allRequiredPass) {
        toast({
          title: "System Ready ✅",
          description: "All required checks passed. Signal generation is ready.",
        });
      } else {
        toast({
          title: "System Not Ready",
          description: "Some required checks failed. See details below.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Error running checks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getStatusIcon = (status: ReadinessCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: ReadinessCheck['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-600">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking</Badge>;
    }
  };

  const allRequiredPass = checks.filter(c => c.required).every(c => c.status === 'pass');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Readiness Check</CardTitle>
            <CardDescription>
              Verify all components are ready for signal generation
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runChecks}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className={`p-4 rounded-lg border-2 ${
          allRequiredPass 
            ? 'bg-green-500/10 border-green-500' 
            : 'bg-red-500/10 border-red-500'
        }`}>
          <div className="flex items-center gap-3">
            {allRequiredPass ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-semibold text-green-500">System Ready</p>
                  <p className="text-sm text-muted-foreground">All required checks passed</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-500">System Not Ready</p>
                  <p className="text-sm text-muted-foreground">Please resolve issues below</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Individual Checks */}
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 border rounded-lg"
            >
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{check.name}</p>
                    {check.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                </div>
              </div>
              {getStatusBadge(check.status)}
            </div>
          ))}
        </div>

        {/* Next Steps */}
        {!allRequiredPass && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Next Steps:</p>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
              <li>Use "Data Population & System Activation" panel to populate missing data</li>
              <li>Wait for centralized-market-stream to collect live prices (runs every 60s)</li>
              <li>Re-run this check to verify all systems are ready</li>
              <li>Test signal generation from the "Signal Generation Testing" page</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
