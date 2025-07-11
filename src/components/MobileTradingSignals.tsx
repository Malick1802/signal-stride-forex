import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PullToRefresh } from './PullToRefresh';
import TradingSignals from './TradingSignals';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';

const MobileTradingSignals: React.FC = () => {
  const { fetchSignals } = useTradingSignals();
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      await fetchSignals();
      toast({
        title: "Refreshed",
        description: "Trading signals updated successfully",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh signals. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mobile-signals-container">
      <ScrollArea className="h-full">
        <PullToRefresh 
          onRefresh={handleRefresh}
          className="mobile-scroll-container"
        >
          <TradingSignals />
        </PullToRefresh>
      </ScrollArea>
    </div>
  );
};

export default MobileTradingSignals;