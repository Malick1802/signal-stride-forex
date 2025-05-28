
import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SignalPriceDetailsProps {
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  currentPrice: number | null;
  signalType: string;
  targetsHit: number[];
}

const SignalPriceDetails = ({
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  currentPrice,
  signalType,
  targetsHit
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
    // Show checkmark if target was permanently hit OR currently being hit
    return isTargetPermanentlyHit(targetLevel) || isTakeProfitCurrentlyHit(takeProfitPrice);
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
          <span className="text-red-400 font-mono">{stopLoss}</span>
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
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Target 1</span>
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-mono">{takeProfit1}</span>
            {shouldShowCheckmark(1, takeProfit1) && (
              <Check className={`h-4 w-4 ${isTargetPermanentlyHit(1) ? 'text-emerald-400' : 'text-emerald-300'}`} />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(takeProfit1, 'Target 1')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Target 2</span>
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-mono">{takeProfit2}</span>
            {shouldShowCheckmark(2, takeProfit2) && (
              <Check className={`h-4 w-4 ${isTargetPermanentlyHit(2) ? 'text-emerald-400' : 'text-emerald-300'}`} />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(takeProfit2, 'Target 2')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Target 3</span>
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-mono">{takeProfit3}</span>
            {shouldShowCheckmark(3, takeProfit3) && (
              <Check className={`h-4 w-4 ${isTargetPermanentlyHit(3) ? 'text-emerald-400' : 'text-emerald-300'}`} />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(takeProfit3, 'Target 3')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalPriceDetails;
