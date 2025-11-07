"use client";

import { useState, memo, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  FileText,
  Layout,
  Users,
  Info,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  roles?: ("admin" | "team")[];
}

const ModernSidebar = memo(function ModernSidebar() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems: NavItem[] = useMemo(() => [
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
      label: "Data",
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
  ], [t]);

  // Filter items based on role
  const filteredItems = useMemo(() => {
    return navItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(role as "admin" | "team");
    });
  }, [navItems, role]);

  const isActive = useCallback((href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }, [pathname]);
  
  const handleMouseEnter = useCallback((href: string) => {
    setHoveredItem(href);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  return (
    <>
      {/* Desktop Sidebar - Fixed Left */}
      <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 bg-gray-50 dark:bg-gray-900 flex-col items-center z-40">
        {/* Spacer for alignment */}
        <div className="mt-6 mb-6"></div>

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col items-center gap-3 w-full px-3">
          {filteredItems.map((item) => {
            const active = isActive(item.href);
            return (
              <div
                key={item.href}
                className="relative w-full"
                onMouseEnter={() => handleMouseEnter(item.href)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={item.href}
                  className="relative flex items-center justify-center w-full h-14 group"
                  aria-label={item.label}
                  style={{ minWidth: "44px", minHeight: "44px" }}
                >
                  <div
                    className={`
                      flex items-center justify-center w-11 h-11 rounded-full
                      transition-all duration-200
                      ${
                        active
                          ? "gradient-primary text-white shadow-md"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm"
                      }
                    `}
                  >
                    {item.icon}
                  </div>
                </Link>

                {/* Tooltip */}
                {hoveredItem === item.href && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap z-50 pointer-events-none"
                  >
                    {item.label}
                  </motion.div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
});

ModernSidebar.displayName = "ModernSidebar";

export default ModernSidebar;
