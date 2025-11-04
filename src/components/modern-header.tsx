"use client";

import { useState, memo, useCallback } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import UserAvatar from "./user-avatar";
import MobileSidebar from "./mobile-sidebar";

const ModernHeader = memo(function ModernHeader() {
  const { setOpenLogin, isAuthenticated } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const handleMobileSidebarToggle = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-0 dark:border-b-0 h-14 sm:h-16 w-full">
        <div className="h-full w-full px-2 sm:px-3 md:px-4 flex items-center justify-between gap-1 sm:gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={handleMobileSidebarToggle}
            className="lg:hidden flex-shrink-0 p-1.5 sm:p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Responsive positioning */}
          <div className="flex-1 lg:flex-initial flex items-center justify-center lg:justify-start min-w-0 overflow-hidden">
            <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 group max-w-full">
              {/* Icon with gradient background */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 gradient-primary rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-lg sm:text-xl md:text-2xl tracking-tight">E</span>
                </div>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 gradient-primary rounded-lg sm:rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Text - Simple and clean */}
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-sm sm:text-base md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors truncate">
                  E-Certificate
                </span>
                <span className="text-[8px] sm:text-[9px] md:text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wider uppercase hidden sm:block truncate">
                  Certification System
                </span>
              </div>
            </Link>
          </div>

          {/* Right Section - Theme + Language + Avatar or Login */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
            {/* Theme Switcher - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block">
              <ThemeSwitcher variant="compact" />
            </div>
            {/* Language Switcher - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block">
              <LanguageSwitcher variant="compact" />
            </div>

            {/* User Avatar or Login Button */}
            {isAuthenticated ? (
              <UserAvatar />
            ) : (
              <Button
                size="sm"
                className="gradient-primary text-white border-0 hover:opacity-90 transition-opacity shadow-md hover:shadow-lg h-7 sm:h-8 md:h-9 text-xs sm:text-sm px-2 sm:px-3 md:px-4"
                onClick={() => setOpenLogin(true)}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={handleMobileSidebarClose}
      />
    </>
  );
});

ModernHeader.displayName = "ModernHeader";

export default ModernHeader;
