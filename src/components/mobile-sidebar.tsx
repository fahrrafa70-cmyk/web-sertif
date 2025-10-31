"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  FileText,
  Layout,
  Users,
  Info,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  roles?: ("admin" | "team")[];
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { t } = useLanguage();
  const { role } = useAuth();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      icon: <Home className="w-5 h-5" />,
      label: t("nav.home"),
      href: "/",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: t("nav.certificates"),
      href: "/certificates",
      roles: ["admin", "team"],
    },
    {
      icon: <Layout className="w-5 h-5" />,
      label: t("nav.templates"),
      href: "/templates",
      roles: ["admin", "team"],
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Members",
      href: "/members",
      roles: ["admin", "team"],
    },
    {
      icon: <Info className="w-5 h-5" />,
      label: t("nav.about"),
      href: "/about",
    },
    {
      icon: <HelpCircle className="w-5 h-5" />,
      label: t("nav.faq"),
      href: "/faq",
    },
  ];

  // Filter items based on role
  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role as "admin" | "team");
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Add Escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[59] lg:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 h-full w-[85vw] max-w-sm bg-white shadow-xl z-[60] lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-xl tracking-tight">E</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      E-Certificate
                    </h2>
                    <p className="text-xs text-gray-400 font-medium tracking-wide">Certification System</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-6">
                <nav className="space-y-1">
                  {filteredItems.map((item, index) => {
                    const active = isActive(item.href);
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50"
                        >
                          <div
                            className={`
                              flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
                              transition-all duration-200
                              ${
                                active
                                  ? "gradient-primary text-white shadow-lg"
                                  : "bg-gray-100 text-gray-600"
                              }
                            `}
                          >
                            {item.icon}
                          </div>
                          <span
                            className={`text-base font-medium flex-1 ${
                              active ? "text-gradient" : "text-gray-700"
                            }`}
                          >
                            {item.label}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 transition-colors ${
                              active ? "text-cyan-400" : "text-gray-300"
                            }`}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {t("theme.switch") || "Theme"}
                  </p>
                  <ThemeSwitcher variant="default" className="w-full mb-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {t("language.switch")}
                  </p>
                  <LanguageSwitcher variant="default" className="w-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
