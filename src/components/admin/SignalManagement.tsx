
import React from 'react';
import { Activity, TrendingUp, Target, Clock } from 'lucide-react';
import { useSignalManagement } from '@/hooks/useSignalManagement';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const SignalManagement = () => {
  const { signalStats, statsLoading, recentSignals, signalsLoading } = useSignalManagement();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-gray-400 border-gray-500">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: any) => {
    if (!outcome || outcome.length === 0) {
      return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
    
    const result = outcome[0];
    if (result.hit_target) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
    }
  };

  if (statsLoading || signalsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Signals</p>
              <p className="text-2xl font-bold text-white">{signalStats?.totalSignals || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Signals</p>
              <p className="text-2xl font-bold text-white">{signalStats?.activeSignals || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-white">{signalStats?.successRate || 0}%</p>
            </div>
            <Target className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Expired Signals</p>
              <p className="text-2xl font-bold text-white">{signalStats?.expiredSignals || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Recent Signals Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Recent Signals</h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-300">Symbol</TableHead>
                <TableHead className="text-gray-300">Type</TableHead>
                <TableHead className="text-gray-300">Price</TableHead>
                <TableHead className="text-gray-300">Confidence</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Outcome</TableHead>
                <TableHead className="text-gray-300">P&L (Pips)</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSignals?.map((signal) => (
                <TableRow key={signal.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{signal.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={signal.type === 'BUY' ? "default" : "destructive"}>
                      {signal.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">{signal.price}</TableCell>
                  <TableCell className="text-gray-300">{signal.confidence}%</TableCell>
                  <TableCell>{getStatusBadge(signal.status)}</TableCell>
                  <TableCell>{getOutcomeBadge(signal.signal_outcomes)}</TableCell>
                  <TableCell className="text-gray-300">
                    {signal.signal_outcomes && signal.signal_outcomes.length > 0 
                      ? signal.signal_outcomes[0].pnl_pips || 'N/A'
                      : 'Pending'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(signal.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {recentSignals?.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No signals found.
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalManagement;
