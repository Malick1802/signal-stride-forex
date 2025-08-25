
import React from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SignalActionsProps {
  pair: string;
  type: string;
  timestamp: string;
}

const SignalActions = ({ pair, type, timestamp }: SignalActionsProps) => {
  const { toast } = useToast();

  const openMetaTrader = () => {
    const metaTraderUrl = `mt4://trade?symbol=${pair}&action=${type === 'BUY' ? 'buy' : 'sell'}`;
    window.open(metaTraderUrl, '_blank');
    
    toast({
      title: "Opening MetaTrader",
      description: `Opening ${pair} ${type} in MetaTrader`,
    });
  };

  return (
    <div className="pt-3 border-t border-white/10">
      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex items-center space-x-1 text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      
      <Button
        onClick={openMetaTrader}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Trade Now in MetaTrader
      </Button>
    </div>
  );
};

export default SignalActions;
