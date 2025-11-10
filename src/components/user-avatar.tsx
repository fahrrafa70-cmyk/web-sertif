"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

const UserAvatar = memo(function UserAvatar() {
  const { t } = useLanguage();
  const { isAuthenticated, localSignOut, email } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials from email - memoized to prevent recalculation
  const getInitials = useMemo(() => {
    if (email) {
      const parts = email.split("@")[0].split(".");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  }, [email]);

  // Close dropdown when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
    }
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation - memoized
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {getInitials}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {getInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {email || ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 dark:border-gray-700 py-1">
              <button
                onClick={() => {
                  localSignOut();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("auth.logout")}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default UserAvatar;
