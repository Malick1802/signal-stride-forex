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
      console.log('🌍 Starting language detection...');
      
      // First check if user has a saved preference
      if (user) {
        console.log('👤 Checking user profile for language preference...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('language_preference')
          .eq('id', user.id)
          .single();

        console.log('👤 User profile data:', profile);
        if (profile && (profile as any).language_preference && SUPPORTED_LANGUAGES[(profile as any).language_preference as keyof typeof SUPPORTED_LANGUAGES]) {
          console.log('✅ Using saved user preference:', (profile as any).language_preference);
          await changeLanguage((profile as any).language_preference);
          return;
        }
      }

      // Check localStorage
      const savedLanguage = localStorage.getItem('i18nextLng');
      console.log('💾 Checking localStorage for saved language:', savedLanguage);
      if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage as keyof typeof SUPPORTED_LANGUAGES]) {
        console.log('✅ Using localStorage language:', savedLanguage);
        await changeLanguage(savedLanguage);
        return;
      }

      // Try to detect from IP geolocation
      try {
        console.log('🌍 Calling detect-user-location function...');
        const { data, error } = await supabase.functions.invoke('detect-user-location');
        console.log('🌍 Location detection result:', { data, error });
        
        if (error) {
          console.error('🌍 IP detection error:', error);
        }
        
        if (!error && data?.language && SUPPORTED_LANGUAGES[data.language as keyof typeof SUPPORTED_LANGUAGES]) {
          console.log('✅ Setting language from IP detection:', data.language);
          await changeLanguage(data.language);
          return;
        } else {
          console.log('⚠️ IP detection failed or unsupported language:', data?.language);
        }
      } catch (error) {
        console.error('❌ Failed to detect location:', error);
      }

      // Fallback to browser language
      const browserLang = navigator.language.split('-')[0];
      console.log('🌐 Trying browser language:', browserLang);
      if (SUPPORTED_LANGUAGES[browserLang as keyof typeof SUPPORTED_LANGUAGES]) {
        console.log('✅ Using browser language:', browserLang);
        await changeLanguage(browserLang);
      } else {
        console.log('⚠️ Browser language not supported, staying with:', currentLanguage);
      }
    } catch (error) {
      console.error('❌ Error detecting language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      console.log('🔄 Changing language to:', language);
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', language);
      console.log('💾 Saved language to localStorage:', language);
      
      // Save to user profile if authenticated
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: language } as any)
          .eq('id', user.id);
        
        if (error) {
          console.warn('Failed to save language preference to profile:', error);
        } else {
          console.log('✅ Saved language preference to profile:', language);
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Initial language detection
  useEffect(() => {
    console.log('🌍 LanguageProvider: Initial language detection triggered. User:', user?.email || 'none');
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