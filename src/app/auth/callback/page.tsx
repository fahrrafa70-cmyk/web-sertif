"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { createOrUpdateUserFromOAuth, getUserRoleByEmail } from "@/lib/supabase/auth";
import { useLanguage } from "@/contexts/language-context";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState('');
  const [, setHasError] = useState<string | null>(null);

  // Set document title robust untuk auth callback page
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "Signing In | Certify - Certificate Platform";
      }
    };
    
    // Set immediately
    setTitle();
    
    // Set with multiple delays to ensure override
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    // Set initial status
    setStatus(t('auth.callback.finishingSignIn'));

    const redirectHome = async () => {
      if (!cancelled) {
        router.replace("/");
      }
    };

    const waitForAuthReady = async (maxWaitMs: number = 5000): Promise<boolean> => {
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitMs) {
        if (cancelled) return false;
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
          // Check if role is available (user exists in users table)
          try {
            const normalized = session.user.email.toLowerCase().trim();
            const role = await getUserRoleByEmail(normalized);
            if (role !== null) {
              // Auth is ready!
              return true;
            }
          } catch {
            // User might not exist yet, continue waiting
            console.log("Waiting for user to be created...");
          }
        }
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return false;
    };

    const handleCallback = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");

      // Only show error if there's a real error parameter in URL
      // Sometimes providers add error params even on success, so check if we have a code
      if (error && !code) {
        const message = errorDescription || error;
        setHasError(message);
        setStatus(t('auth.callback.authFailed'));
        setTimeout(() => redirectHome(), 1500);
        return;
      }

      if (!code) {
        // No code and no explicit error - might be returning from OAuth
        // Check if we already have a session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          // We have a session, login was successful
          setStatus(t('auth.callback.almostDone'));
          await new Promise(resolve => setTimeout(resolve, 500));
          redirectHome();
          return;
        }
        // No session and no code - redirect silently
        redirectHome();
        return;
      }

      try {
        setStatus(t('auth.callback.finalisingSession'));
        
        // Exchange code for session
        const { data: sessionData, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
        
        // Check for actual errors - sometimes Supabase returns errors even when it works
        if (exchangeError) {
          // If we have a session despite the error, it might be a false error
          const { data: { session: existingSession } } = await supabaseClient.auth.getSession();
          if (existingSession?.user) {
            console.log("Session exists despite exchange error, continuing...");
            // Continue with existing session
          } else {
            console.error("OAuth exchange error:", exchangeError);
            setStatus(t('auth.callback.authFailedShort'));
            setTimeout(() => redirectHome(), 1500);
            return;
          }
        }

        // Get the session (either from exchange or existing)
        const { data: { session: finalSession } } = await supabaseClient.auth.getSession();
        const user = sessionData?.session?.user || finalSession?.user;

        if (!user) {
          setStatus(t('auth.callback.noSession'));
          setTimeout(() => redirectHome(), 1500);
          return;
        }

        // Process OAuth user immediately (don't wait for listener)
        const normalizedEmail = user.email?.toLowerCase().trim();
        if (normalizedEmail) {
          try {
            setStatus(t('auth.callback.settingUpAccount'));
            
            // Check if OAuth user
            const identity = user.identities?.[0];
            const authProvider = identity?.provider as 'google' | 'github' | 'email' | undefined;
            
            if (authProvider === 'google' || authProvider === 'github') {
              // Create/update user in background (don't block on this)
              createOrUpdateUserFromOAuth(user, authProvider).catch(err => {
                console.error('Error creating/updating OAuth user:', err);
                // Continue anyway - might already exist
              });
            }

            // Wait for auth state to be ready (user exists and role is set)
            setStatus(t('auth.callback.almostDone'));
            const authReady = await waitForAuthReady(5000);
            
            if (!authReady) {
              console.warn("Auth state not ready after timeout, but session exists - redirecting anyway");
              // Don't show error - we have a valid session
            }
          } catch (err) {
            console.error("Error processing OAuth callback:", err);
            // Check if we still have a valid session
            const { data: { session: checkSession } } = await supabaseClient.auth.getSession();
            if (!checkSession?.user) {
              // Only show error if we lost the session
              setStatus(t('auth.callback.errorOccurred'));
              setTimeout(() => redirectHome(), 1500);
              return;
            }
            // Continue anyway - auth state listener will handle it
          }
        }

        // Show success message briefly before redirect
        if (!cancelled) {
          setStatus(t('auth.callback.almostDone'));
          // Small delay to ensure state propagation
          await new Promise(resolve => setTimeout(resolve, 300));
          redirectHome();
        }
      } catch (err) {
        console.error("Unexpected error during OAuth callback:", err);
        // Check if we have a session despite the error
        const { data: { session: errorSession } } = await supabaseClient.auth.getSession();
        if (errorSession?.user) {
          // We have a session - don't show error, just redirect
          console.log("Session exists despite error, redirecting...");
          redirectHome();
        } else {
          setStatus(t('auth.callback.errorOccurred'));
          setTimeout(() => redirectHome(), 1500);
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('auth.callback.signingYouIn')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            router.replace("/");
          }}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {t('auth.callback.takeMeHome')}
        </button>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="flex justify-center">
            <svg
              className="animate-spin"
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="stroke-blue-500 dark:stroke-blue-400"
                cx="20"
                cy="20"
                r="16"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="100.53"
                strokeDashoffset="25.13"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}


