"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import Sidebar from "./sidebar-compact";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/contexts/language-context";

export default function Header() {
  const { t } = useLanguage();
  const { setOpenLogin, isAuthenticated, role, localSignOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[4rem] py-3">
          {/* Sidebar Trigger Button (Mobile) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 flex items-center justify-center self-center"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Sidebar Trigger Button (Desktop, left of logo) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:inline-flex items-center justify-center mr-2 h-10 w-10 rounded-lg text-white gradient-primary hover:opacity-90 shadow-sm mt-1"
            title="Open Menu"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Enhanced Logo */}
          <div>
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">e</span>
              </div>
              <span className="text-2xl font-bold text-gradient">
                E-Certificate
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/", label: t('nav.home') },
              { href: "/about", label: t('nav.about') },
              ...((role === "admin" || role === "team") ? [{ href: "/templates", label: t('nav.templates') }] : []),
              ...((role === "admin" || role === "team") ? [{ href: "/certificates", label: t('nav.certificates') }] : []),
              ...((role === "admin" || role === "team") ? [{ href: "/members", label: "Members" }] : [])
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 font-medium relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpenLogin(true)}
                >
                  {t('auth.login')}
                </Button>
                <Button
                  variant="gradient"
                  className="gradient-primary text-white hover:opacity-90 shadow-lg hover:shadow-xl"
                  onClick={() => window.location.assign('/register')}
                >
                  {t('auth.register')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={localSignOut}
              >
                Log out
              </Button>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Enhanced Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {[
                { href: "/", label: t('nav.home') },
                { href: "/about", label: t('nav.about') },
                ...((role === "admin" || role === "team") ? [{ href: "/templates", label: t('nav.templates') }] : []),
                ...((role === "admin" || role === "team") ? [{ href: "/certificates", label: t('nav.certificates') }] : []),
                ...((role === "admin" || role === "team") ? [{ href: "/members", label: "Members" }] : [])
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              <div className="px-3 py-2 space-y-2">
                  {!isAuthenticated ? (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => setOpenLogin(true)}
                    >
                      {t('auth.login')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={localSignOut}
                    >
                      {t('auth.logout')}
                    </Button>
                  )}

                {/* Language Switcher (Mobile) */}
                <LanguageSwitcher variant="default" className="w-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} role={role ?? undefined} />
    </header>
  );
}
