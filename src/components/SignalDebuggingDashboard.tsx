
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSignalOutcomeTracker } from '@/hooks/useSignalOutcomeTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SignalDebugInfo {
  id: string;
  symbol: string;
  type: string;
  status: string;
  created_at: string;
  price: number;
  stop_loss: number;
  current_price?: number;
  has_outcome: boolean;
  outcome_notes?: string;
  time_since_creation: string;
}

const SignalDebuggingDashboard = () => {
  const [debugInfo, setDebugInfo] = useState<SignalDebugInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    withOutcomes: 0,
    withoutOutcomes: 0,
    stopLossHits: 0,
    targetHits: 0,
    unknownExits: 0
  });

  const { investigateExpiredSignalsWithoutOutcomes } = useSignalOutcomeTracker();

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      console.log('🔍 DEBUGGING: Fetching signal debug information...');

      // Get all expired signals with their outcome information
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          status,
          created_at,
          price,
          stop_loss,
          signal_outcomes (
            id,
            notes,
            exit_price,
            pnl_pips
          )
        `)
        .eq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ DEBUG ERROR:', error);
        return;
      }

      // Get current market prices
      const symbols = [...new Set(signals?.map(s => s.symbol) || [])];
      const { data: marketData } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        priceMap[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Process debug information
      const debugData: SignalDebugInfo[] = signals?.map(signal => {
        const hasOutcome = signal.signal_outcomes && signal.signal_outcomes.length > 0;
        const outcome = hasOutcome ? signal.signal_outcomes[0] : null;
        
        const createdAt = new Date(signal.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        return {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type,
          status: signal.status,
          created_at: signal.created_at,
          price: parseFloat(signal.price.toString()),
          stop_loss: parseFloat(signal.stop_loss.toString()),
          current_price: priceMap[signal.symbol],
          has_outcome: hasOutcome,
          outcome_notes: outcome?.notes || 'No outcome record',
          time_since_creation: `${hours}h ${minutes}m ago`
        };
      }) || [];

      setDebugInfo(debugData);

      // Calculate stats
      const total = debugData.length;
      const withOutcomes = debugData.filter(s => s.has_outcome).length;
      const withoutOutcomes = total - withOutcomes;
      const stopLossHits = debugData.filter(s => s.outcome_notes?.includes('Stop Loss')).length;
      const targetHits = debugData.filter(s => s.outcome_notes?.includes('Take Profit')).length;
      const unknownExits = debugData.filter(s => s.outcome_notes?.includes('Unknown') || !s.has_outcome).length;

      setStats({
        total,
        withOutcomes,
        withoutOutcomes,
        stopLossHits,
        targetHits,
        unknownExits
      });

      console.log('✅ DEBUG INFO LOADED:', {
        total,
        withOutcomes,
        withoutOutcomes,
        stopLossHits,
        targetHits,
        unknownExits
      });

    } catch (error) {
      console.error('❌ DEBUG FETCH ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairMissingOutcomes = async () => {
    setLoading(true);
    try {
      await investigateExpiredSignalsWithoutOutcomes();
      await fetchDebugInfo(); // Refresh data after repair
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">With Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withOutcomes}</div>
            <div className="text-xs text-gray-500">
              {stats.total > 0 ? Math.round((stats.withOutcomes / stats.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Missing Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.withoutOutcomes}</div>
            <div className="text-xs text-gray-500">
              {stats.total > 0 ? Math.round((stats.withoutOutcomes / stats.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stop Loss Hits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.stopLossHits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Target Hits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.targetHits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unknown Exits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unknownExits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex space-x-4">
        <Button
          onClick={fetchDebugInfo}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Refresh Debug Info
            </>
          )}
        </Button>

        <Button
          onClick={handleRepairMissingOutcomes}
          disabled={loading || stats.withoutOutcomes === 0}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Repairing...
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Repair Missing Outcomes ({stats.withoutOutcomes})
            </>
          )}
        </Button>
      </div>

      {/* Signal List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expired Signals Debug Info</CardTitle>
          <CardDescription>
            Detailed information about signal expiration and outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {debugInfo.map(signal => (
              <div
                key={signal.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <div className="font-medium">{signal.symbol}</div>
                    <div className="text-sm text-gray-500">{signal.time_since_creation}</div>
                  </div>
                  
                  <Badge variant={signal.type === 'BUY' ? 'default' : 'secondary'}>
                    {signal.type}
                  </Badge>

                  <div className="text-sm">
                    <div>Entry: {signal.price.toFixed(5)}</div>
                    <div>SL: {signal.stop_loss.toFixed(5)}</div>
                    {signal.current_price && (
                      <div>Current: {signal.current_price.toFixed(5)}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {signal.has_outcome ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <div className="text-sm">
                      <div className={signal.has_outcome ? 'text-green-600' : 'text-red-600'}>
                        {signal.has_outcome ? 'Has Outcome' : 'Missing Outcome'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {signal.outcome_notes}
                      </div>
                    </div>
                  </div>

                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalDebuggingDashboard;
