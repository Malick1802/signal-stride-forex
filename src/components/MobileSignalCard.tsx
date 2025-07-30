import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MobileOptimizedChart } from './MobileOptimizedChart';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface MobileSignalCardProps {
  signal: {
    id: string;
    currency_pair: string;
    signal_type: 'buy' | 'sell';
    entry_price: number;
    target_price: number;
    stop_loss_price: number;
    status: 'active' | 'completed' | 'expired';
    confidence: number;
    created_at: string;
    outcome?: 'profit' | 'loss' | null;
    pips_result?: number;
  };
  priceData?: Array<{
    timestamp: number;
    time: string;
    price: number;
  }>;
  currentPrice?: number;
  isLoading?: boolean;
}

export const MobileSignalCard: React.FC<MobileSignalCardProps> = ({
  signal,
  priceData = [],
  currentPrice,
  isLoading = false
}) => {
  const { triggerHaptic } = useNativeFeatures();

  const getSignalIcon = () => {
    return signal.signal_type === 'buy' ? TrendingUp : TrendingDown;
  };

  const getSignalColor = () => {
    if (signal.outcome === 'profit') return 'text-green-500';
    if (signal.outcome === 'loss') return 'text-red-500';
    return signal.signal_type === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  const getStatusBadgeVariant = () => {
    switch (signal.status) {
      case 'active': return 'default';
      case 'completed': return signal.outcome === 'profit' ? 'success' : 'destructive';
      case 'expired': return 'secondary';
      default: return 'default';
    }
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(5);
  };

  const formatPips = (pips: number): string => {
    return `${pips > 0 ? '+' : ''}${pips.toFixed(1)} pips`;
  };

  const handleCardPress = () => {
    triggerHaptic('Light');
  };

  const SignalIcon = getSignalIcon();

  return (
    <Card 
      className="mb-4 border-border/50 bg-card/50 backdrop-blur-sm"
      onClick={handleCardPress}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SignalIcon className={`h-5 w-5 ${getSignalColor()}`} />
            <span className="font-semibold text-foreground">
              {signal.currency_pair}
            </span>
            <Badge variant={getStatusBadgeVariant()} className="text-xs">
              {signal.status}
            </Badge>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-mono text-foreground">
              {currentPrice ? formatPrice(currentPrice) : formatPrice(signal.entry_price)}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(signal.created_at).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-3">
          <MobileOptimizedChart
            data={priceData}
            pair={signal.currency_pair}
            currentPrice={currentPrice}
            entryPrice={signal.entry_price}
            isLoading={isLoading}
            height={150}
          />
        </div>

        {/* Signal Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">Target</div>
                <div className="font-mono text-green-500">
                  {formatPrice(signal.target_price)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-xs text-muted-foreground">Stop Loss</div>
                <div className="font-mono text-red-500">
                  {formatPrice(signal.stop_loss_price)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outcome */}
        {signal.outcome && signal.pips_result !== undefined && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Result:</span>
              <div className={`text-sm font-medium ${
                signal.outcome === 'profit' ? 'text-green-500' : 'text-red-500'
              }`}>
                {signal.outcome === 'profit' ? '✅' : '❌'} {formatPips(signal.pips_result)}
              </div>
            </div>
          </div>
        )}

        {/* Confidence Indicator */}
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                {signal.confidence}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};