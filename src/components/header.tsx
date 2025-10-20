"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" as const }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[4rem] py-3">
          {/* Sidebar Trigger Button (Mobile) */}
          <motion.button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center self-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-6 h-6" />
          </motion.button>

          {/* Sidebar Trigger Button (Desktop, left of logo) */}
          <motion.button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:inline-flex items-center justify-center mr-2 h-10 w-10 rounded-lg text-white gradient-primary hover:opacity-90 transition-all duration-200 shadow-sm mt-1"
            title="Open Menu"
            aria-label="Open Menu"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          {/* Enhanced Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/" className="flex items-center space-x-3 group">
              <motion.div 
                className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200"
                whileHover={{ rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span className="text-white font-bold text-xl">e</span>
              </motion.div>
              <span className="text-2xl font-bold text-gradient group-hover:scale-105 transition-transform duration-200">
                E-Certificate
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/", label: t('nav.home') },
              { href: "/about", label: t('nav.about') },
              ...((role === "admin" || role === "team") ? [{ href: "/templates", label: t('nav.templates') }] : []),
              { 
                href: hydrated ? (!isAuthenticated ? "/my-certificates" : "/certificates") : "#", 
                label: hydrated ? (!isAuthenticated ? t('nav.myCertificates') : t('nav.certificates')) : ""
              },
              ...((role === "admin" || role === "team") ? [{ href: "/members", label: "Members" }] : [])
            ].map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <motion.div 
            className="hidden md:flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {!isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover-lift"
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
                className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover-lift"
                onClick={localSignOut}
              >
                Log out
              </Button>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Enhanced Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {[
                  { href: "/", label: t('nav.home') },
                  { href: "/about", label: t('nav.about') },
                  ...((role === "admin" || role === "team") ? [{ href: "/templates", label: t('nav.templates') }] : []),
                  { 
                    href: hydrated ? (!isAuthenticated ? "/my-certificates" : "/certificates") : "#", 
                    label: hydrated ? (!isAuthenticated ? t('nav.myCertificates') : t('nav.certificates')) : ""
                  },
                  ...((role === "admin" || role === "team") ? [{ href: "/members", label: "Members" }] : [])
                ].map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                
                <motion.div 
                  className="px-3 py-2 space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  {!isAuthenticated ? (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover-lift"
                      onClick={() => setOpenLogin(true)}
                    >
                      {t('auth.login')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover-lift"
                      onClick={localSignOut}
                    >
                      {t('auth.logout')}
                    </Button>
                  )}

                  {/* Language Switcher (Mobile) */}
                  <LanguageSwitcher variant="default" className="w-full" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} role={role ?? undefined} />
    </motion.header>
  );
}
