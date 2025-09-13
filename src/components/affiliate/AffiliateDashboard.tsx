import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, Copy, ExternalLink, Download, ArrowLeft, Home } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useMLMNetwork } from '@/hooks/useMLMNetwork';
import { AffiliateRegistration } from './AffiliateRegistration';
import { ReferralLinksManager } from './ReferralLinksManager';
import { CommissionHistory } from './CommissionHistory';
import { ReferralNetworkTree } from './ReferralNetworkTree';
import { PayoutManager } from './PayoutManager';
import { useToast } from '@/hooks/use-toast';

interface AffiliateDashboardProps {
  onNavigate?: (view: string) => void;
}

export const AffiliateDashboard = ({ onNavigate }: AffiliateDashboardProps) => {
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

  const handleBackToDashboard = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Mobile-First Navigation Header */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-emerald-400" />
              <span className="text-lg font-bold text-white">Partner Program</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="text-gray-400 hover:text-white"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Mobile-Optimized Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Partner Dashboard</h1>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-gray-400 text-sm">Code:</span>
                <code className="bg-gray-800 text-emerald-400 px-2 py-1 rounded font-mono text-sm">
                  {affiliateData.affiliate_code}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyAffiliateCode}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <Badge 
                  variant={affiliateData.status === 'active' ? 'default' : 'secondary'}
                  className={affiliateData.status === 'active' ? 'bg-emerald-500' : ''}
                >
                  {affiliateData.status}
                </Badge>
                <Badge variant="outline" className="border-gold text-gold">
                  {affiliateData.tier} Partner
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile-First Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
            <Card className="bg-black/20 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">${affiliateData.total_earnings.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">${thisMonthEarnings.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Pending</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">${pendingEarnings.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Referrals</CardTitle>
                <Users className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{affiliateData.total_referrals}</div>
                <p className="text-xs text-gray-400 mt-1">
                  Network: {stats.totalDownline}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile-Optimized Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-black/20 border-white/10 grid grid-cols-2 sm:grid-cols-5 w-full">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="referrals" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">Links</TabsTrigger>
              <TabsTrigger value="commissions" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">Earnings</TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">Network</TabsTrigger>
              <TabsTrigger value="payouts" className="data-[state=active]:bg-emerald-500 text-xs sm:text-sm">Payouts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Commission Rates</CardTitle>
                    <CardDescription className="text-gray-400">
                      Your referral commission structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Direct Referrals</span>
                      <span className="text-white font-bold">{(affiliateData.commission_rate_l1 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Sub-Partners</span>
                      <span className="text-white font-bold">{(affiliateData.commission_rate_l2 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Extended Network</span>
                      <span className="text-white font-bold">{(affiliateData.commission_rate_l3 * 100).toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Network Overview</CardTitle>
                    <CardDescription className="text-gray-400">
                      Your partner network breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Direct Partners</span>
                      <span className="text-white font-bold">{stats.level1Count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Sub-Partners</span>
                      <span className="text-white font-bold">{stats.level2Count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Extended Network</span>
                      <span className="text-white font-bold">{stats.level3Count}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Network Earnings</span>
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
              <ReferralNetworkTree />
            </TabsContent>

            <TabsContent value="payouts">
              <PayoutManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
