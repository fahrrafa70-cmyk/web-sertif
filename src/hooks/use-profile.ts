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
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user?.email) {
        throw new Error("Not logged in");
      }

      const response = await fetch(
        `/api/profile?email=${encodeURIComponent(user.email)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

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
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (!user?.email) {
          throw new Error("Not logged in");
        }

        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updates, email: user.email }),
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
        return false;
      }

      setState((prev) => ({ ...prev, checkingUsername: true }));

      try {
        const response = await fetch(
          `/api/profile/username-check?username=${encodeURIComponent(username)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } },
        );

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return data.available === true;
      } catch {
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
