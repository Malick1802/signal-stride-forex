
import React, { lazy } from 'react';
import LazyLoadingWrapper from './LazyLoadingWrapper';

const ExpiredSignals = lazy(() => import('./ExpiredSignals'));

const LazyExpiredSignals: React.FC = () => {
  return (
    <LazyLoadingWrapper height="h-96">
      <ExpiredSignals />
    </LazyLoadingWrapper>
  );
};

export default LazyExpiredSignals;
