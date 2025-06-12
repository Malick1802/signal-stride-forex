
import React, { memo } from 'react';
import { TrendingUp, TrendingDown, Target, Shield, Clock, Brain, BarChart3, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RealTimeChart from './RealTimeChart';

interface SignalCardProps {
  signal: any;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: () => void;
}

const SignalCard = memo(({ signal, analysis, analyzingSignal, onGetAIAnalysis }: SignalCardProps) => {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(5);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Parse market context for enhanced display
  const marketContext = signal.market_context ? JSON.parse(signal.market_context) : {};
  const technicalIndicators = signal.technical_indicators ? JSON.parse(signal.technical_indicators) : {};
  
  // Get quality grade and scores
  const qualityGrade = marketContext.quality_grade || 'GOOD';
  const technicalScore = signal.technical_score || signal.confidence;
  const fundamentalScore = signal.fundamental_score || 70;
  const sentimentScore = signal.sentiment_score || 70;
  const riskRewardRatio = signal.risk_reward_ratio || 2.0;

  // Quality color coding
  const getQualityColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT': return 'text-emerald-400 bg-emerald-900/20';
      case 'GOOD': return 'text-blue-400 bg-blue-900/20';
      case 'FAIR': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300">
      {/* Enhanced Header with Quality Grade */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {signal.type === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
            <span className="text-white font-bold text-lg">{signal.pair}</span>
            {signal.type === 'BUY' ? (
              <span className="text-emerald-400 font-medium">BUY</span>
            ) : (
              <span className="text-red-400 font-medium">SELL</span>
            )}
          </div>
          
          {/* Quality Grade Badge */}
          <div className={`px-2 py-1 rounded-md text-xs font-medium ${getQualityColor(qualityGrade)}`}>
            <Star className="h-3 w-3 inline mr-1" />
            {qualityGrade}
          </div>
        </div>

        <div className="text-right">
          <div className="text-white font-bold">{signal.confidence}%</div>
          <div className="text-gray-400 text-xs">Confidence</div>
        </div>
      </div>

      {/* Enhanced Score Dashboard */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className={`text-sm font-bold ${getScoreColor(technicalScore)}`}>
            {technicalScore}%
          </div>
          <div className="text-xs text-gray-400">Technical</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-bold ${getScoreColor(fundamentalScore)}`}>
            {fundamentalScore}%
          </div>
          <div className="text-xs text-gray-400">Fundamental</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-bold ${getScoreColor(sentimentScore)}`}>
            {sentimentScore}%
          </div>
          <div className="text-xs text-gray-400">Sentiment</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-purple-400">
            {riskRewardRatio.toFixed(1)}:1
          </div>
          <div className="text-xs text-gray-400">R:R</div>
        </div>
      </div>

      {/* Technical Indicators Summary */}
      {Object.keys(technicalIndicators).length > 0 && (
        <div className="mb-4 p-3 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Technical Indicators</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {technicalIndicators.rsi_14 && (
              <div className="flex justify-between">
                <span className="text-gray-400">RSI (14):</span>
                <span className={`${technicalIndicators.rsi_14 > 70 ? 'text-red-400' : 
                  technicalIndicators.rsi_14 < 30 ? 'text-emerald-400' : 'text-white'}`}>
                  {technicalIndicators.rsi_14.toFixed(1)}
                </span>
              </div>
            )}
            {technicalIndicators.ema_50 && technicalIndicators.ema_200 && (
              <div className="flex justify-between">
                <span className="text-gray-400">EMA Trend:</span>
                <span className={technicalIndicators.ema_50 > technicalIndicators.ema_200 ? 'text-emerald-400' : 'text-red-400'}>
                  {technicalIndicators.ema_50 > technicalIndicators.ema_200 ? 'Bullish' : 'Bearish'}
                </span>
              </div>
            )}
            {technicalIndicators.macd_histogram !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">MACD:</span>
                <span className={technicalIndicators.macd_histogram > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {technicalIndicators.macd_histogram > 0 ? 'Bullish' : 'Bearish'}
                </span>
              </div>
            )}
            {technicalIndicators.atr_14 && (
              <div className="flex justify-between">
                <span className="text-gray-400">ATR (14):</span>
                <span className="text-white">{technicalIndicators.atr_14.toFixed(5)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pattern Detection */}
      {signal.pattern_detected && (
        <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-4 w-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">Chart Pattern Detected</span>
          </div>
          <div className="text-white text-sm">{signal.pattern_detected}</div>
        </div>
      )}

      {/* Economic Impact */}
      {signal.economic_impact && (
        <div className="mb-4 p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Economic Impact</span>
          </div>
          <div className="text-white text-sm">{signal.economic_impact}</div>
        </div>
      )}

      {/* Price Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Entry Price</span>
          <span className="text-white font-mono">{formatPrice(signal.entryPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Stop Loss</span>
          <span className="text-red-400 font-mono">{formatPrice(signal.stopLoss)}</span>
        </div>
        
        {/* Enhanced Take Profit Levels */}
        <div className="space-y-1">
          <span className="text-gray-400 text-sm">Take Profit Levels</span>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-emerald-400 text-xs">TP1 (15 pips)</span>
              <span className="text-emerald-400 font-mono text-sm">{formatPrice(signal.takeProfit1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-300 text-xs">TP2 (25 pips)</span>
              <span className="text-emerald-300 font-mono text-sm">{formatPrice(signal.takeProfit2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-200 text-xs">TP3 (40 pips)</span>
              <span className="text-emerald-200 font-mono text-sm">{formatPrice(signal.takeProfit3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Chart */}
      <div className="mb-4">
        <RealTimeChart
          priceData={signal.chartData || []}
          signalType={signal.type}
          currentPrice={parseFloat(signal.entryPrice)}
          isConnected={true}
          entryPrice={parseFloat(signal.entryPrice)}
          isLoading={false}
        />
      </div>

      {/* Enhanced Analysis */}
      <div className="space-y-3">
        <div className="p-3 bg-black/20 rounded-lg">
          <p className="text-gray-300 text-sm leading-relaxed">
            {signal.analysisText}
          </p>
        </div>

        {analysis[signal.id] && (
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Additional AI Analysis</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {analysis[signal.id]}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>{formatTime(signal.timestamp)}</span>
          </div>
          <Button
            onClick={onGetAIAnalysis}
            disabled={analyzingSignal === signal.id}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {analyzingSignal === signal.id ? (
              <>
                <div className="animate-spin h-3 w-3 border border-white/20 border-t-white rounded-full mr-1"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-1" />
                Get AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

SignalCard.displayName = 'SignalCard';

export default SignalCard;
