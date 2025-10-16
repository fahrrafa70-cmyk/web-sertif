"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Home, 
  Info, 
  Calendar, 
  HelpCircle, 
  Users, 
  Award, 
  FileText, 
  LogIn, 
  UserPlus,
  Shield,
  Mail,
  Phone,
  MapPin,
  Globe,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role?: "Admin" | "Team" | "Public";
}

export default function Sidebar({ isOpen, onClose, role: roleProp }: SidebarProps) {
  // Derive role from prop, then fallback to localStorage for hard reload scenarios
  const role = roleProp ?? (typeof window !== "undefined" ? (window.localStorage.getItem("ecert-role") as "Admin" | "Team" | "Public" | null) : null) ?? "Public";
  useEffect(() => {
    // keep localStorage in sync if parent sends role
    try {
      if (roleProp && typeof window !== "undefined") {
        window.localStorage.setItem("ecert-role", roleProp);
      }
    } catch {}
  }, [roleProp]);

  const mainMenuItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "Home",
      href: "/",
    },
    {
      icon: <Info className="w-5 h-5" />,
      label: "About",
      href: "/about",
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: "Activities",
      href: "/activities",
    },
    {
      icon: <HelpCircle className="w-5 h-5" />,
      label: "FAQ",
      href: "/faq",
    }
  ];

  // Removed noninteractive quick actions per request

  const roleMenu: { label: string; href: string }[] = (() => {
    if (role === "Admin") {
      return [
        // Dashboard item removed to avoid duplication and keep focus.
        { label: "Templates", href: "/templates" },
        { label: "Certificates", href: "/certificates" },
        { label: "Categories", href: "/categories" },
        { label: "Members", href: "/members" },
        { label: "Analytics", href: "/analytics" },
        { label: "Settings", href: "/settings" },
      ];
    }
    if (role === "Team") {
      return [
        // Dashboard item removed to avoid duplication and keep focus.
        { label: "Templates", href: "/templates" },
        { label: "Certificates", href: "/certificates" },
        { label: "Settings", href: "/settings" },
      ];
    }
    return [
      { label: "My Certificates", href: "/my-certificates" },
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
    ];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed left-0 top-0 h-svh w-96 shadow-xl z-[60] border-r border-gray-200"
            style={{ 
              backgroundColor: '#ffffff',
              opacity: 1,
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none'
            }}
            onClick={(e) => {
              // Close sidebar when clicking outside content area
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="flex flex-col h-svh bg-white" style={{ backgroundColor: '#ffffff' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">e</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">E-Certificate</h2>
                    <p className="text-sm text-gray-500">Management Platform</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Main Content (scrollable to always fit viewport height) */}
              <div
                className="flex-1 p-6 space-y-8 bg-white overflow-y-auto overscroll-contain min-h-0 pr-2"
                style={{ backgroundColor: '#ffffff' }}
              >
                {/* Navigation */}
                <div>
                  <h3 className="text-base font-semibold text-gray-600 uppercase tracking-wider mb-4 px-2">
                    Menu
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
                          className="flex items-center space-x-4 p-4 rounded-lg hover:bg-blue-50 transition-colors duration-150 group"
                        >
                          <div className="text-gray-500 group-hover:text-blue-600 transition-colors duration-150">
                            {item.icon}
                          </div>
                          <span className="text-base font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                            {item.label}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors duration-150 ml-auto" />
                        </Link>
                      </motion.div>
                    ))}
                  </nav>
                </div>

                {/* Management / Role Menu */}
                <div>
                  <h3 className="text-base font-semibold text-gray-600 uppercase tracking-wider mb-4 px-2">
                    {role === "Public" ? "Explore" : "Management"}
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
                          className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-150 group border border-transparent hover:border-blue-100 hover:bg-blue-50 ${
                            index % 3 === 0
                              ? "bg-white"
                              : index % 3 === 1
                              ? "bg-gray-50"
                              : "bg-white"
                          }`}
                        >
                          <div className="text-gray-500 group-hover:text-blue-600 transition-colors duration-150">
                            <ChevronRight className="w-3 h-3" />
                          </div>
                          <span className="text-base font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                            {item.label}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors duration-150 ml-auto" />
                        </Link>
                      </motion.div>
                    ))}
                  </nav>
                </div>

                {/* Quick Actions removed */}

                {/* Contact */}
                <div>
                  <h3 className="text-base font-semibold text-gray-600 uppercase tracking-wider mb-4 px-2">
                    Contact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm text-gray-500 px-2">
                      <Phone className="w-4 h-4" />
                      <span>+6281380935185</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 px-2">
                      <Mail className="w-4 h-4" />
                      <span>@nurtiyas.id</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 px-2">
                      <MapPin className="w-4 h-4" />
                      <span>Jakarta Timur</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50" style={{ backgroundColor: '#f9fafb' }}>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-base h-10"
                    onClick={onClose}
                  >
                    <LogIn className="w-5 h-5 mr-3" />
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="w-full justify-start bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-base h-10"
                    onClick={onClose}
                  >
                    <UserPlus className="w-5 h-5 mr-3" />
                    Register
                  </Button>
                </div>
                
                <div className="mt-3 text-center">
                  <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                    <Globe className="w-4 h-4" />
                    <span>Multilingual Platform</span>
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
