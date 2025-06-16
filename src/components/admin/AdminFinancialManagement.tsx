
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CreditCard, RefreshCw } from 'lucide-react';

export const AdminFinancialManagement = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">$24,750</div>
                <div className="text-sm text-gray-400">Monthly Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">+18%</div>
                <div className="text-sm text-gray-400">Growth Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">156</div>
                <div className="text-sm text-gray-400">Active Subs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">92%</div>
                <div className="text-sm text-gray-400">Retention</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Financial Overview</CardTitle>
          <CardDescription className="text-gray-400">
            Revenue tracking and subscription analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-400">Financial management interface coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
