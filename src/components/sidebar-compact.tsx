"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Home, 
  Info, 
  HelpCircle,  
  LogIn,
  Mail,
  Phone,
  MapPin,
  Globe,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role?: "admin" | "team" | "user" | null;
}

export default function Sidebar({ isOpen, onClose, role: roleProp }: SidebarProps) {
  const { t } = useLanguage();
  const { isAuthenticated, localSignOut, setOpenLogin } = useAuth();
  // NO SCROLL LOCKING - Use pure overlay approach
  
  // Derive role from prop, then fallback to localStorage for hard reload scenarios
  const role = roleProp ?? null;
  useEffect(() => {
    // keep localStorage in sync if parent sends role
    try {
      if (roleProp && typeof window !== "undefined") {
        window.localStorage.setItem("ecert-role", roleProp);
      }
    } catch {}
  }, [roleProp]);

  // Add Escape key listener to close sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const mainMenuItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: t('nav.home'),
      href: "/",
    },
    {
      icon: <Info className="w-5 h-5" />,
      label: t('nav.about'),
      href: "/about",
    },
    {
      icon: <HelpCircle className="w-5 h-5" />,
      label: t('nav.faq'),
      href: "/faq",
    }
  ];

  // Removed noninteractive quick actions per request

  const roleMenu: { label: string; href: string }[] = (() => {
    if (role === "admin") {
      return [
        // Dashboard item removed to avoid duplication and keep focus.
        { label: t('nav.templates'), href: "/templates" },
        { label: t('nav.certificates'), href: "/certificates" },
        { label: "Members", href: "/members" },
      ];
    }
    if (role === "team") {
      return [
        // Dashboard item removed to avoid duplication and keep focus.
        { label: t('nav.templates'), href: "/templates" },
        { label: t('nav.certificates'), href: "/certificates" },
        { label: "Members", href: "/members" },
      ];
    }
    // For non-authenticated users or regular users, return empty array
    // since main menu already has Home, About, and FAQ
    return [];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay - completely isolated from layout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[59]"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 59,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          />
          
          {/* Sidebar - pure overlay positioning */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="sidebar-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: '100vw',
              zIndex: 60,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="sidebar-content h-full w-[85vw] sm:w-96 max-w-[24rem] shadow-xl border-r border-gray-200 bg-white"
              style={{
                pointerEvents: 'auto',
                height: '100vh',
                width: '85vw',
                maxWidth: '24rem',
                backgroundColor: '#ffffff'
              }}
            >
              <div className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base sm:text-lg">e</span>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-bold text-gray-900">E-Certificate</h2>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Management Platform</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 h-8 w-8 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Main Content (scrollable to always fit viewport height) */}
                <div className="flex-1 p-4 sm:p-6 space-y-6 sm:space-y-8 bg-white overflow-y-auto overscroll-contain min-h-0 pr-2">
                  {/* Navigation */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider mb-3 sm:mb-4 px-2">
                      {t('nav.menu') || 'Menu'}
                    </h3>
                    <nav className="space-y-1">
                      {mainMenuItems.map((item, index) => (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg hover:bg-blue-50 transition-colors duration-150 group"
                          >
                            <div className="text-gray-500 group-hover:text-blue-600 transition-colors duration-150 flex-shrink-0">
                              {item.icon}
                            </div>
                            <span className="text-sm sm:text-base font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                              {item.label}
                            </span>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors duration-150 ml-auto" />
                          </Link>
                        </motion.div>
                      ))}
                    </nav>
                  </div>

                  {/* Management / Role Menu */}
                  {roleMenu.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider mb-3 sm:mb-4 px-2">
                        {!role ? t('nav.explore') : t('nav.management')}
                      </h3>
                      <nav className="space-y-1">
                        {roleMenu.map((item, index) => (
                          <motion.div
                            key={item.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                          >
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl transition-all duration-150 group border border-transparent hover:border-blue-100 hover:bg-blue-50 ${
                                index % 3 === 0
                                  ? "bg-white"
                                  : index % 3 === 1
                                  ? "bg-gray-50"
                                  : "bg-white"
                              }`}
                            >
                              <div className="text-gray-500 group-hover:text-blue-600 transition-colors duration-150 flex-shrink-0">
                                <ChevronRight className="w-3 h-3" />
                              </div>
                              <span className="text-sm sm:text-base font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                                {item.label}
                              </span>
                              <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors duration-150 ml-auto" />
                            </Link>
                          </motion.div>
                        ))}
                      </nav>
                    </div>
                  )}

                  {/* Language Switcher */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider mb-3 sm:mb-4 px-2">
                      {t('language.switch')}
                    </h3>
                    <div className="px-2">
                      <LanguageSwitcher variant="default" className="w-full" />
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider mb-3 sm:mb-4 px-2">
                      {t('nav.contact')}
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-500 px-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="break-all">+6281380935185</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-500 px-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="break-all">fahrirafa.rpl1@gmail.com</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-500 px-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Malang</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-2">
                    {!isAuthenticated ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-sm sm:text-base h-9 sm:h-10"
                        onClick={() => {
                          setOpenLogin(true);
                          onClose();
                        }}
                      >
                        <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                        {t('auth.login')}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-sm sm:text-base h-9 sm:h-10 border-gray-300 text-gray-700 hover:bg-gray-50 hover-lift"
                        onClick={() => {
                          localSignOut();
                          onClose();
                        }}
                      >
                        {t('auth.logout')}
                      </Button>
                    )}
                  </div>
                  
                  <div className="mt-2 sm:mt-3 text-center">
                    <div className="flex items-center justify-center space-x-1 text-xs sm:text-sm text-gray-500">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{t('footer.multilingual')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
