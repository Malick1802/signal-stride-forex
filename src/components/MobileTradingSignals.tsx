import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { useMobileMarketData } from '@/hooks/useMobileMarketData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';

interface TradingSignal {
  id: string;
  symbol: string;
  type: string;
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  status: string;
  created_at: string;
  updated_at: string;
  pips: number;
  targets_hit: number[];
}

interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  timestamp: string;
}

export default function MobileTradingSignals() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Use the mobile market data hook
  const { marketData, isConnected: marketConnected } = useMobileMarketData();

  // Initialize mobile app
  useEffect(() => {
    initializeMobileApp();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMobileApp = async () => {
    try {
      console.log('🚀 Initializing Mobile Trading Signals App...');
      
      // Check network status
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      
      // Listen for network changes
      Network.addListener('networkStatusChange', (status) => {
        console.log('📶 Network status changed:', status);
        setIsOnline(status.connected);
        if (status.connected) {
          // Reconnect when network is back
          setupRealtimeSubscriptions();
        }
      });

      if (Capacitor.isNativePlatform()) {
        // Setup push notifications
        await setupPushNotifications();
      }

      // Load initial data
      await loadInitialData();
      
      // Setup real-time subscriptions
      await setupRealtimeSubscriptions();
      
      setIsLoading(false);
      console.log('✅ Mobile app initialized successfully');
    } catch (error) {
      console.error('❌ Mobile app initialization failed:', error);
      setError('Failed to initialize app. Please try again.');
      setIsLoading(false);
    }
  };

  const setupPushNotifications = async () => {
    try {
      // Request permissions
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        await PushNotifications.register();
        console.log('✅ Push notifications registered');
        
        // Listen for notification events
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Push notification received:', notification);
          
          // Show local notification if app is in foreground
          LocalNotifications.schedule({
            notifications: [{
              title: notification.title || 'Trading Signal',
              body: notification.body || 'New signal update',
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: notification.data
            }]
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('📱 Push notification action:', action);
          // Handle notification tap - could navigate to specific signal
        });
      }
    } catch (error) {
      console.error('⚠️ Push notification setup failed:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      // Load active trading signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (signalsError) throw signalsError;

      setSignals(signalsData || []);
      
      console.log(`📊 Loaded ${signalsData?.length || 0} signals`);
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setError('Failed to load trading signals');
    }
  };

  const setupRealtimeSubscriptions = async () => {
    try {
      // Clean up existing subscriptions
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
      }

      // Subscribe to trading signals changes
      subscriptionRef.current = supabase
        .channel('mobile-trading-signals')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trading_signals'
          },
          (payload) => {
            console.log('📡 Signal update received:', payload);
            handleSignalUpdate(payload);
            
            // Send local notification for new signals
            if (payload.eventType === 'INSERT' && Capacitor.isNativePlatform()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: 'New Trading Signal',
                  body: `${payload.new.symbol} - ${payload.new.type} signal`,
                  id: Date.now(),
                  schedule: { at: new Date(Date.now() + 1000) },
                  sound: undefined,
                  attachments: undefined,
                  actionTypeId: '',
                  extra: {}
                }]
              });
            }
          }
        )
        .subscribe();

      console.log('🔔 Real-time subscriptions established');
    } catch (error) {
      console.error('❌ Failed to setup real-time subscriptions:', error);
    }
  };

  const handleSignalUpdate = (payload: any) => {
    const { eventType, new: newSignal, old: oldSignal } = payload;

    setSignals(prev => {
      switch (eventType) {
        case 'INSERT':
          return [newSignal, ...prev];
        case 'UPDATE':
          return prev.map(signal => 
            signal.id === newSignal.id ? newSignal : signal
          );
        case 'DELETE':
          return prev.filter(signal => signal.id !== oldSignal.id);
        default:
          return prev;
      }
    });
  };

  const cleanup = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
  };

  const retryConnection = () => {
    setError(null);
    setIsLoading(true);
    initializeMobileApp();
  };

  const getSignalColor = (type: string) => {
    return type.toLowerCase() === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const getSignalIcon = (type: string) => {
    return type.toLowerCase() === 'buy' ? TrendingUp : TrendingDown;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatPips = (pips: number) => {
    return `${pips > 0 ? '+' : ''}${pips} pips`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading trading signals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <Button onClick={retryConnection}>Retry Connection</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Connection Status Bar */}
      <div className={`flex items-center justify-center p-2 text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 mr-2" />
            Connected - Live Updates
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mr-2" />
            Offline - Data may be outdated
          </>
        )}
      </div>

      {/* Header */}
      <div className="bg-background border-b p-4">
        <h1 className="text-2xl font-bold">Trading Signals</h1>
        <p className="text-muted-foreground">Real-time forex signals</p>
      </div>

      {/* Signals List */}
      <div className="p-4 space-y-4">
        {signals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No active signals available</p>
          </div>
        ) : (
          signals.map((signal) => {
            const currentMarketData = marketData[signal.symbol];
            const SignalIcon = getSignalIcon(signal.type);
            
            return (
              <Card key={signal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <SignalIcon className={`h-5 w-5 mr-2 ${getSignalColor(signal.type)}`} />
                      {signal.symbol}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{signal.confidence}% confidence</Badge>
                      <Badge variant={signal.type.toLowerCase() === 'buy' ? 'default' : 'destructive'}>
                        {signal.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Entry Price</p>
                      <p className="font-semibold">{formatPrice(signal.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Price</p>
                      <p className="font-semibold">
                        {currentMarketData ? formatPrice(currentMarketData.price) : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stop Loss</p>
                      <p className="font-semibold text-red-600">{formatPrice(signal.stop_loss)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pips</p>
                      <p className={`font-semibold ${signal.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPips(signal.pips)}
                      </p>
                    </div>
                  </div>
                  
                  {signal.take_profits && signal.take_profits.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Take Profit Levels</p>
                      <div className="flex flex-wrap gap-2">
                        {signal.take_profits.map((tp, index) => (
                          <Badge 
                            key={index} 
                            variant={signal.targets_hit?.includes(index) ? 'default' : 'outline'}
                          >
                            TP{index + 1}: {formatPrice(tp)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Status: {signal.status}</span>
                    <span>{new Date(signal.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}