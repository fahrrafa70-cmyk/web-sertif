"use client";

import { useState, memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/language-context';
import { Globe, Check, ChevronUp } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export const LanguageSwitcher = memo(function LanguageSwitcher({ variant = 'default', className }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering language-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = [
    { code: 'en' as const, name: t('language.english'), flag: 'EN' },
    { code: 'id' as const, name: t('language.indonesia'), flag: 'ID' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  if (variant === 'icon-only') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`p-2 hover:bg-gray-100 ${className}`}
            title={t('language.switch')}
          >
            <Globe className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40 z-[100]" side="bottom" sideOffset={8}>
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {language === lang.code && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${className}`}
            suppressHydrationWarning
          >
            {/* CRITICAL FIX: Only show Globe icon, remove emoji to prevent double icon during hydration */}
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline" suppressHydrationWarning>
              {mounted ? currentLanguage?.flag : ''}
            </span>
            <ChevronUp className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40 z-[100]" side="bottom" sideOffset={8}>
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {language === lang.code && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 ${className}`}
          suppressHydrationWarning
        >
          {/* CRITICAL FIX: Only show Globe icon, remove emoji to prevent double icon during hydration */}
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{t('language.switch')}:</span>
          <span suppressHydrationWarning>
            {mounted ? `${currentLanguage?.flag} ${currentLanguage?.name}` : 'Language'}
          </span>
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48 z-[100]" side="bottom" sideOffset={8}>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => {
              setLanguage(lang.code);
              setIsOpen(false);
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {language === lang.code && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
