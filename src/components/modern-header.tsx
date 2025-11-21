"use client";

import { useState, memo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useModal } from "@/contexts/modal-context";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import UserAvatar from "./user-avatar";
import MobileSidebar from "./mobile-sidebar";

const ModernHeader = memo(function ModernHeader() {
  const { setOpenLogin, isAuthenticated } = useAuth();
  const { isModalOpen } = useModal();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Apply dark overlay on header when modal is open on /search page
  const shouldDarken = pathname === "/search" && isModalOpen;
  
  const handleMobileSidebarToggle = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <>
      {/* Dark overlay covering entire header when modal is open */}
      {shouldDarken && (
        <div 
          className="fixed top-0 left-0 right-0 bg-black/20 dark:bg-black/40 pointer-events-none transition-opacity duration-300"
          style={{
            height: 'var(--header-height-mobile, 72px)',
            zIndex: 9998,
          }}
        />
      )}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 border-b w-full transition-all duration-300`}
        style={{
          backgroundColor: 'var(--background)',
          height: 'var(--header-height-mobile, 72px)',
        }}
      >
        <div className="h-full w-full px-2 sm:px-3 md:px-4 flex items-center justify-between gap-1 sm:gap-2 relative z-10">
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
            <Link href="/" className="flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 group max-w-full">
              <div className="relative flex-shrink-0">
                <Image
                  src="/favicon.png"
                  alt="Certify Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain transition-all duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              
              {/* Text - Bold and prominent */}
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Certify
              </span>
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
                className="gradient-primary text-white border-0 shadow-md h-7 sm:h-8 md:h-9 text-xs sm:text-sm px-2 sm:px-3 md:px-4"
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
