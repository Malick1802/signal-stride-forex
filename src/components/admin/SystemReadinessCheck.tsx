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
      // Check 1: Daily data (1 year × 250 days/year × 27 pairs = ~6,750)
      const { count: dailyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .in('timeframe', ['D', '1D']);
      
      console.info('[Readiness] Daily candles:', dailyCount);

      const dailyTarget = 250; // Per symbol
      const dailyPass = dailyTarget * 27; // 6,750
      const dailyWarn = 180 * 27; // 4,860

      if (dailyCount && dailyCount >= dailyPass) {
        newChecks.push({
          name: 'Historical Data (1D - 1 Year)',
          status: 'pass',
          message: `${dailyCount.toLocaleString()} candles (target: ${dailyPass.toLocaleString()})`,
          required: true
        });
      } else if (dailyCount && dailyCount >= dailyWarn) {
        newChecks.push({
          name: 'Historical Data (1D - 1 Year)',
          status: 'warning',
          message: `${dailyCount.toLocaleString()} candles (target: ${dailyPass.toLocaleString()}, min: ${dailyWarn.toLocaleString()})`,
          required: true
        });
      } else {
        newChecks.push({
          name: 'Historical Data (1D - 1 Year)',
          status: 'fail',
          message: `Only ${dailyCount || 0} candles (need ${dailyPass.toLocaleString()}). Run Data Population.`,
          required: true
        });
      }

      // Check 2: Weekly data (5 years × 52 weeks × 85% × 27 pairs = ~5,940)
      const { count: weeklyCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', 'W');

      const weeklyTarget = 220; // Per symbol (5 years × 52 × 85%)
      const weeklyPass = weeklyTarget * 27; // 5,940
      const weeklyWarn = 150 * 27; // 4,050

      if (weeklyCount && weeklyCount >= weeklyPass) {
        newChecks.push({
          name: 'Historical Data (W - 5 Years)',
          status: 'pass',
          message: `${weeklyCount.toLocaleString()} candles (target: ${weeklyPass.toLocaleString()})`,
          required: true
        });
      } else if (weeklyCount && weeklyCount >= weeklyWarn) {
        newChecks.push({
          name: 'Historical Data (W - 5 Years)',
          status: 'warning',
          message: `${weeklyCount.toLocaleString()} candles (target: ${weeklyPass.toLocaleString()}, min: ${weeklyWarn.toLocaleString()})`,
          required: true
        });
      } else {
        newChecks.push({
          name: 'Historical Data (W - 5 Years)',
          status: 'fail',
          message: `Only ${weeklyCount || 0} candles (need ${weeklyPass.toLocaleString()}). Run Data Population.`,
          required: true
        });
      }

      // Check 3: 4H candles (6 months × 30 days × 6 candles/day × 27 pairs = ~24,300)
      const { count: fourHourCount } = await supabase
        .from('multi_timeframe_data')
        .select('*', { count: 'exact', head: true })
        .eq('timeframe', '4H');

      const fourHTarget = 900; // Per symbol (6 months × 30 × 5)
      const fourHPass = fourHTarget * 27; // 24,300
      const fourHWarn = 300 * 27; // 8,100

      if (fourHourCount && fourHourCount >= fourHPass) {
        newChecks.push({
          name: '4H Candles (6 Months Synthetic)',
          status: 'pass',
          message: `${fourHourCount.toLocaleString()} candles (target: ${fourHPass.toLocaleString()}). Initially synthetic, replacing with live data.`,
          required: true
        });
      } else if (fourHourCount && fourHourCount >= fourHWarn) {
        newChecks.push({
          name: '4H Candles (6 Months Synthetic)',
          status: 'warning',
          message: `${fourHourCount.toLocaleString()} candles (target: ${fourHPass.toLocaleString()}, min: ${fourHWarn.toLocaleString()})`,
          required: true
        });
      } else {
        newChecks.push({
          name: '4H Candles (6 Months Synthetic)',
          status: 'fail',
          message: `Only ${fourHourCount || 0} candles (need ${fourHPass.toLocaleString()}). Run Data Population.`,
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
