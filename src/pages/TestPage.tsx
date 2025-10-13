
import React from 'react';
import TestSignalGeneration from '@/components/TestSignalGeneration';
import { PushNotificationDebugger } from '@/components/PushNotificationDebugger';
import { StrategyPerformanceMonitor } from '@/components/StrategyPerformanceMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Signal Generation Testing & Monitoring
          </h1>
          <p className="text-gray-300 text-lg">
            Dual-Strategy System (Trend Continuation + H&S Reversal)
          </p>
        </div>
        
        <Tabs defaultValue="testing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="testing">Signal Testing</TabsTrigger>
            <TabsTrigger value="performance">Strategy Performance</TabsTrigger>
            <TabsTrigger value="notifications">Push Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="testing" className="space-y-6">
            <TestSignalGeneration />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <StrategyPerformanceMonitor />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="flex justify-center">
              <PushNotificationDebugger />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestPage;
