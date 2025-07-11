
import React, { lazy } from 'react';
import LazyLoadingWrapper from './LazyLoadingWrapper';

const TradingSignals = lazy(() => import('./TradingSignals'));

const LazyTradingSignals: React.FC = () => {
  return (
    <LazyLoadingWrapper height="h-96">
      <TradingSignals />
    </LazyLoadingWrapper>
  );
};

export default LazyTradingSignals;
