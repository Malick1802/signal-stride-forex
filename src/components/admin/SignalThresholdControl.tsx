import React, { useState, useEffect } from 'react';
import { Settings, Activity, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type ThresholdLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface ThresholdInfo {
  level: ThresholdLevel;
  name: string;
  description: string;
  expectedSignals: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const THRESHOLD_INFO: ThresholdInfo[] = [
  {
    level: 'LOW',
    name: 'Low Threshold',
    description: 'More lenient criteria for signal generation',
    expectedSignals: '3-8 signals/day',
    icon: Activity,
    color: 'text-green-400'
  },
  {
    level: 'MEDIUM',
    name: 'Medium Threshold',
    description: 'Balanced criteria for moderate signal volume',
    expectedSignals: '1-4 signals/day',
    icon: Target,
    color: 'text-yellow-400'
  },
  {
    level: 'HIGH',
    name: 'High Threshold',
    description: 'Strict criteria for premium quality signals',
    expectedSignals: '0-2 signals/day',
    icon: Settings,
    color: 'text-red-400'
  }
];

const SignalThresholdControl = () => {
  const [currentLevel, setCurrentLevel] = useState<ThresholdLevel>('HIGH');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentSetting();
  }, []);

  const fetchCurrentSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('signal_threshold_level')
        .single();

      if (error) throw error;
      setCurrentLevel((data?.signal_threshold_level as ThresholdLevel) || 'HIGH');
    } catch (error) {
      console.error('Error fetching threshold setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to load current threshold setting',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateThreshold = async (newLevel: ThresholdLevel) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          signal_threshold_level: newLevel,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('singleton', true);

      if (error) throw error;

      setCurrentLevel(newLevel);
      toast({
        title: 'Threshold Updated',
        description: `Signal generation threshold set to ${newLevel}`,
      });
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast({
        title: 'Error',
        description: 'Failed to update threshold setting',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentThresholdInfo = THRESHOLD_INFO.find(info => info.level === currentLevel);

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Signal Generation Threshold
        </CardTitle>
        <CardDescription className="text-gray-300">
          Control the strictness of signal generation criteria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Setting Display */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentThresholdInfo && (
                <>
                  <currentThresholdInfo.icon className={`h-5 w-5 ${currentThresholdInfo.color}`} />
                  <div>
                    <div className="text-white font-medium">{currentThresholdInfo.name}</div>
                    <div className="text-gray-400 text-sm">{currentThresholdInfo.description}</div>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-medium">{currentThresholdInfo?.expectedSignals}</div>
              <div className="text-gray-400 text-xs">Expected volume</div>
            </div>
          </div>
        </div>

        {/* Threshold Selector */}
        <div className="space-y-4">
          <label className="text-white font-medium">Change Threshold Level:</label>
          <Select value={currentLevel} onValueChange={(value) => updateThreshold(value as ThresholdLevel)} disabled={isUpdating}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRESHOLD_INFO.map((info) => (
                <SelectItem key={info.level} value={info.level}>
                  <div className="flex items-center gap-2">
                    <info.icon className={`h-4 w-4 ${info.color}`} />
                    <span>{info.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Threshold Comparison */}
        <div className="space-y-3">
          <div className="text-white font-medium">Threshold Comparison:</div>
          <div className="grid gap-3">
            {THRESHOLD_INFO.map((info) => (
              <div 
                key={info.level}
                className={`p-3 rounded-lg border transition-all ${
                  info.level === currentLevel
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <info.icon className={`h-4 w-4 ${info.color}`} />
                    <span className="text-white font-medium">{info.name}</span>
                    {info.level === currentLevel && (
                      <span className="text-xs bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-gray-300 text-sm">{info.expectedSignals}</span>
                </div>
                <div className="text-gray-400 text-xs mt-1">{info.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Update Button */}
        {isUpdating && (
          <Button disabled className="w-full">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Updating...
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalThresholdControl;