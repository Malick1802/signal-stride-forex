
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Play, Settings, Activity } from 'lucide-react';

const AutomatedAnalysisControl = () => {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const setupAutomatedAnalysis = async () => {
    setIsSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-automated-analysis-cron');
      
      if (error) {
        console.error('Setup error:', error);
        toast({
          title: "Setup Failed",
          description: "Failed to setup automated analysis system",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Automated Analysis Activated",
        description: "AI signal analysis will now run every 5 minutes",
      });
    } catch (error) {
      console.error('Error setting up automated analysis:', error);
      toast({
        title: "Setup Error",
        description: "Failed to activate automated analysis",
        variant: "destructive"
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const testAutomatedAnalysis = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-signal-analysis');
      
      if (error) {
        console.error('Test error:', error);
        toast({
          title: "Test Failed", 
          description: "Automated analysis test failed",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Test Complete",
        description: `Generated ${data?.signals?.length || 0} high-confidence signals`,
      });
    } catch (error) {
      console.error('Error testing automated analysis:', error);
      toast({
        title: "Test Error",
        description: "Failed to test automated analysis",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Bot className="h-6 w-6 text-purple-400" />
        <h3 className="text-white text-lg font-semibold">AI-Powered Automated Analysis</h3>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
          90%+ CONFIDENCE
        </span>
      </div>
      
      <p className="text-gray-300 text-sm mb-6">
        Advanced AI system that analyzes market data every 5 minutes using OpenAI to detect high-confidence trading opportunities (90%+ confidence level). 
        Automatically generates detailed signals with comprehensive analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Activity className="h-4 w-4 text-green-400" />
            <span>Real-time market analysis</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Bot className="h-4 w-4 text-blue-400" />
            <span>OpenAI-powered signal detection</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Settings className="h-4 w-4 text-purple-400" />
            <span>Automated every 5 minutes</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={setupAutomatedAnalysis}
            disabled={isSettingUp}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSettingUp ? (
              <>
                <Settings className="h-4 w-4 mr-2 animate-spin" />
                Setting Up...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Setup Automated Analysis
              </>
            )}
          </Button>

          <Button
            onClick={testAutomatedAnalysis}
            disabled={isTesting}
            variant="outline"
            className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/10"
          >
            {isTesting ? (
              <>
                <Play className="h-4 w-4 mr-2 animate-pulse" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test Analysis Now
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-xs">
          ⚡ This system uses OpenAI API for advanced market analysis. Ensure your OpenAI API key is configured in Supabase secrets.
        </p>
      </div>
    </div>
  );
};

export default AutomatedAnalysisControl;
