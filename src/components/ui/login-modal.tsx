"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function LoginModal() {
  const { openLogin, setOpenLogin, signIn, signInWithOAuth, loading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Reset form and errors when modal opens/closes
  useEffect(() => {
    if (!openLogin) {
      // Reset form when modal closes
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setEmailError("");
      setPasswordError("");
    }
  }, [openLogin]);

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

  // Handle modal close - prevent closing while loading
  const handleOpenChange = (open: boolean) => {
    // Don't allow closing modal while loading to prevent state inconsistency
    if (!open && loading) {
      return;
    }
    setOpenLogin(open);
  };

  return (
    <Dialog open={openLogin} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[480px] sm:w-[500px] p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <motion.div 
          className="grid grid-cols-1 min-h-[400px]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }}
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
                {t('login.welcomeBack')}
              </DialogTitle>
              <p className="text-white text-sm mt-1">{t('login.signInMessage')}</p>
            </DialogHeader>
          </motion.div>

          {/* Enhanced form */}
          <motion.div 
            className="p-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950"
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
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('login.emailAddress')}
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
                  className={`h-12 rounded-lg transition-all duration-200 dark:bg-gray-900 dark:text-gray-100 ${
                    emailError 
                      ? "border-red-300 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500/20 dark:focus:ring-red-500/20" 
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 dark:focus:ring-blue-500/20"
                  }`}
                  placeholder={t('login.enterEmail')}
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
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('login.password')}
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
                    className={`h-12 rounded-lg transition-all duration-200 pr-12 dark:bg-gray-900 dark:text-gray-100 ${
                      passwordError 
                        ? "border-red-300 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500/20 dark:focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 dark:focus:ring-blue-500/20"
                    }`}
                    placeholder={t('login.enterPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
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
                  className="w-full h-12 gradient-primary text-white font-semibold rounded-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('login.signingIn')}
                    </div>
                  ) : (
                    t('login.signIn')
                  )}
                </Button>
              </motion.div>
            </form>

            {/* OAuth Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="relative my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-500 dark:text-gray-400">
                  {t('login.orContinueWith') || 'Or continue with'}
                </span>
              </div>
            </motion.div>

            {/* OAuth Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.7 }}
              className="space-y-3"
            >
              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={async () => {
                  try {
                    await signInWithOAuth('google');
                  } catch (err) {
                    console.error('Google OAuth error:', err);
                  }
                }}
                className="w-full h-12 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* GitHub OAuth Button */}
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={async () => {
                  try {
                    await signInWithOAuth('github');
                  } catch (err) {
                    console.error('GitHub OAuth error:', err);
                  }
                }}
                className="w-full h-12 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue with GitHub
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


