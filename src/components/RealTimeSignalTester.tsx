import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { realTimeManager } from '@/hooks/useRealTimeManager';
import Logger from '@/utils/logger';

interface RealTimeEvent {
  type: string;
  data: any;
  timestamp: number;
}

export const RealTimeSignalTester = () => {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to real-time events
    const unsubscribe = realTimeManager.subscribe('tester', (event) => {
      console.log('🔔 Real-time event received:', event);
      setEvents(prev => [event, ...prev].slice(0, 10)); // Keep last 10 events
    });

    // Subscribe to connection state
    const unsubscribeState = realTimeManager.onStateChange((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
      unsubscribeState();
    };
  }, []);

  const generateTestSignal = async () => {
    if (testing) return;
    
    setTesting(true);
    try {
      Logger.info('test', 'Generating test signal...');
      
      const { data, error } = await supabase.functions.invoke('generate-test-signals', {
        body: { 
          count: 1,
          immediate: true 
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Test Signal Generated",
        description: "Check the dashboard for the new signal",
      });

      Logger.info('test', 'Test signal generated:', data);
    } catch (error) {
      Logger.error('test', 'Error generating test signal:', error);
      toast({
        title: "❌ Test Failed",
        description: "Failed to generate test signal",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestPushNotification = async () => {
    try {
      Logger.info('test', 'Sending test push notification...');
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: "🧪 Test Notification",
          body: "Real-time push notification test",
          data: { test: true },
          notificationType: 'signal'
        }
      });

      if (error) throw error;

      toast({
        title: "📱 Test Notification Sent",
        description: `Sent to ${data?.sent || 0} devices`,
      });

      Logger.info('test', 'Test notification sent:', data);
    } catch (error) {
      Logger.error('test', 'Error sending test notification:', error);
      toast({
        title: "❌ Notification Failed",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-Time Testing
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={generateTestSignal} disabled={testing}>
            {testing ? "Generating..." : "Generate Test Signal"}
          </Button>
          <Button variant="outline" onClick={sendTestPushNotification}>
            Send Test Push
          </Button>
          <Button variant="outline" onClick={clearEvents}>
            Clear Events
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Recent Real-Time Events</h4>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events received yet</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded border">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {event.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-hidden">
                    {JSON.stringify(event.data, null, 2).slice(0, 200)}
                    {JSON.stringify(event.data, null, 2).length > 200 && '...'}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};