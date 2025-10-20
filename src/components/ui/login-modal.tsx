"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export function LoginModal() {
  const { openLogin, setOpenLogin, signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleMissing, setRoleMissing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRoleMissing(false);
    try {
      await signIn(email, password);
    } catch {
      // error handled by context, but keep a catch to avoid unhandled promise
    }
  }

  return (
    <Dialog open={openLogin} onOpenChange={setOpenLogin}>
      <DialogContent className="w-[480px] sm:w-[500px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <motion.div 
          className="grid grid-cols-1 min-h-[400px]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" as const }}
        >
          {/* Enhanced header with gradient */}
          <motion.div 
            className="bg-gradient-to-b from-blue-400 via-blue-400 to-blue-500 text-white px-6 py-6 relative overflow-hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                Welcome Back
              </DialogTitle>
              <p className="text-blue-100 text-sm mt-1">Sign in to your account to continue</p>
            </DialogHeader>
          </motion.div>

          {/* Enhanced form */}
          <motion.div 
            className="p-6 bg-gradient-to-b from-white to-gray-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Enter your email"
                />
              </motion.div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {roleMissing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                  >
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      </div>
                      Account exists but role data is missing.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 gradient-primary text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="text-center"
              >
                <p className="text-xs text-gray-500">
                  Belum punya akun?{" "}
                  <a 
                    href="/register" 
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Register
                  </a>
                </p>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


