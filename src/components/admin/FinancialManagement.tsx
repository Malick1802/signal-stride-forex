import React from 'react';
import { DollarSign, TrendingUp, CreditCard, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { formatCurrency, formatTimeAgo, formatDate } from '@/utils/formatting';
import { Skeleton } from '@/components/ui/skeleton';

export const FinancialManagement: React.FC = () => {
  const { 
    financialStats, 
    recentTransactions, 
    recentCommissions,
    statsLoading, 
    transactionsLoading,
    commissionsLoading 
  } = useFinancialOverview();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'subscription':
      case 'payment':
        return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
      case 'refund':
      case 'payout':
        return <ArrowDownRight className="h-4 w-4 text-red-400" />;
      default:
        return <CreditCard className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
      case 'failed':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(financialStats?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  All time
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(financialStats?.monthlyRevenue || 0)}
                </div>
                <p className="text-xs text-blue-400">
                  Current month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Payouts</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(financialStats?.pendingPayouts || 0)}
                </div>
                <p className="text-xs text-yellow-400">
                  {financialStats?.pendingPayoutCount || 0} requests
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {financialStats?.activeSubscribers || 0}
                </div>
                <p className="text-xs text-purple-400">
                  Paying customers
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <CardDescription className="text-gray-400">
              Latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded bg-white/10" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1 bg-white/10" />
                      <Skeleton className="h-3 w-24 bg-white/10" />
                    </div>
                    <Skeleton className="h-4 w-16 bg-white/10" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions?.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-full">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentTransactions || recentTransactions.length === 0) && (
                  <p className="text-center text-gray-400 py-4">No recent transactions</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Commissions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Commissions</CardTitle>
            <CardDescription className="text-gray-400">
              Latest affiliate payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1 bg-white/10" />
                      <Skeleton className="h-3 w-24 bg-white/10" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1 bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentCommissions?.slice(0, 5).map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        Level {commission.level} Commission
                      </p>
                      <p className="text-xs text-gray-400">
                        {commission.commission_type} • {formatTimeAgo(commission.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(commission.amount)}
                      </p>
                      <Badge className={getStatusColor(commission.status)}>
                        {commission.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentCommissions || recentCommissions.length === 0) && (
                  <p className="text-center text-gray-400 py-4">No recent commissions</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Transactions Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Transactions</CardTitle>
          <CardDescription className="text-gray-400">
            Comprehensive financial transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Type</TableHead>
                <TableHead className="text-gray-300">Description</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    <TableCell><Skeleton className="h-4 w-20 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                  </TableRow>
                ))
              ) : recentTransactions?.map((transaction) => (
                <TableRow key={transaction.id} className="border-white/10">
                  <TableCell className="text-gray-300">
                    {formatDate(transaction.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="text-gray-300 capitalize">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) }
              {(!recentTransactions || recentTransactions.length === 0) && !transactionsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};