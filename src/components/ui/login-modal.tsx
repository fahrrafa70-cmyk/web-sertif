"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function LoginModal() {
  const { openLogin, setOpenLogin, signIn, loading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    
    // Client-side validation
    let hasError = false;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('error.login.invalidEmail'));
      hasError = true;
    }
    
    if (!password || password.length < 6) {
      setPasswordError(t('error.login.invalidPassword'));
      hasError = true;
    }
    
    if (hasError) return;
    
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      // Check if error is related to invalid credentials
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      
      console.log('Login error:', errorMessage);
      
      // Handle specific error messages from Supabase
      if (errorMessage.includes('invalid login') || 
          errorMessage.includes('invalid email') || 
          errorMessage.includes('email not confirmed')) {
        setEmailError(t('error.login.invalidCredentials'));
        setPasswordError(t('error.login.invalidCredentials'));
      } else if (errorMessage.includes('password')) {
        setPasswordError(t('error.login.invalidCredentials'));
      } else if (errorMessage.includes('email') || errorMessage.includes('user')) {
        setEmailError(t('error.login.invalidCredentials'));
      } else {
        // Generic error for both fields
        setEmailError(t('error.login.invalidCredentials'));
        setPasswordError(t('error.login.invalidCredentials'));
      }
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
            className="gradient-primary text-white px-6 py-6 relative overflow-hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                Welcome Back
              </DialogTitle>
              <p className="text-white text-sm mt-1">Sign in to your account to continue</p>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  required
                  className={`h-12 rounded-lg transition-all duration-200 ${
                    emailError 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                  placeholder="Enter your email"
                />
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 mt-1"
                  >
                    {emailError}
                  </motion.p>
                )}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                    className={`h-12 rounded-lg transition-all duration-200 pr-12 ${
                      passwordError 
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" 
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
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
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 mt-1"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </motion.div>

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
            </form>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


