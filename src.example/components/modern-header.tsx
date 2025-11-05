"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import UserAvatar from "./user-avatar";
import MobileSidebar from "./mobile-sidebar";

export default function ModernHeader() {
  const { setOpenLogin, isAuthenticated } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-hidden md:overflow-visible">
        <div className="h-20 md:h-16 px-3 sm:px-4 lg:px-4 flex items-start justify-between relative pt-1.5 md:pt-0 md:items-center">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-1 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0 z-10 flex items-center justify-center mt-1 md:mt-0"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Centered on mobile, left on desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 flex items-center max-w-[calc(100%-11rem)] sm:max-w-[calc(100%-9rem)] lg:max-w-none mt-1 md:mt-0">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
              {/* Icon with gradient background */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 gradient-primary rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm sm:shadow-md group-hover:shadow-lg transition-all duration-300 md:group-hover:scale-105">
                  <span className="text-white font-bold text-base sm:text-xl md:text-2xl tracking-tight">E</span>
                </div>
                {/* Subtle glow effect on hover - only on desktop */}
                <div className="hidden md:block absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Text - Simple and clean */}
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-sm sm:text-base md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-[1.1] sm:leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors truncate">
                  E-Certificate
                </span>
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wider uppercase hidden sm:block">
                  Certification System
                </span>
              </div>
            </Link>
          </div>

          {/* Right Section - Theme + Language + Avatar or Login */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0 z-10 md:z-[100] mt-1 md:mt-0">
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
                className="gradient-primary text-white border-0 hover:opacity-90 transition-opacity shadow-md hover:shadow-lg h-9 text-xs sm:text-sm px-3 sm:px-4"
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
        onClose={() => setIsMobileSidebarOpen(false)}
      />
    </>
  );
}
