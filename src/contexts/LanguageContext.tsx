import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '@/i18n';

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
  changeLanguage: (language: string) => Promise<void>;
  isRTL: boolean;
  detectAndSetLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

// Country to language mapping
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  'US': 'en', 'GB': 'en', 'AU': 'en', 'CA': 'en', 'IE': 'en', 'NZ': 'en',
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'VE': 'es', 'PE': 'es',
  'FR': 'fr', 'BE': 'fr', 'CH': 'fr',
  'DE': 'de', 'AT': 'de',
  'BR': 'pt', 'PT': 'pt',
  'JP': 'ja',
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'SG': 'zh',
  'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'JO': 'ar', 'LB': 'ar'
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(RTL_LANGUAGES.includes(currentLanguage));
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  const detectAndSetLanguage = async () => {
    try {
      // First check if user has a saved preference
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language_preference')
          .eq('id', user.id)
          .single();

        if (profile?.language_preference && SUPPORTED_LANGUAGES[profile.language_preference as keyof typeof SUPPORTED_LANGUAGES]) {
          await changeLanguage(profile.language_preference);
          return;
        }
      }

      // Check localStorage
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage as keyof typeof SUPPORTED_LANGUAGES]) {
        await changeLanguage(savedLanguage);
        return;
      }

      // Try to detect from IP geolocation
      try {
        const { data, error } = await supabase.functions.invoke('detect-user-location');
        if (!error && data?.language && SUPPORTED_LANGUAGES[data.language as keyof typeof SUPPORTED_LANGUAGES]) {
          await changeLanguage(data.language);
          return;
        }
      } catch (error) {
        console.warn('Failed to detect location:', error);
      }

      // Fallback to browser language
      const browserLang = navigator.language.split('-')[0];
      if (SUPPORTED_LANGUAGES[browserLang as keyof typeof SUPPORTED_LANGUAGES]) {
        await changeLanguage(browserLang);
      }
    } catch (error) {
      console.error('Error detecting language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', language);
      
      // Save to user profile if authenticated
      if (user) {
        await supabase
          .from('profiles')
          .update({ language_preference: language })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Initial language detection
  useEffect(() => {
    detectAndSetLanguage();
  }, [user]);

  const contextValue: LanguageContextType = {
    currentLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    isRTL,
    detectAndSetLanguage
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};