
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, Zap, TrendingUp, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';

const TestSignalGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('signal_threshold_level, entry_threshold, ai_validation_enabled')
      .eq('singleton', true)
      .maybeSingle();
    
    if (data) setSettings(data);
  };

  const handleGenerateTestSignals = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('🧪 Generating test signals...');
      
      const { data, error: functionError } = await supabase.functions.invoke('generate-test-signals', {
        body: { trigger: 'manual_test' }
      });

      if (functionError) {
        throw new Error(`Test signal generation failed: ${functionError.message}`);
      }

      console.log('🧪 Test signal generation response:', data);
      setResults(data);

      toast({
        title: "🧪 Test Signals Generated!",
        description: `Created ${data.signalsGenerated || 0} demo trading signals`,
      });

    } catch (err: any) {
      console.error('❌ Test signal generation error:', err);
      setError(err.message);
      toast({
        title: "Test Generation Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSignals = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔬 Testing NEW dual-strategy signal generation system...');
      
      const { data, error: functionError } = await supabase.functions.invoke('generate-signals', {
        body: { 
          test: false, 
          force: true, 
          debug: true,
          trigger: 'test_new_system'
        }
      });

      if (functionError) {
        throw new Error(`Signal generation failed: ${functionError.message}`);
      }

      console.log('🔬 New system response:', data);
      setResults(data);

      const signalCount = data?.signals?.length || 0;
      const strategyBreakdown = data?.signals?.reduce((acc: any, s: any) => {
        acc[s.strategy_type] = (acc[s.strategy_type] || 0) + 1;
        return acc;
      }, {});

      if (signalCount > 0) {
        toast({
          title: "✅ New System: Signals Generated",
          description: `${signalCount} signals | Trend: ${strategyBreakdown?.trend_continuation || 0} | H&S: ${strategyBreakdown?.head_and_shoulders_reversal || 0}`,
        });
      } else {
        toast({
          title: "⚠️ No Signals Generated",
          description: "No high-quality setups found with current thresholds",
          variant: "default"
        });
      }

      await fetchSettings();
    } catch (err: any) {
      console.error('❌ Signal generation error:', err);
      setError(err.message);
      toast({
        title: "Generation Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-signals', {
        body: { test: true, skipGeneration: true }
      });

      if (functionError) {
        throw new Error(`Connection test failed: ${functionError.message}`);
      }

      toast({
        title: "🤖 AI System Connected",
        description: "AI-powered signal generation system is ready",
      });

      setResults({
        status: 'connection_test',
        message: 'AI system connection successful',
        environment: data?.environment || {},
        timestamp: data?.timestamp
      });

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Connection Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            New Dual-Strategy Signal Generation Testing
          </CardTitle>
          <p className="text-muted-foreground">
            Test the structure-based signal generation with confluence analysis and AI validation
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-background/50 rounded-lg border">
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Signal Threshold
                </div>
                <Badge variant="secondary">{settings.signal_threshold_level}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Entry Threshold
                </div>
                <Badge variant="secondary">{settings.entry_threshold || 'LOW'}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  AI Validation
                </div>
                <Badge variant={settings.ai_validation_enabled === 'true' ? 'default' : 'outline'}>
                  {settings.ai_validation_enabled === 'true' ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Strategy 1: Trend Continuation
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Structure-based entries (HH/LL)</li>
                <li>• Multi-timeframe confluence (4H + 1H + 15M)</li>
                <li>• Support/Resistance zones</li>
                <li>• Dynamic stop-loss placement</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Strategy 2: H&S Reversal
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Head & Shoulders detection</li>
                <li>• Neckline confirmation</li>
                <li>• Pattern-based targets</li>
                <li>• Confluence reversal bonus</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerateSignals}
              disabled={loading}
              size="lg"
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {loading ? 'Analyzing Markets...' : 'Test New Signal System'}
            </Button>
            <Button
              onClick={handleGenerateTestSignals}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {loading ? 'Creating...' : 'Legacy Test Signals'}
            </Button>
            <Button
              onClick={handleTestConnection}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Signal Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {results.signals?.length || results.signalsGenerated || results.stats?.signalsGenerated || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.signals?.filter((s: any) => s.strategy_type === 'trend_continuation').length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Trend Signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.signals?.filter((s: any) => s.strategy_type === 'head_and_shoulders_reversal').length || 0}
                </div>
                <div className="text-sm text-muted-foreground">H&S Signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.success ? 'Success' : 'Failed'}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>

            {results.signals && results.signals.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Generated Signals:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.signals.map((signal: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border text-sm">
                      <Badge variant={signal.type === 'BUY' ? 'default' : 'destructive'}>
                        {signal.type}
                      </Badge>
                      <span className="font-medium">{signal.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {signal.strategy_type === 'trend_continuation' ? 'Trend' : 'H&S Reversal'}
                      </Badge>
                      <span className="text-muted-foreground">
                        Conf: {signal.confidence_score}%
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        SL: {signal.stop_loss} | TP: {signal.take_profits?.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.stats?.errors && results.stats.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-destructive mb-2">Errors:</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {results.stats.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {results.timestamp || new Date().toISOString()}
              {results.trigger && ` • Trigger: ${results.trigger}`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestSignalGeneration;
