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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (ready) {
      // Small delay to ensure all translations are loaded
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  if (!isReady) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-white text-sm">Loading translations...</p>
        </div>
      </div>
    );
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
};