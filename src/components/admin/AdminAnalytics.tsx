
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, LineChart, TrendingUp } from 'lucide-react';

export const AdminAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">1,247</div>
                <div className="text-sm text-gray-400">Page Views</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">342</div>
                <div className="text-sm text-gray-400">Unique Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <LineChart className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">12.5%</div>
                <div className="text-sm text-gray-400">Conversion</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">4m 32s</div>
                <div className="text-sm text-gray-400">Avg Session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Analytics Dashboard</CardTitle>
          <CardDescription className="text-gray-400">
            Business intelligence and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-400">Advanced analytics interface coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
