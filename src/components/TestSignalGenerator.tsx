import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TestSignalGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<any[]>([]);
  const { toast } = useToast();

  const generateTestSignals = async () => {
    setLoading(true);
    try {
      console.log('🧪 Generating test signals...');
      
      const { data, error } = await supabase.functions.invoke('generate-test-signals', {
        body: { 
          count: 3,
          source: 'manual-test' 
        }
      });

      if (error) {
        throw error;
      }

      if (data?.signals) {
        setLastGenerated(data.signals);
        toast({
          title: "Test Signals Generated",
          description: `Successfully created ${data.signals.length} test signals`,
        });
        console.log('✅ Test signals generated:', data.signals);
      } else {
        throw new Error('No signals returned from generator');
      }
    } catch (error) {
      console.error('❌ Failed to generate test signals:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate test signals',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const forceLowThresholdGeneration = async () => {
    setLoading(true);
    try {
      console.log('🧪 Forcing signal generation with low threshold...');
      
      const { data, error } = await supabase.functions.invoke('generate-signals', {
        body: { 
          force: true,
          lowThreshold: true,
          source: 'force-test'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Force Generation Complete",
        description: `Attempted to generate signals with relaxed criteria`,
      });
      console.log('✅ Force generation result:', data);
    } catch (error) {
      console.error('❌ Failed to force generate signals:', error);
      toast({
        title: "Force Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to force generate signals',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Signal Generation Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={generateTestSignals}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate Test Signals
          </Button>
          
          <Button
            onClick={forceLowThresholdGeneration}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Force Generate (Low Threshold)
          </Button>
        </div>

        {lastGenerated.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Last Generated Signals:</h4>
            <div className="space-y-2">
              {lastGenerated.map((signal, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{signal.symbol}</Badge>
                    <Badge variant={signal.type === 'BUY' ? 'default' : 'secondary'}>
                      {signal.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Confidence: {signal.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Test Signals:</strong> Creates demo signals with realistic data for testing display and functionality.</p>
          <p><strong>Force Generate:</strong> Attempts to generate real signals with relaxed quality criteria.</p>
        </div>
      </CardContent>
    </Card>
  );
};