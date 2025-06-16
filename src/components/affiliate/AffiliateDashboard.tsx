
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, Copy, ExternalLink, Download } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useMLMNetwork } from '@/hooks/useMLMNetwork';
import { AffiliateRegistration } from './AffiliateRegistration';
import { ReferralLinksManager } from './ReferralLinksManager';
import { CommissionHistory } from './CommissionHistory';
import { MLMNetworkTree } from './MLMNetworkTree';
import { PayoutManager } from './PayoutManager';
import { useToast } from '@/hooks/use-toast';

export const AffiliateDashboard = () => {
  const { affiliateData, commissions, loading } = useAffiliate();
  const { network, stats } = useMLMNetwork(affiliateData?.id);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!affiliateData) {
    return <AffiliateRegistration />;
  }

  const copyAffiliateCode = () => {
    navigator.clipboard.writeText(affiliateData.affiliate_code);
    toast({
      title: "Copied!",
      description: "Affiliate code copied to clipboard.",
    });
  };

  const pendingEarnings = commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const thisMonthEarnings = commissions
    .filter(c => {
      const commissionDate = new Date(c.created_at);
      const now = new Date();
      return commissionDate.getMonth() === now.getMonth() && 
             commissionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Affiliate Dashboard</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Code:</span>
                  <code className="bg-gray-800 text-emerald-400 px-3 py-1 rounded font-mono">
                    {affiliateData.affiliate_code}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyAffiliateCode}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Badge 
                  variant={affiliateData.status === 'active' ? 'default' : 'secondary'}
                  className={affiliateData.status === 'active' ? 'bg-emerald-500' : ''}
                >
                  {affiliateData.status}
                </Badge>
                <Badge variant="outline" className="border-gold text-gold">
                  {affiliateData.tier}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-black/20 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${affiliateData.total_earnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${thisMonthEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pending Payout</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${pendingEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{affiliateData.total_referrals}</div>
              <p className="text-xs text-gray-400 mt-1">
                Network: {stats.totalDownline} members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/20 border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500">Overview</TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-emerald-500">Referral Links</TabsTrigger>
            <TabsTrigger value="commissions" className="data-[state=active]:bg-emerald-500">Commissions</TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-emerald-500">MLM Network</TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-emerald-500">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Commission Rates</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your current MLM commission structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 1 (Direct)</span>
                    <span className="text-white font-bold">{(affiliateData.commission_rate_l1 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 2</span>
                    <span className="text-white font-bold">{(affiliateData.commission_rate_l2 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 3</span>
                    <span className="text-white font-bold">{(affiliateData.commission_rate_l3 * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Network Stats</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your MLM downline breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 1 Members</span>
                    <span className="text-white font-bold">{stats.level1Count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 2 Members</span>
                    <span className="text-white font-bold">{stats.level2Count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Level 3 Members</span>
                    <span className="text-white font-bold">{stats.level3Count}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Network Earnings</span>
                      <span className="text-emerald-400 font-bold">${stats.totalDownlineEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralLinksManager />
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionHistory />
          </TabsContent>

          <TabsContent value="network">
            <MLMNetworkTree />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
