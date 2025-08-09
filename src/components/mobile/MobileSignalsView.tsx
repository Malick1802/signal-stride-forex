import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';
import { MobileSignalCard } from '../MobileSignalCard';
import { PullToRefresh } from '../PullToRefresh';
import { Card } from '@/components/ui/card';

export const MobileSignalsView: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { signals, loading, fetchSignals } = useTradingSignals();
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      await fetchSignals();
      toast({
        title: "Signals Updated",
        description: "Latest trading signals have been loaded",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to fetch latest signals",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRefresh = async () => {
    await handleRefresh();
  };

  const activeSignals = signals?.filter(s => s.status === 'active') || [];
  const totalPnL = 0; // Will be calculated from actual outcome data
  const successRate = '0'; // Will be calculated from actual outcome data

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 pt-4">
          <Card className="p-3 bg-slate-800/50 border-slate-700">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Active</div>
              <div className="text-lg font-bold text-white">{activeSignals.length}</div>
            </div>
          </Card>
          <Card className="p-3 bg-slate-800/50 border-slate-700">
            <div className="text-center">
              <DollarSign className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Total PnL</div>
              <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL > 0 ? '+' : ''}{totalPnL}
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-slate-800/50 border-slate-700">
            <div className="text-center">
              <Clock className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Success</div>
              <div className="text-lg font-bold text-white">{successRate}%</div>
            </div>
          </Card>
        </div>

        {/* Signals List */}
        <div className="space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          )}

          {!loading && activeSignals.length === 0 && (
            <Card className="p-8 text-center bg-slate-800/30 border-slate-700">
              <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Active Signals</h3>
              <p className="text-gray-400 mb-4">
                Refresh to check for new trading opportunities
              </p>
              <Button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Signals
              </Button>
            </Card>
          )}

          {activeSignals.map((signal) => (
            <MobileSignalCard
              key={signal.id}
              signal={{
                id: signal.id,
                currency_pair: signal.pair || 'EUR/USD',
                signal_type: signal.type.toLowerCase() === 'buy' ? 'buy' : 'sell',
                entry_price: parseFloat(signal.entryPrice) || 0,
                target_price: parseFloat(signal.takeProfit1) || 0,
                stop_loss_price: parseFloat(signal.stopLoss) || 0,
                status: signal.status as 'active' | 'completed' | 'expired',
                confidence: signal.confidence || 75,
                created_at: signal.timestamp || new Date().toISOString(),
              }}
              priceData={(signal.chartData || []).map(d => ({
                timestamp: d.time,
                time: new Date(d.time).toLocaleTimeString(),
                price: d.price
              }))}
              currentPrice={parseFloat(signal.entryPrice) || 0}
              isLoading={false}
            />
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
};