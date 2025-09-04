import React, { useState, useEffect } from 'react';
import { Settings, TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ThresholdLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface ThresholdConfig {
  tier1Pass: number;
  tier2Pass: number;
  tier3Pass: number;
  maxNewSignals: number;
  description: string;
  expectedDaily: string;
}

const THRESHOLD_CONFIGS: Record<ThresholdLevel, ThresholdConfig> = {
  LOW: {
    tier1Pass: 30,
    tier2Pass: 40,
    tier3Pass: 50,
    maxNewSignals: 12,
    description: 'More signals, broader opportunities',
    expectedDaily: '5-12 signals'
  },
  MEDIUM: {
    tier1Pass: 50,
    tier2Pass: 60,
    tier3Pass: 70,
    maxNewSignals: 6,
    description: 'Balanced signal quality and quantity',
    expectedDaily: '2-6 signals'
  },
  HIGH: {
    tier1Pass: 70,
    tier2Pass: 75,
    tier3Pass: 80,
    maxNewSignals: 3,
    description: 'Premium quality, fewer signals',
    expectedDaily: '0-3 signals'
  }
};

const SignalThresholdControl = () => {
  const [currentLevel, setCurrentLevel] = useState<ThresholdLevel>('HIGH');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCurrentThreshold = async () => {
    try {
      const { data, error } = await supabase.rpc('get_app_setting', { 
        setting_name: 'signal_threshold_level' 
      });

      if (error) {
        console.error('Error fetching threshold:', error);
        return;
      }

      if (data) {
        setCurrentLevel((data as string) as ThresholdLevel || 'HIGH');
      }
    } catch (error) {
      console.error('Error fetching threshold:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateThreshold = async (newLevel: ThresholdLevel) => {
    if (newLevel === currentLevel) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.rpc('update_app_setting', { 
        setting_name: 'signal_threshold_level',
        setting_value: newLevel
      });

      if (error) {
        throw error;
      }

      setCurrentLevel(newLevel);
      setLastUpdated(new Date().toISOString());
      
      toast({
        title: "Threshold Updated",
        description: `Signal generation threshold set to ${newLevel}. Changes will apply to the next signal generation cycle.`,
      });

    } catch (error) {
      console.error('Error updating threshold:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update signal threshold. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchCurrentThreshold();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Signal Generation Threshold</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = THRESHOLD_CONFIGS[currentLevel];

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Signal Generation Threshold</span>
            </div>
            <Badge variant={currentLevel === 'LOW' ? 'default' : currentLevel === 'MEDIUM' ? 'secondary' : 'destructive'}>
              {currentLevel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expected Daily Output</span>
              </div>
              <p className="text-2xl font-bold">{config.expectedDaily}</p>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Quality Thresholds</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>Tier 1: {config.tier1Pass}+</div>
                <div>Tier 2: {config.tier2Pass}+</div>
                <div>Tier 3: {config.tier3Pass}+</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Max Per Run</span>
              </div>
              <p className="text-2xl font-bold">{config.maxNewSignals}</p>
              <p className="text-sm text-muted-foreground">signals maximum</p>
            </div>
          </div>

          {lastUpdated && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(THRESHOLD_CONFIGS) as ThresholdLevel[]).map((level) => {
          const levelConfig = THRESHOLD_CONFIGS[level];
          const isActive = level === currentLevel;
          
          return (
            <Card 
              key={level}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => !isUpdating && updateThreshold(level)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{level}</CardTitle>
                  {level === 'LOW' && <TrendingDown className="h-5 w-5 text-green-500" />}
                  {level === 'MEDIUM' && <Activity className="h-5 w-5 text-yellow-500" />}
                  {level === 'HIGH' && <TrendingUp className="h-5 w-5 text-red-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{levelConfig.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Expected Daily:</span>
                    <span className="font-medium">{levelConfig.expectedDaily}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Max Per Run:</span>
                    <span className="font-medium">{levelConfig.maxNewSignals}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Quality Bar:</span>
                    <span className="font-medium">{levelConfig.tier1Pass}+</span>
                  </div>
                </div>

                {isActive && (
                  <div className="flex items-center space-x-2 text-xs text-primary">
                    <CheckCircle className="h-3 w-3" />
                    <span>Currently Active</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How it works</p>
              <p className="text-sm text-muted-foreground">
                Signal generation uses a 3-tier analysis system. Lower thresholds allow more pairs to pass each tier,
                resulting in more signals but potentially lower average quality. Higher thresholds are more selective,
                producing fewer but higher-quality signals. Changes apply to the next generation cycle.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalThresholdControl;