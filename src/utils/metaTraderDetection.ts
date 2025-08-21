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

export const tryOpenApp = (url: string, timeout = 2000): Promise<boolean> => {
  return new Promise((resolve) => {
    const start = Date.now();
    let opened = false;
    
    // Create a hidden iframe to attempt the protocol
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    // Set up blur listener (app opened)
    const handleBlur = () => {
      opened = true;
      resolve(true);
      cleanup();
    };
    
    // Set up timeout (app not available)
    const timer = setTimeout(() => {
      if (!opened) {
        resolve(false);
        cleanup();
      }
    }, timeout);
    
    const cleanup = () => {
      window.removeEventListener('blur', handleBlur);
      clearTimeout(timer);
      document.body.removeChild(iframe);
    };
    
    window.addEventListener('blur', handleBlur);
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