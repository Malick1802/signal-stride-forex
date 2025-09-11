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

export const tryOpenApp = (url: string, timeout = 1000): Promise<boolean> => {
  return new Promise((resolve) => {
    let opened = false;
    
    // Mobile-optimized approach: direct window.location or window.open
    try {
      // Try direct navigation first (works better on mobile)
      const start = Date.now();
      
      // Use window.open with immediate focus check
      const newWindow = window.open(url, '_self');
      
      // Check if the navigation happened successfully
      const checkTimer = setTimeout(() => {
        if (document.hidden || Date.now() - start > 500) {
          opened = true;
          resolve(true);
        } else {
          resolve(false);
        }
      }, timeout);
      
      // Backup: listen for visibility change (app switch)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          opened = true;
          clearTimeout(checkTimer);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          resolve(true);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup after timeout
      setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (!opened) {
          resolve(false);
        }
      }, timeout);
      
    } catch (error) {
      console.log('Protocol not supported or app not installed');
      resolve(false);
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
  
  onStatus?.('Checking for MetaTrader apps...');
  
  // Try MT5 first
  const mt5Available = await tryOpenApp(urls.mt5, 1500);
  if (mt5Available) {
    onStatus?.('Opening MetaTrader 5...');
    return;
  }
  
  // Try MT4 next
  const mt4Available = await tryOpenApp(urls.mt4, 1500);
  if (mt4Available) {
    onStatus?.('Opening MetaTrader 4...');
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