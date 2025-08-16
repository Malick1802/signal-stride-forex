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

  const TriggerButton = () => {
    return (
      <Button variant="ghost" size="sm" className={`gap-2 text-foreground hover:bg-accent hover:text-accent-foreground ${className}`}>
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLangData?.flag}</span>
        <span className="text-xs uppercase">{currentLanguage}</span>
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div>
          <TriggerButton />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('language.select')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {Object.entries(availableLanguages).map(([code, lang]) => (
            <Button
              key={code}
              variant={currentLanguage === code ? "default" : "ghost"}
              className="justify-start gap-3 h-12"
              onClick={() => handleLanguageChange(code)}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col items-start">
                <span className="font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{code}</span>
              </div>
              {currentLanguage === code && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};