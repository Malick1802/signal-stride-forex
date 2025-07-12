
import React from 'react';
import { Smartphone, Download, Settings, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Capacitor } from '@capacitor/core';

const MobileSetupGuide = () => {
  if (!Capacitor.isNativePlatform()) {
    return (
      <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Smartphone className="h-6 w-6 text-emerald-400" />
            <CardTitle className="text-white">Mobile App Setup Complete</CardTitle>
          </div>
          <CardDescription className="text-gray-300">
            Your ForexSignal Pro mobile app is now ready for native deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center space-x-3">
              <Badge className="bg-emerald-500/20 text-emerald-400">✓</Badge>
              <span className="text-gray-300">Android configuration created</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-emerald-500/20 text-emerald-400">✓</Badge>
              <span className="text-gray-300">App icon and splash screen configured</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-emerald-500/20 text-emerald-400">✓</Badge>
              <span className="text-gray-300">Native permissions setup</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-emerald-500/20 text-emerald-400">✓</Badge>
              <span className="text-gray-300">Mobile-optimized UI components</span>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Next Steps for Mobile Deployment:
            </h4>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Export project to GitHub</li>
              <li>Run <code className="bg-slate-700 px-1 rounded">npm install</code></li>
              <li>Run <code className="bg-slate-700 px-1 rounded">npx cap add android</code></li>
              <li>Run <code className="bg-slate-700 px-1 rounded">npm run build</code></li>
              <li>Run <code className="bg-slate-700 px-1 rounded">npx cap sync</code></li>
              <li>Run <code className="bg-slate-700 px-1 rounded">npx cap run android</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Play className="h-6 w-6 text-emerald-400" />
          <CardTitle className="text-white">Mobile App Active</CardTitle>
        </div>
        <CardDescription className="text-gray-300">
          ForexSignal Pro is running as a native mobile app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-gray-400" />
            <span className="text-gray-300">Platform: {Capacitor.getPlatform()}</span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400">Native</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileSetupGuide;
