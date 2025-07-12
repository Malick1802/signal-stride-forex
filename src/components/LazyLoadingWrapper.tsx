
import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string;
}

const LazyLoadingWrapper: React.FC<LazyLoadingWrapperProps> = ({ 
  children, 
  fallback,
  height = "h-64" 
}) => {
  const defaultFallback = (
    <div className={`${height} w-full p-6 space-y-4`}>
      <Skeleton className="h-8 w-3/4 bg-white/10" />
      <Skeleton className="h-4 w-1/2 bg-white/10" />
      <Skeleton className="h-32 w-full bg-white/10" />
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-1/4 bg-white/10" />
        <Skeleton className="h-4 w-1/4 bg-white/10" />
        <Skeleton className="h-4 w-1/4 bg-white/10" />
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyLoadingWrapper;
