import { useState, useCallback } from "react";
import { UserProfile, UpdateProfileInput } from "@/lib/supabase/users";
import { supabaseClient } from "@/lib/supabase/client";

interface UseProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
  checkingUsername: boolean;
}

interface UseProfileActions {
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<boolean>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  clearError: () => void;
}

export function useProfile(): UseProfileState & UseProfileActions {
  const [state, setState] = useState<UseProfileState>({
    profile: null,
    loading: false,
    error: null,
    updating: false,
    checkingUsername: false,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const fetchProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Fetch profile via API
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch profile");
      }

      setState((prev) => ({
        ...prev,
        profile: data.data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      console.error("Error fetching profile:", err);
      setState((prev) => ({
        ...prev,
        profile: null,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch profile",
      }));
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput): Promise<boolean> => {
      setState((prev) => ({ ...prev, updating: true, error: null }));

      try {
        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Authentication required");
        }

        // Update profile via API
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to update profile");
        }

        setState((prev) => ({
          ...prev,
          profile: data.data,
          updating: false,
          error: null,
        }));

        return true;
      } catch (err) {
        console.error("Error updating profile:", err);
        setState((prev) => ({
          ...prev,
          updating: false,
          error:
            err instanceof Error ? err.message : "Failed to update profile",
        }));
        return false;
      }
    },
    [],
  );

  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<boolean> => {
      if (!username || username.trim().length < 3) {
        console.log("🚫 Username too short:", username);
        return false;
      }

      setState((prev) => ({ ...prev, checkingUsername: true }));

      try {
        // Get current session for authenticated check
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Add auth header if user is authenticated
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        console.log(`🌐 Frontend: Checking username "${username}"`);

        const response = await fetch(
          `/api/profile/username-check?username=${encodeURIComponent(username)}`,
          {
            method: "GET",
            headers,
          },
        );

        console.log(`📡 Frontend: API response status:`, response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Frontend: Username check failed:", errorData);
          return false;
        }

        const data = await response.json();
        console.log(`📋 Frontend: API response data:`, data);

        const isAvailable = data.available === true;
        console.log(`🎯 Frontend: Final availability result:`, isAvailable);

        return isAvailable;
      } catch (err) {
        console.error(
          "💥 Frontend: Error checking username availability:",
          err,
        );
        return false;
      } finally {
        setState((prev) => ({ ...prev, checkingUsername: false }));
      }
    },
    [],
  );

  return {
    ...state,
    fetchProfile,
    updateProfile,
    checkUsernameAvailability,
    clearError,
  };
}
