import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  pt: { name: 'Português', flag: '🇧🇷' },
  ja: { name: '日本語', flag: '🇯🇵' },
  zh: { name: '中文', flag: '🇨🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' }
};

export const RTL_LANGUAGES = ['ar'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    resources: {
      en: {
        common: {
          nav: {
            signals: "Signals",
            expired: "Expired", 
            tools: "Tools",
            profile: "Profile",
            settings: "Settings",
            logout: "Logout"
          },
          actions: {
            loading: "Loading...",
            refresh: "Refresh",
            retry: "Try Again"
          }
        },
        signals: {
          title: "Trading Signals",
          noSignals: "No signals available",
          loading: "Loading signals..."
        },
        dashboard: {
          welcome: "Welcome to ForexAlert Pro",
          stats: {
            activeSignals: "Active Signals"
          }
        },
        landing: {
          hero: {
            title: "Premium Forex Trading Signals",
            subtitle: "AI-powered trading signals"
          }
        },
        auth: {
          login: "Sign In",
          signup: "Sign Up"
        }
      }
    },

    react: {
      useSuspense: false,
    },

    defaultNS: 'common',
    ns: ['common', 'landing', 'dashboard', 'auth', 'signals'],
  });

export default i18n;