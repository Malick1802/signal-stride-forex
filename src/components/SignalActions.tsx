
import React, { useState } from 'react';
import { Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { handleMetaTraderRedirect } from '@/utils/metaTraderDetection';

interface SignalActionsProps {
  pair: string;
  type: string;
  timestamp: string;
}

const SignalActions = ({ pair, type, timestamp }: SignalActionsProps) => {
  const { toast } = useToast();
  const { triggerHaptic, triggerSuccessHaptic, triggerErrorHaptic } = useNativeFeatures();
  const [isLoading, setIsLoading] = useState(false);

  const openMetaTrader = async () => {
    setIsLoading(true);
    await triggerHaptic('Light');
    
    try {
      await handleMetaTraderRedirect(
        pair,
        type,
        (status) => {
          // Show status updates to user
          if (status.includes('Opening')) {
            triggerSuccessHaptic();
            toast({
              title: "Opening MetaTrader",
              description: `${status} for ${pair} ${type}`,
            });
          }
        }
      );
    } catch (error) {
      await triggerErrorHaptic();
      toast({
        title: "Error",
        description: "Failed to open MetaTrader. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
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
        disabled={isLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4 mr-2" />
        )}
        {isLoading ? 'Opening MetaTrader...' : 'Trade Now in MetaTrader'}
      </Button>
    </div>
  );
};

export default SignalActions;
