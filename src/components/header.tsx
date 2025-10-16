"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import Sidebar from "./sidebar-compact";
// Floating sidebar button removed; using a header-aligned trigger instead

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load role on mount to avoid hydration mismatch
    try {
      if (typeof window !== "undefined") {
        const savedRole = window.localStorage.getItem("ecert-role");
        if (savedRole === "Admin" || savedRole === "Team" || savedRole === "Public") {
          setRole(savedRole);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ecert-role", role);
      }
    } catch {}
  }, [role]);

  const effectiveRole = mounted ? role : "Public";

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[4rem] py-3">
          {/* Sidebar Trigger Button (Mobile) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center self-center"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Sidebar Trigger Button (Desktop, left of logo) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:inline-flex items-center justify-center mr-2 h-10 w-10 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-colors duration-200 shadow-sm mt-1"
            title="Open Menu"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">e</span>
            </div>
            <span className="text-xl font-bold text-gray-900">E-Certificate</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              About E-Certificate
            </Link>
            <Link
              href="/activities"
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Activities
            </Link>
            {(role === "Admin" || role === "Team") && (
              <Link
                href="/templates"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Templates
              </Link>
            )}
            {effectiveRole === "Public" ? (
              <Link
                href="/my-certificates"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                My Certificates
              </Link>
            ) : (
              <Link
                href="/certificates"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Certificates
              </Link>
            )}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Login
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Register
            </Button>

            {/* Role Switcher (Desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 whitespace-nowrap w-40 justify-between h-10"
                >
                  <span className="hidden sm:inline">Role:</span> {role}
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setRole("Admin")}> 
                  {role === "Admin" && <Check className="w-4 h-4" />} 
                  <span>Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRole("Team")}>
                  {role === "Team" && <Check className="w-4 h-4" />} 
                  <span>Team</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRole("Public")}>
                  {role === "Public" && <Check className="w-4 h-4" />} 
                  <span>Public</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                About E-Certificate
              </Link>
              <Link
                href="/activities"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Activities
              </Link>
              {(effectiveRole === "Admin" || effectiveRole === "Team") && (
                <Link
                  href="/templates"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Templates
                </Link>
              )}
              {effectiveRole === "Public" ? (
                <Link
                  href="/my-certificates"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Certificates
                </Link>
              ) : (
                <Link
                  href="/certificates"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Certificates
                </Link>
              )}
              <div className="px-3 py-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Login
                </Button>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                  Register
                </Button>

                {/* Role Switcher (Mobile) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-between whitespace-nowrap h-10"
                    >
                      <span>Role: {role}</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setRole("Admin")}>
                      {role === "Admin" && <Check className="w-4 h-4" />}
                      <span>Admin</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRole("Team")}>
                      {role === "Team" && <Check className="w-4 h-4" />}
                      <span>Team</span>
                    </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRole("Public")}>
                      {role === "Public" && <Check className="w-4 h-4" />}
                      <span>Public</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} role={effectiveRole} />

    </motion.header>
  );
}
