
import React from 'react';
import { Copy, CircleCheck, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { calculateStopLossPips, calculateTakeProfitPips } from '@/utils/pipCalculator';

interface SignalPriceDetailsProps {
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  takeProfit4: string;
  takeProfit5: string;
  currentPrice: number | null;
  signalType: string;
  targetsHit: number[];
  pair: string;
}

const SignalPriceDetails = ({
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  takeProfit4,
  takeProfit5,
  currentPrice,
  signalType,
  targetsHit,
  pair
}: SignalPriceDetailsProps) => {
  const { toast } = useToast();

  const isTargetPermanentlyHit = (targetLevel: number): boolean => {
    return targetsHit.includes(targetLevel);
  };

  const isTakeProfitCurrentlyHit = (takeProfitPrice: string): boolean => {
    if (!currentPrice || !takeProfitPrice || takeProfitPrice === '0.00000') return false;
    
    try {
      const tpPrice = parseFloat(takeProfitPrice);
      
      if (signalType === 'BUY') {
        return currentPrice >= tpPrice;
      } else {
        return currentPrice <= tpPrice;
      }
    } catch {
      return false;
    }
  };

  const shouldShowCheckmark = (targetLevel: number, takeProfitPrice: string): boolean => {
    return isTargetPermanentlyHit(targetLevel) || isTakeProfitCurrentlyHit(takeProfitPrice);
  };

  const getTargetStatus = (targetLevel: number, takeProfitPrice: string) => {
    const isPermanentlyHit = isTargetPermanentlyHit(targetLevel);
    const isCurrentlyHit = isTakeProfitCurrentlyHit(takeProfitPrice);
    
    if (isPermanentlyHit) {
      return { 
        text: "HIT ✓", 
        color: "text-emerald-400 font-bold", 
        bgColor: "bg-emerald-500/20",
        icon: <CircleCheck className="h-5 w-5 text-emerald-500 fill-emerald-500" />
      };
    } else if (isCurrentlyHit) {
      return { 
        text: "HITTING", 
        color: "text-yellow-400 font-bold animate-pulse", 
        bgColor: "bg-yellow-500/20",
        icon: <Target className="h-4 w-4 text-yellow-400 animate-pulse" />
      };
    }
    return null;
  };

  const copyToClipboard = async (price: string, label: string) => {
    try {
      await navigator.clipboard.writeText(price);
      toast({
        title: "Copied!",
        description: `${label} (${price}) copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Calculate pip distances from entry price
  const entryPriceFloat = parseFloat(entryPrice);
  const stopLossPips = calculateStopLossPips(entryPriceFloat, parseFloat(stopLoss), pair);
  
  const takeProfits = [
    { 
      level: 1, 
      price: takeProfit1, 
      label: "Target 1",
      pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(takeProfit1), pair)
    },
    { 
      level: 2, 
      price: takeProfit2, 
      label: "Target 2",
      pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(takeProfit2), pair)
    },
    { 
      level: 3, 
      price: takeProfit3, 
      label: "Target 3",
      pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(takeProfit3), pair)
    },
    { 
      level: 4, 
      price: takeProfit4, 
      label: "Target 4",
      pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(takeProfit4), pair)
    },
    { 
      level: 5, 
      price: takeProfit5, 
      label: "Target 5",
      pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(takeProfit5), pair)
    }
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Entry Price</span>
        <div className="flex items-center space-x-2">
          <span className="text-white font-mono">{entryPrice}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(entryPrice, 'Entry Price')}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Stop Loss</span>
        <div className="flex items-center space-x-2">
          <span className="text-red-400 font-mono">
            {stopLoss} <span className="text-gray-500 text-xs">({stopLossPips} pips)</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(stopLoss, 'Stop Loss')}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {takeProfits.map(({ level, price, label, pips }) => {
          const targetStatus = getTargetStatus(level, price);
          
          return (
            <div key={level} className="flex justify-between items-center">
              <span className="text-gray-400">{label}</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-mono">
                    {price} <span className="text-gray-500 text-xs">({pips} pips)</span>
                  </span>
                  {targetStatus && (
                    <div className={`px-2 py-1 rounded-md text-xs ${targetStatus.bgColor} ${targetStatus.color} flex items-center space-x-1`}>
                      {targetStatus.icon}
                      <span>{targetStatus.text}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(price, label)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Targets Hit Summary */}
      {targetsHit.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {targetsHit.length === 1 ? '1 Target Hit' : `${targetsHit.length} Targets Hit`}
            </span>
          </div>
          <div className="text-xs text-emerald-300 mt-1">
            Target{targetsHit.length > 1 ? 's' : ''}: {targetsHit.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalPriceDetails;
