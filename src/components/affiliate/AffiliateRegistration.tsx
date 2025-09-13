
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, DollarSign, TrendingUp, Info } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';

export const AffiliateRegistration = () => {
  const { registerAffiliate, registering } = useAffiliate();
  const [parentCode, setParentCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registerAffiliate(parentCode || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Join Our Partner Program</h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Earn generous commissions by referring new users to ForexAlert Pro. Our multi-tier 
            partner system rewards you for building a successful referral network.
          </p>
        </div>

        {/* Mobile-Optimized Benefits Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader className="pb-3">
              <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-400 mx-auto mb-3" />
              <CardTitle className="text-white text-lg sm:text-xl">30% Direct Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm sm:text-base">
                Earn 30% commission on every direct referral's subscription
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader className="pb-3">
              <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400 mx-auto mb-3" />
              <CardTitle className="text-white text-lg sm:text-xl">Multi-Tier Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm sm:text-base">
                10% on sub-partners and 5% on extended network for passive income
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader className="pb-3">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-purple-400 mx-auto mb-3" />
              <CardTitle className="text-white text-lg sm:text-xl">Build Your Network</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm sm:text-base">
                Grow your partner network and increase your earning potential
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Optimized Commission Structure */}
        <Card className="bg-black/20 border-white/10 mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-white">Commission Structure</CardTitle>
            <CardDescription className="text-gray-400">
              Our 3-tier partner system rewards you for building a network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="mb-2 sm:mb-0">
                  <h4 className="text-white font-semibold">Tier 1 - Direct Referrals</h4>
                  <p className="text-gray-400 text-sm">Users you directly refer</p>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">30%</div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="mb-2 sm:mb-0">
                  <h4 className="text-white font-semibold">Tier 2 - Sub-Partners</h4>
                  <p className="text-gray-400 text-sm">Users referred by your direct referrals</p>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-400">10%</div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="mb-2 sm:mb-0">
                  <h4 className="text-white font-semibold">Tier 3 - Extended Network</h4>
                  <p className="text-gray-400 text-sm">Users referred by tier 2 partners</p>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-400">5%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-Optimized Registration Form */}
        <Card className="bg-black/20 border-white/10 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Register as Partner</CardTitle>
            <CardDescription className="text-gray-400">
              Start earning commissions today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="parentCode" className="text-gray-400">
                  Referral Code (Optional)
                </Label>
                <Input
                  id="parentCode"
                  type="text"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                  placeholder="Enter partner code"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If you were referred by someone, enter their partner code
                </p>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200 text-sm">
                  Your application will be reviewed and approved within 24 hours. 
                  You'll receive an email notification once approved.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                disabled={registering}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {registering ? 'Registering...' : 'Register as Partner'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
