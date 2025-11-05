"use client";

import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';
import { Moon, Sun } from 'lucide-react';

interface ThemeSwitcherProps {
  variant?: 'default' | 'icon-only' | 'compact';
  className?: string;
}

export function ThemeSwitcher({ variant = 'default', className }: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'icon-only') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center gap-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${className}`}
      onClick={toggleTheme}
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </Button>
  );
}

