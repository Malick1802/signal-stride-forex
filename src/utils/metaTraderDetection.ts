import { getPlatformInfo, getStoreUrls } from './platformDetection';

export interface MetaTraderUrls {
  mt5: string;
  mt4: string;
  android: {
    mt5: string;
    mt4: string;
  };
}

const buildAndroidIntent = (
  scheme: 'mt4' | 'mt5',
  pkg: string,
  path: string,
  query: string,
  fallbackUrl: string
) => {
  // Example: intent://trade?symbol=EURUSD&action=buy#Intent;scheme=mt4;package=net.metaquotes.metatrader4;S.browser_fallback_url=<encoded_play_store>;end
  const encodedFallback = encodeURIComponent(fallbackUrl);
  return `intent://${path}?${query}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${encodedFallback};end`;
};

export const generateMetaTraderUrls = (pair: string, type: string): MetaTraderUrls => {
  const action = (type || '').toUpperCase() === 'BUY' ? 'buy' : 'sell';
  const encPair = encodeURIComponent(pair);
  const query = `symbol=${encPair}&action=${action}`;
  const stores = getStoreUrls();

  return {
    mt5: `mt5://trade?${query}`,
    mt4: `mt4://trade?${query}`,
    android: {
      mt5: buildAndroidIntent('mt5', 'net.metaquotes.metatrader5', 'trade', query, stores.mt5.android),
      mt4: buildAndroidIntent('mt4', 'net.metaquotes.metatrader4', 'trade', query, stores.mt4.android),
    },
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
      window.removeEventListener('blur', handleBlur);
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

      // Try to open the app (intent:// for Android, mt4/mt5:// otherwise)
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

  if (platform.isAndroid) {
    onStatus?.('Checking for MetaTrader 4...');

    // Prefer MT4 on Android using intent:// with Play Store fallback
    const mt4Available = await tryOpenApp(urls.android.mt4, 3000);
    if (mt4Available) {
      onStatus?.('Opening MetaTrader 4...');
      return;
    }

    onStatus?.('Trying MetaTrader 5...');
    const mt5Available = await tryOpenApp(urls.android.mt5, 3000);
    if (mt5Available) {
      onStatus?.('Opening MetaTrader 5...');
      return;
    }

    // As a final fallback (in case intent fallback didn’t trigger)
    onStatus?.('Redirecting to store...');
    window.open(stores.mt4.android, '_blank');
    onStatus?.('Redirected to MetaTrader download page');
    return;
  }

  // iOS / Web: use custom schemes first, then fallback
  onStatus?.('Checking for MetaTrader 4...');
  const mt4Available = await tryOpenApp(urls.mt4, 2500);
  if (mt4Available) {
    onStatus?.('Opening MetaTrader 4...');
    return;
  }

  onStatus?.('Trying MetaTrader 5...');
  const mt5Available = await tryOpenApp(urls.mt5, 2500);
  if (mt5Available) {
    onStatus?.('Opening MetaTrader 5...');
    return;
  }

  // No apps available, redirect to store or web
  onStatus?.('Redirecting to store...');
  let fallbackUrl: string;

  if (platform.isIOS) {
    fallbackUrl = stores.mt4.ios;
  } else {
    fallbackUrl = stores.mt4.web;
  }

  window.open(fallbackUrl, '_blank');
  onStatus?.('Redirected to MetaTrader download page');
};
