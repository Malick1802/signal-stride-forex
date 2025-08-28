import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface TranslationLoaderProps {
  children: React.ReactNode;
  namespaces?: string[];
  fallback?: React.ReactNode;
}

export const TranslationLoader: React.FC<TranslationLoaderProps> = ({ 
  children, 
  namespaces = ['common'], 
  fallback 
}) => {
  const { ready } = useTranslation(namespaces);

  // Since we're using inline translations now, we don't need complex loading
  if (!ready) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-white text-sm">Starting ForexAlert Pro...</p>
        </div>
      </div>
    );
  }

  return <Suspense fallback={fallback || <div>Loading...</div>}>{children}</Suspense>;
};