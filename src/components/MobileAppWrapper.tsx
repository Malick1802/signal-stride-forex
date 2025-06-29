import { useState, useEffect } from 'react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { MobileNotificationManager } from '@/utils/mobileNotifications';

export default function MobileAppWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline, retryConnection } = useMobileConnectivity();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMobileFeatures = async () => {
      console.log('🚀 Initializing ForexAlert Pro mobile features...');
      
      // Initialize native features
      useNativeFeatures();
      
      // Initialize mobile notifications
      const notificationEnabled = await MobileNotificationManager.initialize();
      if (notificationEnabled) {
        console.log('📱 Mobile notifications initialized');
      }
      
      setIsInitialized(true);
      console.log('✅ Mobile app initialization complete');
    };

    initializeMobileFeatures();
  }, []);

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
        <p className="text-gray-400 mb-6">Please check your internet connection and try again.</p>
        <button
          onClick={retryConnection}
          className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
