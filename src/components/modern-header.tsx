"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import UserAvatar from "./user-avatar";
import MobileSidebar from "./mobile-sidebar";

export default function ModernHeader() {
  const { setOpenLogin, isAuthenticated } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-50">
        <div className="h-16 px-4 lg:px-4 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Centered on mobile, left on desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              {/* Icon with gradient background */}
              <div className="relative">
                <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-2xl tracking-tight">E</span>
                </div>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Text - Simple and clean */}
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 leading-tight group-hover:text-gray-700 transition-colors">
                  E-Certificate
                </span>
                <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase hidden sm:block">
                  Certification System
                </span>
              </div>
            </Link>
          </div>

          {/* Right Section - Language + Avatar or Login */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />

            {/* User Avatar or Login Button */}
            {isAuthenticated ? (
              <UserAvatar />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-9"
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
