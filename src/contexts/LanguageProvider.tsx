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

        if (profile && (profile as any).language_preference && SUPPORTED_LANGUAGES[(profile as any).language_preference as keyof typeof SUPPORTED_LANGUAGES]) {
          await changeLanguage((profile as any).language_preference);
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
        console.log('🌍 Attempting IP-based language detection...');
        const { data, error } = await supabase.functions.invoke('detect-user-location');
        
        console.log('🌍 IP detection result:', { data, error });
        
        if (!error && data?.language && SUPPORTED_LANGUAGES[data.language as keyof typeof SUPPORTED_LANGUAGES]) {
          console.log(`🌍 Detected language: ${data.language}`);
          await changeLanguage(data.language);
          return;
        }
        
        // Fallback to country mapping
        if (!error && data?.country && COUNTRY_TO_LANGUAGE[data.country]) {
          const detectedLang = COUNTRY_TO_LANGUAGE[data.country];
          console.log(`🌍 Detected country: ${data.country}, mapped to language: ${detectedLang}`);
          if (SUPPORTED_LANGUAGES[detectedLang as keyof typeof SUPPORTED_LANGUAGES]) {
            console.log(`🌍 Setting language to: ${detectedLang}`);
            await changeLanguage(detectedLang);
            return;
          }
        }
      } catch (error) {
        console.warn('🌍 IP detection failed, using browser language:', error);
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
      // Update i18n immediately
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', language);
      
      // Save to user profile if authenticated
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: language } as any)
          .eq('id', user.id);
        
        if (error) {
          console.warn('Failed to save language preference to profile:', error);
        }
      }
      
      // Small delay then reload to ensure state is saved
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Initial language detection
  useEffect(() => {
    // Clear old detection flag and run detection if needed
    const savedLanguage = localStorage.getItem('i18nextLng');
    console.log('🌍 Current saved language:', savedLanguage);
    
    // Run detection if no language is saved or if it's still English
    if (!savedLanguage || savedLanguage === 'en') {
      console.log('🌍 Running language detection...');
      detectAndSetLanguage();
    } else {
      console.log('🌍 Using saved language:', savedLanguage);
    }
  }, []);

  // Also run when user state changes
  useEffect(() => {
    if (user && currentLanguage === 'en') {
      detectAndSetLanguage();
    }
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