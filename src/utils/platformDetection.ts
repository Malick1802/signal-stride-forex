import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  userAgent: string;
}

export const getPlatformInfo = (): PlatformInfo => {
  const isNative = Capacitor.isNativePlatform();
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(userAgent) || Capacitor.getPlatform() === 'android';
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || Capacitor.getPlatform() === 'ios';
  const isMobile = isAndroid || isIOS || window.innerWidth < 768;
  const isDesktop = !isMobile;
  const isWeb = !isNative;

  return {
    isNative,
    isMobile,
    isAndroid,
    isIOS,
    isDesktop,
    isWeb,
    userAgent
  };
};

export const getStoreUrls = () => {
  const platform = getPlatformInfo();
  
  return {
    mt4: {
      android: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader4',
      ios: 'https://apps.apple.com/app/metatrader-4/id496212596',
      web: 'https://www.metatrader4.com/en/trading-platform/web-trader'
    },
    mt5: {
      android: 'https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5',
      ios: 'https://apps.apple.com/app/metatrader-5/id413251709',
      web: 'https://www.metatrader5.com/en/trading-platform/web-trader'
    }
  };
};