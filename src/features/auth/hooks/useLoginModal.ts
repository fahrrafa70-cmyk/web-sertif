import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

export function useLoginModal() {
  const { openLogin, setOpenLogin, signIn, signInWithOAuth, loading } = useAuth();
  const { t } = useLanguage();
  
  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };
  
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset form and errors when modal opens/closes
  useEffect(() => {
    if (!openLogin) {
      setMode("login");
      setEmail("");
      setPassword("");
      setFullName("");
      setConfirmPassword("");
      setShowPassword(false);
      setEmailError("");
      setPasswordError("");
      setFullNameError("");
      setConfirmPasswordError("");
      setSubmitLoading(false);
      setInfoMessage("");
    }
  }, [openLogin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setFullNameError("");
    setConfirmPasswordError("");
    
    // Client-side validation
    let hasError = false;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('error.login.invalidEmail') || "Invalid email");
      hasError = true;
    }

    if (!password || password.length < 6) {
      const msg = mode === "register" ? t('error.login.invalidPassword') : t('error.login.invalidPassword');
      setPasswordError(msg || "Invalid password");
      hasError = true;
    }

    if (mode === "register") {
      if (!fullName.trim()) {
        setFullNameError(t('profile.fullNameRequired') || 'Full name is required');
        hasError = true;
      }

      if (confirmPassword !== password) {
        setConfirmPasswordError(
          safeT('error.login.passwordMismatch', 'Passwords do not match')
        );
        hasError = true;
      }
    }
    
    if (hasError) return;

    setSubmitLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = typeof data?.error === 'string' ? data.error : 'Registration failed';
          setEmailError(message);
          return;
        }

        // Registration successful: show info message and switch to login mode
        setInfoMessage(
          safeT(
            'login.registerCheckEmail',
            'Registration successful. Please check your email and confirm your account before logging in.',
          ),
        );
        setMode('login');
        setFullNameError("");
        setConfirmPasswordError("");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      console.log('Login error:', errorMessage);
      
      const invalidCredMsg = t('error.login.invalidCredentials') || "Invalid credentials";
      if (errorMessage.includes('invalid login') || 
          errorMessage.includes('invalid email') || 
          errorMessage.includes('email not confirmed')) {
        setEmailError(invalidCredMsg);
        setPasswordError(invalidCredMsg);
      } else if (errorMessage.includes('password')) {
        setPasswordError(invalidCredMsg);
      } else if (errorMessage.includes('email') || errorMessage.includes('user')) {
        setEmailError(invalidCredMsg);
      } else {
        setEmailError(invalidCredMsg);
        setPasswordError(invalidCredMsg);
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  // Handle modal close - prevent closing while loading
  const handleOpenChange = (open: boolean) => {
    if (!open && loading) {
      return;
    }
    setOpenLogin(open);
  };

  return {
    openLogin,
    loading: loading || submitLoading,
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
    infoMessage,
    t,
    safeT,
  };
}
