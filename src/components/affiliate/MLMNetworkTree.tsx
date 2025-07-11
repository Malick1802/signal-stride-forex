
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useMLMNetwork } from '@/hooks/useMLMNetwork';

export const MLMNetworkTree = () => {
  const { affiliateData } = useAffiliate();
  const { network, stats, loading } = useMLMNetwork(affiliateData?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-500';
      case 'gold':
        return 'bg-yellow-500';
      case 'silver':
        return 'bg-gray-400';
      default:
        return 'bg-orange-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderNetworkMember = (member: any, level: number) => (
    <div key={member.id} className={`ml-${level * 8} mb-4`}>
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
              {member.affiliate_code.slice(0, 2)}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-white font-medium">{member.user.full_name || member.user.email}</h4>
              <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                L{level}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs ${getStatusColor(member.status)} text-white border-0`}
              >
                {member.status}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs ${getTierColor(member.tier)} text-white border-0`}
              >
                {member.tier}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
              <span>Code: {member.affiliate_code}</span>
              <span>•</span>
              <span>{member.total_referrals} referrals</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-white font-bold">${member.total_earnings.toFixed(2)}</div>
          <div className="text-xs text-gray-400">Total Earnings</div>
        </div>
      </div>
      
      {member.children && member.children.length > 0 && (
        <div className="mt-2">
          {member.children.map((child: any) => renderNetworkMember(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Network</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalDownline}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Level 1</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.level1Count}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Level 2</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.level2Count}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Level 3</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.level3Count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Network Tree */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Your MLM Network</CardTitle>
          <CardDescription className="text-gray-400">
            Visual representation of your affiliate network hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {network.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No downline members yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Share your referral link to start building your network
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {network.map((member) => renderNetworkMember(member, 1))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
