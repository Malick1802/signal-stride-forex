
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Join Our Affiliate Program</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Earn commissions by referring new users to ForexAlert Pro. Our 3-level MLM structure 
            rewards you for building a network of successful traders.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader>
              <DollarSign className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <CardTitle className="text-white">30% Direct Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Earn 30% commission on every direct referral's subscription
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <CardTitle className="text-white">Multi-Level Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                10% on level 2 and 5% on level 3 referrals for passive income
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 border-white/10 text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <CardTitle className="text-white">Build Your Network</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Grow your affiliate network and increase your earning potential
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Structure */}
        <Card className="bg-black/20 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Commission Structure</CardTitle>
            <CardDescription className="text-gray-400">
              Our 3-level MLM system rewards you for building a network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div>
                  <h4 className="text-white font-semibold">Level 1 - Direct Referrals</h4>
                  <p className="text-gray-400 text-sm">Users you directly refer</p>
                </div>
                <div className="text-2xl font-bold text-emerald-400">30%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div>
                  <h4 className="text-white font-semibold">Level 2 - Sub-Affiliates</h4>
                  <p className="text-gray-400 text-sm">Users referred by your direct referrals</p>
                </div>
                <div className="text-2xl font-bold text-blue-400">10%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div>
                  <h4 className="text-white font-semibold">Level 3 - Extended Network</h4>
                  <p className="text-gray-400 text-sm">Users referred by level 2 affiliates</p>
                </div>
                <div className="text-2xl font-bold text-purple-400">5%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className="bg-black/20 border-white/10 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Register as Affiliate</CardTitle>
            <CardDescription className="text-gray-400">
              Start earning commissions today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="parentCode" className="text-gray-400">
                  Referral Code (Optional)
                </Label>
                <Input
                  id="parentCode"
                  type="text"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                  placeholder="Enter affiliate code"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If you were referred by someone, enter their affiliate code
                </p>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Your application will be reviewed and approved within 24 hours. 
                  You'll receive an email notification once approved.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                disabled={registering}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {registering ? 'Registering...' : 'Register as Affiliate'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
