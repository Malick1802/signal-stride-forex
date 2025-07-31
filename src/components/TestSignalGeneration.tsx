
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, Zap, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const TestSignalGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
      console.log('🤖 Starting AI-powered signal generation test...');
      
      const { data, error: functionError } = await supabase.functions.invoke('generate-signals', {
        body: { 
          test: false, 
          force: true, 
          debug: true,
          optimized: true,
          trigger: 'test_page_ai'
        }
      });

      if (functionError) {
        throw new Error(`AI Signal generation failed: ${functionError.message}`);
      }

      console.log('🤖 AI Signal generation response:', data);
      setResults(data);

      if (data?.stats?.signalsGenerated > 0) {
        toast({
          title: "🤖 AI Signals Generated Successfully",
          description: `Generated ${data.stats.signalsGenerated} AI-powered signals using OpenAI analysis`,
        });
      } else {
        toast({
          title: "🤖 AI Analysis Complete",
          description: "AI analysis completed but no high-confidence signals generated",
          variant: "default"
        });
      }

    } catch (err: any) {
      console.error('❌ AI Signal generation error:', err);
      setError(err.message);
      toast({
        title: "AI Generation Error",
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
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Brain className="h-6 w-6" />
            AI-Powered Signal Generation Testing
          </CardTitle>
          <p className="text-purple-700">
            Test the OpenAI-powered signal generation system with advanced market analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Features
              </h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• OpenAI-powered market analysis</li>
                <li>• Natural language reasoning</li>
                <li>• Context-aware decision making</li>
                <li>• Advanced pattern recognition</li>
                <li>• Minimum 30-pip stop loss enforcement</li>
                <li>• Minimum 15-pip take profit validation</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Signal Quality
              </h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 70-95% confidence range</li>
                <li>• Major currency pair focus</li>
                <li>• Session-aware analysis</li>
                <li>• Risk/reward optimization</li>
                <li>• Real-time market data input</li>
                <li>• Multi-factor technical validation</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerateTestSignals}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Zap className="h-4 w-4" />
              {loading ? 'Creating...' : 'Generate Test Signals'}
            </Button>
            <Button
              onClick={handleGenerateSignals}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {loading ? 'AI Analyzing...' : 'Generate AI Signals'}
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
              <Brain className="h-5 w-5 text-purple-600" />
              AI Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.signalsGenerated || results.stats?.signalsGenerated || 0}
                </div>
                <div className="text-sm text-gray-600">Signals Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.testMode ? 'Test' : 'Live'}
                </div>
                <div className="text-sm text-gray-600">Mode</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.success ? 'Success' : 'Failed'}
                </div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {results.stats?.totalActiveSignals || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Total Active</div>
              </div>
            </div>

            {results.stats?.signalDistribution && (
              <div className="flex gap-2 justify-center">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  BUY: {results.stats.signalDistribution.newBuySignals || 0}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  SELL: {results.stats.signalDistribution.newSellSignals || 0}
                </Badge>
                {results.stats.aiPowered && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </div>
            )}

            {results.stats?.errors && results.stats.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {results.stats.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Generated at: {results.timestamp}
              {results.trigger && ` • Trigger: ${results.trigger}`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestSignalGeneration;
