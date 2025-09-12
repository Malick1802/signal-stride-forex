import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SignalGenerationSettings = () => {
  const [currentLevel, setCurrentLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const thresholdLevels = {
    HIGH: {
      name: 'HIGH (Ultra-Selective)',
      description: 'Maximum quality signals with 4+ technical confluences. 75+ pass threshold, max 3 signals per run.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20 border-red-500/30',
      characteristics: ['4+ Technical Confluences', '75+ Pass Threshold', 'Max 3 Signals/5min', 'RSI: 25/75', '2.0:1 Risk/Reward']
    },
    MEDIUM: {
      name: 'MEDIUM (Selective)',
      description: 'Balanced approach with 3+ technical confluences. 65+ pass threshold, max 5 signals per run.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20 border-yellow-500/30',
      characteristics: ['3+ Technical Confluences', '65+ Pass Threshold', 'Max 5 Signals/5min', 'RSI: 30/70', '1.8:1 Risk/Reward']
    },
    LOW: {
      name: 'LOW (Standard)',
      description: 'Standard signal generation with 2+ technical confluences. 55+ pass threshold, max 8 signals per run.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20 border-green-500/30',
      characteristics: ['2+ Technical Confluences', '55+ Pass Threshold', 'Max 8 Signals/5min', 'RSI: 35/65', '1.5:1 Risk/Reward']
    }
  };

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('signal_threshold_level')
        .eq('singleton', true)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      setCurrentLevel((data?.signal_threshold_level as 'HIGH' | 'MEDIUM' | 'LOW') || 'HIGH');
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load current settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.rpc('update_app_setting', {
        setting_name: 'signal_threshold_level',
        setting_value: currentLevel
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Settings Updated",
        description: `Signal generation threshold set to ${currentLevel}`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Signal Generation Settings</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-white animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Signal Generation Settings</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg transition-colors"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Threshold Level
          </label>
          <div className="space-y-3">
            {Object.entries(thresholdLevels).map(([level, config]) => (
              <div
                key={level}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  currentLevel === level
                    ? config.bgColor
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setCurrentLevel(level as any)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="threshold"
                    checked={currentLevel === level}
                    onChange={() => setCurrentLevel(level as any)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`font-semibold ${config.color}`}>
                        {config.name}
                      </span>
                      {currentLevel === level && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-3">
                      {config.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.characteristics.map((char, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
          <h4 className="text-blue-400 font-medium mb-2">Important Notes:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Changes take effect immediately for new signal generation cycles</li>
            <li>• GitHub cron jobs will automatically use the selected threshold level</li>
            <li>• Higher thresholds generate fewer but higher quality signals</li>
            <li>• All levels maintain the same professional 3-tier analysis system</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SignalGenerationSettings;