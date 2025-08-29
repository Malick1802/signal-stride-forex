import React, { useState, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target,
  Clock,
  BarChart3,
  Zap
} from 'lucide-react';

interface ProfessionalSignalData {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  stop_loss: number;
  take_profits: number[];
  targets_hit?: number[];
  
  // Professional features
  tier_level?: number;
  professional_grade?: boolean;
  technical_score?: number;
  fundamental_score?: number;
  sentiment_score?: number;
  risk_reward_ratio?: number;
  expected_duration_hours?: number;
  pattern_detected?: string;
  market_regime?: string;
  volatility_profile?: string;
  
  // Enhanced data
  technical_indicators?: any;
  market_context?: any;
  fibonacci_entry?: number;
  fibonacci_targets?: number[];
  session_optimal?: boolean;
  multi_timeframe_confirmed?: boolean;
  correlation_checked?: boolean;
  news_impact_assessed?: boolean;
  
  created_at: string;
  analysis_text?: string;
}

interface ProfessionalSignalCardProps {
  signal: ProfessionalSignalData;
  currentPrice?: number;
  analysis?: string;
}

const ProfessionalSignalCard = memo(({ signal, currentPrice, analysis }: ProfessionalSignalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTechnicals, setShowTechnicals] = useState(false);
  const [showRiskMgmt, setShowRiskMgmt] = useState(false);

  if (!signal) return null;

  const getTierBadge = (tier: number = 1) => {
    const colors = {
      1: 'bg-gray-500/20 text-gray-300',
      2: 'bg-blue-500/20 text-blue-300',
      3: 'bg-purple-500/20 text-purple-300'
    };
    
    return (
      <Badge className={`${colors[tier as keyof typeof colors]} text-xs`}>
        Tier {tier}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const calculatePnL = () => {
    if (!currentPrice) return { pips: 0, percentage: 0 };
    
    const entryPrice = signal.price;
    const priceDiff = signal.type === 'BUY' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const pips = Math.round(priceDiff * 10000);
    const percentage = (priceDiff / entryPrice) * 100;
    
    return { pips, percentage };
  };

  const { pips, percentage } = calculatePnL();

  return (
    <Card className="bg-background/95 backdrop-blur-sm border border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground">
                {signal.symbol}
              </h3>
              {getTierBadge(signal.tier_level)}
              {signal.professional_grade && (
                <Badge className="bg-gold/20 text-gold text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  PRO
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant={signal.type === 'BUY' ? 'default' : 'secondary'}
                className={`${signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
              >
                {signal.type === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {signal.type}
              </Badge>
              
              <span className={`text-sm font-medium ${getConfidenceColor(signal.confidence)}`}>
                {signal.confidence}% confidence
              </span>
            </div>
          </div>

          {currentPrice && (
            <div className="text-right">
              <div className={`text-lg font-bold ${pips >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pips >= 0 ? '+' : ''}{pips} pips
              </div>
              <div className={`text-sm ${percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {/* Quality Indicators */}
        <div className="flex flex-wrap gap-2 mt-3">
          {signal.session_optimal && (
            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
              Optimal Session
            </Badge>
          )}
          {signal.multi_timeframe_confirmed && (
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">
              Multi-TF Confirmed
            </Badge>
          )}
          {signal.correlation_checked && (
            <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/30">
              Correlation Safe
            </Badge>
          )}
          {signal.news_impact_assessed && (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
              News Assessed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Levels */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
            <div className="font-mono text-sm">{signal.price.toFixed(5)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
            <div className="font-mono text-sm text-red-400">{signal.stop_loss.toFixed(5)}</div>
          </div>
        </div>

        {/* Take Profit Levels */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Take Profit Levels</div>
          <div className="grid grid-cols-3 gap-2">
            {signal.take_profits.slice(0, 3).map((tp, index) => (
              <div 
                key={index}
                className={`text-center p-2 rounded border ${
                  signal.targets_hit?.includes(index + 1) 
                    ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="text-xs text-muted-foreground">TP{index + 1}</div>
                <div className="font-mono text-xs">{tp.toFixed(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Professional Metrics */}
        {(signal.risk_reward_ratio || signal.expected_duration_hours) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
            {signal.risk_reward_ratio && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">R:R</span>
                <span className="text-sm font-medium">1:{signal.risk_reward_ratio.toFixed(1)}</span>
              </div>
            )}
            {signal.expected_duration_hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{signal.expected_duration_hours}h</span>
              </div>
            )}
          </div>
        )}

        {/* Pattern & Market Context */}
        {(signal.pattern_detected || signal.market_regime) && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            {signal.pattern_detected && (
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">Pattern: {signal.pattern_detected}</span>
              </div>
            )}
            {signal.market_regime && (
              <div className="text-xs text-muted-foreground">
                Market Regime: <span className="text-foreground">{signal.market_regime}</span>
              </div>
            )}
          </div>
        )}

        {/* Technical Analysis Details */}
        <Collapsible open={showTechnicals} onOpenChange={setShowTechnicals}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">Technical Analysis</span>
              </div>
              {showTechnicals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Scores */}
            <div className="grid grid-cols-3 gap-3">
              {signal.technical_score !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Technical</div>
                  <div className="text-sm font-medium">{signal.technical_score}/100</div>
                </div>
              )}
              {signal.fundamental_score !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Fundamental</div>
                  <div className="text-sm font-medium">{signal.fundamental_score}/100</div>
                </div>
              )}
              {signal.sentiment_score !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Sentiment</div>
                  <div className="text-sm font-medium">{signal.sentiment_score}/100</div>
                </div>
              )}
            </div>

            {/* Fibonacci Levels */}
            {signal.fibonacci_entry && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fibonacci Entry</div>
                <div className="font-mono text-sm">{signal.fibonacci_entry.toFixed(5)}</div>
              </div>
            )}

            {/* Analysis Text */}
            {signal.analysis_text && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Analysis</div>
                <div className="text-xs bg-muted/30 rounded p-2 max-h-20 overflow-y-auto">
                  {signal.analysis_text}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Risk Management */}
        <Collapsible open={showRiskMgmt} onOpenChange={setShowRiskMgmt}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-orange-400">Risk Management</span>
              </div>
              {showRiskMgmt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3">
            <div className="text-xs bg-orange-500/10 rounded p-2">
              <div className="mb-1">• Recommended risk: 1-2% of account</div>
              <div className="mb-1">• Stop loss: {Math.abs(((signal.stop_loss - signal.price) / signal.price) * 100).toFixed(1)}%</div>
              <div>• Consider position sizing based on volatility</div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
          Created: {new Date(signal.created_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
});

ProfessionalSignalCard.displayName = 'ProfessionalSignalCard';

export default ProfessionalSignalCard;