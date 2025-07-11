
import React, { lazy } from 'react';
import LazyLoadingWrapper from './LazyLoadingWrapper';
import { useIsMobile } from '@/hooks/use-mobile';

const TradingSignals = lazy(() => import('./TradingSignals'));
const MobileTradingSignals = lazy(() => import('./MobileTradingSignals'));

const LazyTradingSignals: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <LazyLoadingWrapper height={isMobile ? "h-full" : "h-96"}>
      {isMobile ? <MobileTradingSignals /> : <TradingSignals />}
    </LazyLoadingWrapper>
  );
};

export default LazyTradingSignals;
