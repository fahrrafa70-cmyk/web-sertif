"use client";

import { useState, memo, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
      href: "/data",
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
  
  // Removed unused handleMouseEnter - using handleMouseEnterWithPrefetch instead
  
  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // 🚀 PERFORMANCE: Aggressive prefetching for instant navigation
  useEffect(() => {
    // Prefetch common routes immediately after sidebar loads
    const commonRoutes = ['/templates', '/certificates', '/data'];
    const timeout = setTimeout(() => {
      commonRoutes.forEach(route => {
        if (route !== pathname) {
          router.prefetch(route);
        }
      });
    }, 100); // Small delay to not block initial render

    return () => clearTimeout(timeout);
  }, [pathname, router]);

  // 🚀 PERFORMANCE: Prefetch on hover for immediate navigation
  const handleMouseEnterWithPrefetch = useCallback((href: string) => {
    setHoveredItem(href);
    
    // Prefetch route on hover for instant navigation
    if (href !== pathname) {
      router.prefetch(href);
    }
  }, [pathname, router]);

  return (
    <>
      {/* Desktop Sidebar - Fixed Left */}
      <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 flex-col items-center z-40" style={{ backgroundColor: 'var(--background)' }}>
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
                onMouseEnter={() => handleMouseEnterWithPrefetch(item.href)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={item.href}
                  className="relative flex items-center justify-center w-full h-14 group"
                  aria-label={mounted ? item.label : (item.href === '/' ? 'Home' : item.href === '/about' ? 'About' : 'Navigation')}
                  style={{ minWidth: "44px", minHeight: "44px" }}
                  suppressHydrationWarning
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
                  <div
                    className="absolute left-full ml-2 px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap z-50 pointer-events-none shadow-sm transition-all duration-150 ease-out animate-in fade-in slide-in-from-left-2"
                    style={{
                      top: '30%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <span suppressHydrationWarning>
                      {mounted ? item.label : (item.href === '/' ? 'Home' : item.href === '/about' ? 'About' : 'Navigation')}
                    </span>
                  </div>
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
