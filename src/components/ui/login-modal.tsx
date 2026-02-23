"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLoginModal } from "@/features/auth/hooks/useLoginModal";

export function LoginModal() {
  const {
    openLogin,
    loading,
    handleOpenChange,
    signInWithOAuth,
    handleSubmit,
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    emailError,
    setEmailError,
    passwordError,
    setPasswordError,
    fullNameError,
    setFullNameError,
    confirmPasswordError,
    setConfirmPasswordError,
    isMobile,
    t,
    safeT,
  } = useLoginModal();

  return (
    <Dialog open={openLogin} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={`p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
          isMobile ? '!w-[calc(100%-3rem)] !max-w-[calc(100vw-3rem)]' : '!w-[440px] !max-w-[440px]'
        }`}
      >
        <motion.div 
          className="grid grid-cols-1"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }}
        >
          {/* Enhanced header with gradient */}
          <motion.div 
            className="gradient-primary text-white px-4 py-5 sm:px-6 sm:py-6 relative overflow-hidden z-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 z-0"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {mode === "login"
                  ? t('login.welcomeBack')
                  : safeT('login.createAccount', 'Create account')}
              </DialogTitle>
              <p className="text-white text-xs sm:text-sm mt-1">
                {mode === "login"
                  ? t('login.signInMessage')
                  : safeT('login.registerMessage', 'Register with your email and password')}
              </p>
            </DialogHeader>
          </motion.div>

          {/* Enhanced form */}
          <motion.div 
            className="p-4 sm:p-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Google OAuth Button - Moved to top */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="mb-4"
            >
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
                className="w-full h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200 text-sm sm:text-base"
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
                {safeT('login.continueWithGoogle', 'Continue with Google')}
              </Button>
            </motion.div>

            {/* OAuth Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="relative my-4 sm:my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-500 dark:text-gray-400">
                  {t('login.orContinueWith') || 'Or continue with email'}
                </span>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {safeT('profile.fullName', 'Full name')}
                  </label>
                  <Input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setFullNameError("");
                    }}
                    required
                    className={`h-11 sm:h-12 rounded-lg transition-all duration-200 dark:bg-gray-900 dark:text-gray-100 ${
                      fullNameError
                        ? "border-red-300 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500/20 dark:focus:ring-red-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 dark:focus:ring-blue-500/20"
                    }`}
                    placeholder={safeT('profile.fullNamePlaceholder', 'Enter your full name')}
                  />
                  {fullNameError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 mt-1"
                    >
                      {fullNameError}
                    </motion.p>
                  )}
                </motion.div>
              )}

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
                  className={`h-11 sm:h-12 rounded-lg transition-all duration-200 dark:bg-gray-900 dark:text-gray-100 ${
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
                    className={`h-11 sm:h-12 rounded-lg transition-all duration-200 pr-12 dark:bg-gray-900 dark:text-gray-100 ${
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

              {mode === "register" && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {safeT('login.confirmPassword', 'Confirm password')}
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError("");
                    }}
                    required
                    className={`h-11 sm:h-12 rounded-lg transition-all duration-200 dark:bg-gray-900 dark:text-gray-100 ${
                      confirmPasswordError
                        ? "border-red-300 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500/20 dark:focus:ring-red-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 dark:focus:ring-blue-500/20"
                  }`}
                    placeholder={safeT('login.confirmPasswordPlaceholder', 'Confirm your password')}
                  />
                  {confirmPasswordError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 mt-1"
                    >
                      {confirmPasswordError}
                    </motion.p>
                  )}
                </motion.div>
              )}

              <motion.div 
                className="pt-2 space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 rounded-lg gradient-primary text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loading
                    ? (mode === "login"
                        ? safeT('login.signingIn', 'Loging in...')
                        : safeT('login.registering', 'Registering...'))
                    : (mode === "login"
                        ? safeT('login.signInButton', 'Login')
                        : safeT('login.registerButton', 'Register'))}
                </Button>

                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                  {mode === "login" ? (
                    <>
                      {safeT('login.noAccount', "Don't have an account?")} {" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setEmailError("");
                          setPasswordError("");
                        }}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {safeT('login.registerNow', 'Register now')}
                      </button>
                    </>
                  ) : (
                    <>
                      {safeT('login.haveAccount', 'Already have an account?')} {" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setFullNameError("");
                          setConfirmPasswordError("");
                        }}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {safeT('login.signInNow', 'Login')}
                      </button>
                    </>
                  )}
                </p>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


