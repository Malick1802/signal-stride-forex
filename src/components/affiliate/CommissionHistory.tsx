
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';

export const CommissionHistory = () => {
  const { commissions } = useAffiliate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500';
      case 'approved':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCommissionTypeLabel = (type: string) => {
    switch (type) {
      case 'signup_bonus':
        return 'Signup Bonus';
      case 'recurring_monthly':
        return 'Monthly Subscription';
      case 'recurring_annual':
        return 'Annual Subscription';
      default:
        return type;
    }
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Users className="h-4 w-4 text-emerald-400" />;
      case 2:
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 3:
        return <DollarSign className="h-4 w-4 text-purple-400" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-400" />;
    }
  };

  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
  const paidEarnings = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const pendingEarnings = commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">{commissions.length} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Paid Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${paidEarnings.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">
              {commissions.filter(c => c.status === 'paid').length} payments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            <Users className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">
              {commissions.filter(c => c.status === 'approved').length} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission History */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Commission History</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed breakdown of all your commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No commissions yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Start referring users to earn your first commission
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-4">
                    {getLevelIcon(commission.level)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-medium">{getCommissionTypeLabel(commission.commission_type)}</h4>
                        <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                          Level {commission.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(commission.created_at).toLocaleDateString()} • 
                        ID: {commission.referral_user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-white font-bold">${commission.amount.toFixed(2)}</div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(commission.status)} text-white border-0`}
                      >
                        {commission.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
