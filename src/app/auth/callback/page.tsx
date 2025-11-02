"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Finishing sign in…");
  const [setHasError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const redirectHome = async () => {
      if (!cancelled) {
        await router.replace("/");
        router.refresh();
      }
    };

    const handleCallback = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");

      if (error) {
        const message = errorDescription || error;
        setHasError(message);
        setStatus("Authentication failed. Redirecting to home…");
        setTimeout(() => redirectHome(), 1500);
        return;
      }

      if (!code) {
        redirectHome();
        return;
      }

      try {
        setStatus("Finalising session…");
        const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession({ code });
        if (exchangeError) {
          console.error("OAuth exchange error:", exchangeError);
          setStatus("Wait...");
          setTimeout(() => redirectHome(), 1500);
          return;
        }

        redirectHome();
      } catch (err) {
        console.error("Unexpected error during OAuth callback:", err);
        setStatus("Wait...");
        setTimeout(() => redirectHome(), 1500);
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Signing you in…</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Take me home
        </button>
      </div>
    </div>
  );
}


