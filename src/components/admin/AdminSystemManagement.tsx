
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, Server, Shield } from 'lucide-react';

export const AdminSystemManagement = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">2.4GB</div>
                <div className="text-sm text-gray-400">DB Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">45ms</div>
                <div className="text-sm text-gray-400">Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-sm text-gray-400">Security Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">System Health</CardTitle>
          <CardDescription className="text-gray-400">
            Monitor platform performance and security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-400">System management interface coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
