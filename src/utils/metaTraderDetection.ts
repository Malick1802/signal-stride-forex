import { getPlatformInfo, getStoreUrls } from './platformDetection';

export interface MetaTraderUrls {
  mt5: string;
  mt4: string;
}

export const generateMetaTraderUrls = (pair: string, type: string): MetaTraderUrls => {
  const action = type === 'BUY' ? 'buy' : 'sell';
  
  return {
    mt5: `mt5://trade?symbol=${pair}&action=${action}`,
    mt4: `mt4://trade?symbol=${pair}&action=${action}`
  };
};

export const tryOpenApp = (url: string, timeout = 2500): Promise<boolean> => {
  return new Promise((resolve) => {
    let opened = false;
    let checkTimer: NodeJS.Timeout;
    let cleanupTimer: NodeJS.Timeout;
    
    const cleanup = () => {
      if (checkTimer) clearTimeout(checkTimer);
      if (cleanupTimer) clearTimeout(cleanupTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('blur', handleBlur);
    };
    
    const handleSuccess = () => {
      if (!opened) {
        opened = true;
        cleanup();
        resolve(true);
      }
    };
    
    const handleFailure = () => {
      if (!opened) {
        opened = true;
        cleanup();
        resolve(false);
      }
    };
    
    // Multiple detection methods for better reliability
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSuccess();
      }
    };
    
    const handlePageHide = () => {
      handleSuccess();
    };
    
    const handleBlur = () => {
      // Small delay to avoid false positives
      setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          handleSuccess();
        }
      }, 100);
    };
    
    try {
      const start = Date.now();
      
      // Try to open the app
      window.location.href = url;
      
      // Set up event listeners for app switch detection
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('pagehide', handlePageHide);
      window.addEventListener('blur', handleBlur);
      
      // Quick check for immediate response
      checkTimer = setTimeout(() => {
        if (document.hidden || !document.hasFocus() || Date.now() - start > 1000) {
          handleSuccess();
        }
      }, 500);
      
      // Final timeout
      cleanupTimer = setTimeout(() => {
        handleFailure();
      }, timeout);
      
    } catch (error) {
      console.log('Protocol not supported or app not installed');
      handleFailure();
    }
  });
};

export const handleMetaTraderRedirect = async (
  pair: string, 
  type: string,
  onStatus?: (status: string) => void
): Promise<void> => {
  const platform = getPlatformInfo();
  const urls = generateMetaTraderUrls(pair, type);
  const stores = getStoreUrls();
  
  onStatus?.('Checking for MetaTrader 4...');
  
  // Try MT4 first (user preference)
  const mt4Available = await tryOpenApp(urls.mt4, 2500);
  if (mt4Available) {
    onStatus?.('Opening MetaTrader 4...');
    return;
  }
  
  // Try MT5 as backup
  onStatus?.('Trying MetaTrader 5...');
  const mt5Available = await tryOpenApp(urls.mt5, 2500);
  if (mt5Available) {
    onStatus?.('Opening MetaTrader 5...');
    return;
  }
  
  // No apps available, redirect to store or web
  onStatus?.('Redirecting to store...');
  
  let fallbackUrl: string;
  
  if (platform.isAndroid) {
    fallbackUrl = stores.mt4.android;
  } else if (platform.isIOS) {
    fallbackUrl = stores.mt4.ios;
  } else {
    fallbackUrl = stores.mt4.web;
  }
  
  window.open(fallbackUrl, '_blank');
  onStatus?.('Redirected to MetaTrader download page');
};