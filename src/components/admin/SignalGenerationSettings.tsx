import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SignalGenerationSettings = () => {
  const [currentLevel, setCurrentLevel] = useState<'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [entryThreshold, setEntryThreshold] = useState<'LOW' | 'HIGH'>('LOW');
  const [aiValidationEnabled, setAiValidationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const { toast } = useToast();

  const thresholdLevels = {
    EXTREME: {
      name: 'EXTREME (Ultra-Conservative)',
      description: 'Ultra-conservative signals with 6+ technical confluences. 95+ pass threshold, max 1 signal per run. Near-perfect setups only.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20 border-red-500/30',
      characteristics: ['6+ Technical Confluences', '95+ Pass Threshold', 'Max 1 Signal/5min', 'RSI: 15/85', '3:1 Risk/Reward', '72hr Gap Between Signals', '2hr News Buffer']
    },
    ULTRA: {
      name: 'ULTRA (Maximum Precision)',
      description: 'Elite-grade signals with 5+ technical confluences. 85+ pass threshold, max 2 signals per run.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20 border-purple-500/30',
      characteristics: ['5+ Technical Confluences', '85+ Pass Threshold', 'Max 2 Signals/5min', 'RSI: 20/80', '2.5:1 Risk/Reward']
    },
    HIGH: {
      name: 'HIGH (Ultra-Selective)',
      description: 'Maximum quality signals with 4+ technical confluences. 80+ pass threshold, max 3 signals per run.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20 border-red-500/30',
      characteristics: ['4+ Technical Confluences', '80+ Pass Threshold', 'Max 3 Signals/5min', 'RSI: 25/75', '2.0:1 Risk/Reward']
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
      
      // Fetch app settings
      const { data, error } = await supabase
        .from('app_settings')
        .select('signal_threshold_level, entry_threshold, ai_validation_enabled')
        .eq('singleton', true)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      setCurrentLevel((data?.signal_threshold_level as 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW') || 'HIGH');
      setEntryThreshold((data?.entry_threshold as 'LOW' | 'HIGH') || 'LOW');
      setAiValidationEnabled(data?.ai_validation_enabled === 'true');
      
      // Fetch strategy performance
      await fetchStrategyPerformance();
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

  const fetchStrategyPerformance = async () => {
    try {
      // Get signals from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: signals } = await supabase
        .from('trading_signals')
        .select('*, signal_outcomes(*)')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('is_centralized', true);
      
      if (!signals) return;
      
      // Calculate performance by strategy type
      const trendContinuation = signals.filter(s => s.strategy_type === 'trend_continuation');
      const hsReversal = signals.filter(s => s.strategy_type === 'head_and_shoulders_reversal' || s.strategy_type === 'confluence_reversal');
      
      const calcStats = (strategySignals: any[]) => {
        const withOutcomes = strategySignals.filter(s => s.signal_outcomes && s.signal_outcomes.length > 0);
        const wins = withOutcomes.filter(s => s.signal_outcomes[0]?.hit_target).length;
        const total = withOutcomes.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        
        return {
          signalCount: strategySignals.length,
          winRate,
          avgRRR: 2.0 // Placeholder - would need actual calculation
        };
      };
      
      setPerformanceData({
        trendContinuation: calcStats(trendContinuation),
        hsReversal: calcStats(hsReversal)
      });
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update all three settings
      const updates = [
        supabase.rpc('update_app_setting', {
          setting_name: 'signal_threshold_level',
          setting_value: currentLevel
        }),
        supabase.rpc('update_app_setting', {
          setting_name: 'entry_threshold',
          setting_value: entryThreshold
        }),
        supabase.rpc('update_app_setting', {
          setting_name: 'ai_validation_enabled',
          setting_value: aiValidationEnabled ? 'true' : 'false'
        })
      ];
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('RPC Errors:', errors);
        throw new Error('Failed to update some settings');
      }

      toast({
        title: "Settings Updated",
        description: `All signal generation settings saved successfully`,
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save settings",
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

        {/* Entry Threshold Setting */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Entry Threshold (Dual-Strategy System)</span>
          </h4>
          <div className="space-y-3">
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                entryThreshold === 'LOW'
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => setEntryThreshold('LOW')}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="entryThreshold"
                  checked={entryThreshold === 'LOW'}
                  onChange={() => setEntryThreshold('LOW')}
                />
                <div>
                  <div className="font-medium text-green-400">LOW - Break Only (Aggressive)</div>
                  <div className="text-sm text-gray-300 mt-1">
                    Enter on structure break without waiting for retest. Faster entries, more signals.
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                entryThreshold === 'HIGH'
                  ? 'bg-red-500/20 border-red-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => setEntryThreshold('HIGH')}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="entryThreshold"
                  checked={entryThreshold === 'HIGH'}
                  onChange={() => setEntryThreshold('HIGH')}
                />
                <div>
                  <div className="font-medium text-red-400">HIGH - Retest Required (Conservative)</div>
                  <div className="text-sm text-gray-300 mt-1">
                    Only enter after price retests AOI zone. Higher quality, fewer signals.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Validation Toggle */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="ai-validation" className="text-white font-medium flex items-center space-x-2">
                <span>AI Validation (Tier 2)</span>
              </Label>
              <p className="text-sm text-gray-300 mt-1">
                Validate all candidate signals with OpenAI before publication. Blends structure confidence (60%) with AI confidence (40%).
              </p>
            </div>
            <Switch
              id="ai-validation"
              checked={aiValidationEnabled}
              onCheckedChange={setAiValidationEnabled}
            />
          </div>
        </div>

        {/* Strategy Performance */}
        {performanceData && (
          <Card className="mt-6 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Strategy Performance (Last 30 Days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium text-emerald-400 mb-2">Trend Continuation</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Signals</div>
                    <div className="text-white font-semibold">{performanceData.trendContinuation.signalCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Win Rate</div>
                    <div className="text-white font-semibold">{performanceData.trendContinuation.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Avg RRR</div>
                    <div className="text-white font-semibold">{performanceData.trendContinuation.avgRRR}:1</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium text-purple-400 mb-2">Head & Shoulders Reversal</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Signals</div>
                    <div className="text-white font-semibold">{performanceData.hsReversal.signalCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Win Rate</div>
                    <div className="text-white font-semibold">{performanceData.hsReversal.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Avg RRR</div>
                    <div className="text-white font-semibold">{performanceData.hsReversal.avgRRR}:1</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
          <h4 className="text-blue-400 font-medium mb-2">Important Notes:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Changes take effect immediately for new signal generation cycles</li>
            <li>• Dual-strategy system: Trend Continuation + Head & Shoulders Reversal</li>
            <li>• Entry threshold controls retest requirement for entries</li>
            <li>• AI validation is optional and can be toggled on/off</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SignalGenerationSettings;