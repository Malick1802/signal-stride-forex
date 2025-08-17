import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'button' | 'icon' | 'minimal';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'button',
  className = ''
}) => {
  const { t } = useTranslation('common');
  const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (language: string) => {
    try {
      await changeLanguage(language);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLangData = availableLanguages[currentLanguage as keyof typeof availableLanguages];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-2 bg-background/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 hover:text-white transition-all duration-200 ${className}`}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLangData?.flag}</span>
          <span className="text-xs uppercase font-medium">{currentLanguage}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[90vw] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5" />
            {t('language.select') || 'Select Language'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(availableLanguages).map(([code, lang]) => (
            <Button
              key={code}
              variant={currentLanguage === code ? "default" : "ghost"}
              className="justify-start gap-3 h-auto min-h-[3rem] p-3 text-left"
              onClick={() => handleLanguageChange(code)}
            >
              <span className="text-lg flex-shrink-0">{lang.flag}</span>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-medium text-sm truncate w-full">{lang.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{code}</span>
              </div>
              {currentLanguage === code && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};