
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Edit, Trash, Plus, Filter, Search } from 'lucide-react';
import { useAdminSignals } from '@/hooks/useAdminSignals';

export const AdminSignalManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { signals, loading, stats } = useAdminSignals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const filteredSignals = signals.filter(signal => {
    const matchesSearch = signal.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || signal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Signal stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{stats.totalSignals}</div>
            <div className="text-sm text-gray-400">Total Signals</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.activeSignals}</div>
            <div className="text-sm text-gray-400">Active Signals</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.successRate}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.avgPips}</div>
            <div className="text-sm text-gray-400">Avg Pips</div>
          </CardContent>
        </Card>
      </div>

      {/* Signal management */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Signal Management</CardTitle>
              <CardDescription className="text-gray-400">
                Monitor and manage all trading signals
              </CardDescription>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Signal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search signals by symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/20 border-white/20 text-white"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border border-white/10 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Symbol</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Entry Price</TableHead>
                  <TableHead className="text-gray-400">Targets</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Confidence</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((signal) => (
                  <TableRow key={signal.id} className="border-white/10">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{signal.symbol}</span>
                        {signal.type === 'buy' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={signal.type === 'buy' ? 'default' : 'destructive'}>
                        {signal.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{signal.price}</TableCell>
                    <TableCell className="text-gray-400">
                      {signal.take_profits?.join(', ') || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        signal.status === 'active' ? 'default' :
                        signal.status === 'expired' ? 'destructive' : 'secondary'
                      }>
                        {signal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{signal.confidence}%</TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(signal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost" className="text-blue-400">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
