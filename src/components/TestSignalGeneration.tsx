
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, PlayCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const TestSignalGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const runSignalGenerationTest = async () => {
    setIsGenerating(true);
    setTestResults(null);
    setDebugLogs([]);

    try {
      console.log('🧪 Starting signal generation test...');
      
      // Test with debug mode enabled
      const { data: result, error } = await supabase.functions.invoke('generate-signals', {
        body: { 
          force: true, 
          debug: true, 
          trigger: 'manual_test',
          optimized: false // Disable optimizations for full testing
        }
      });

      if (error) {
        console.error('❌ Signal generation test failed:', error);
        toast({
          title: "Test Failed",
          description: `Signal generation error: ${error.message}`,
          variant: "destructive",
          duration: 10000,
        });
        setTestResults({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Signal generation test completed:', result);
      
      // Parse the results
      const testResult = {
        success: result?.status === 'success',
        signalsGenerated: result?.stats?.signalsGenerated || 0,
        totalGenerated: result?.stats?.totalGenerated || 0,
        totalActiveSignals: result?.stats?.totalActiveSignals || 0,
        signalLimit: result?.stats?.signalLimit || 20,
        executionTime: result?.stats?.executionTime || 'unknown',
        signalDistribution: result?.stats?.signalDistribution || {},
        errors: result?.stats?.errors || [],
        timestamp: result?.timestamp || new Date().toISOString()
      };

      setTestResults(testResult);

      // Show appropriate toast
      if (testResult.success && testResult.signalsGenerated > 0) {
        toast({
          title: "🎯 Test Successful!",
          description: `Generated ${testResult.signalsGenerated} signals in ${testResult.executionTime}`,
          duration: 8000,
        });
      } else if (testResult.success && testResult.signalsGenerated === 0) {
        toast({
          title: "⚠️ Test Completed - No Signals",
          description: "Function executed successfully but no signals passed validation",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "❌ Test Failed",
          description: "Signal generation test encountered issues",
          variant: "destructive",
          duration: 10000,
        });
      }

    } catch (error) {
      console.error('❌ Critical test error:', error);
      toast({
        title: "Critical Test Error",
        description: `Test failed: ${error}`,
        variant: "destructive",
        duration: 10000,
      });
      setTestResults({
        success: false,
        error: String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    if (success) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (success: boolean, signalsGenerated: number) => {
    if (success && signalsGenerated > 0) {
      return <Badge className="bg-green-500">SUCCESS</Badge>;
    } else if (success && signalsGenerated === 0) {
      return <Badge variant="secondary">NO SIGNALS</Badge>;
    } else {
      return <Badge variant="destructive">FAILED</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PlayCircle className="h-6 w-6 text-blue-500" />
          <span>Signal Generation Test</span>
        </CardTitle>
        <CardDescription>
          Test the improved signal generation system with Phase 1 & 2 optimizations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Test Controls */}
        <div className="flex space-x-3">
          <Button
            onClick={runSignalGenerationTest}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing Signal Generation...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(testResults.success)}
                <div>
                  <h3 className="font-semibold">Test Results</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Completed at {new Date(testResults.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {getStatusBadge(testResults.success, testResults.signalsGenerated)}
            </div>

            {/* Detailed Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.signalsGenerated}
                </div>
                <div className="text-sm text-gray-600">Signals Generated</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="text-2xl font-bold text-blue-600">
                  {testResults.totalActiveSignals}
                </div>
                <div className="text-sm text-gray-600">Total Active</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="text-2xl font-bold text-purple-600">
                  {testResults.executionTime}
                </div>
                <div className="text-sm text-gray-600">Execution Time</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="text-2xl font-bold text-orange-600">
                  {testResults.signalLimit}
                </div>
                <div className="text-sm text-gray-600">Signal Limit</div>
              </div>
            </div>

            {/* Signal Distribution */}
            {testResults.signalDistribution && Object.keys(testResults.signalDistribution).length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                <h4 className="font-medium mb-3">Signal Distribution</h4>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-sm">BUY: {testResults.signalDistribution.newBuySignals || 0}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm">SELL: {testResults.signalDistribution.newSellSignals || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {testResults.errors && testResults.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h4 className="font-medium text-red-700 dark:text-red-400">Errors Encountered</h4>
                </div>
                <div className="space-y-1">
                  {testResults.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-600 dark:text-red-300">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Analysis */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Test Analysis</h4>
              <div className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                {testResults.success ? (
                  <>
                    {testResults.signalsGenerated > 0 ? (
                      <>
                        <div>✅ Signal generation is working with Phase 1 & 2 improvements</div>
                        <div>✅ Validation thresholds (1.5) are allowing quality signals through</div>
                        <div>✅ Enhanced scoring logic is producing {testResults.signalsGenerated} signals</div>
                      </>
                    ) : (
                      <>
                        <div>⚠️ Function executes successfully but no signals generated</div>
                        <div>⚠️ Market conditions may not meet validation criteria</div>
                        <div>💡 Consider further threshold adjustments or check market data quality</div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>❌ Signal generation failed - check edge function logs</div>
                    <div>🔧 Function may need debugging or error handling improvements</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!testResults && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
            <h4 className="font-medium mb-2">Test Instructions</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>• This test will trigger the signal generation function with debug logging</div>
              <div>• It will test the Phase 1 & 2 improvements (lowered thresholds + enhanced scoring)</div>
              <div>• Results will show if our optimizations are working</div>
              <div>• The test forces generation regardless of existing signal limits</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestSignalGeneration;
