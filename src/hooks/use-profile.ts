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
      console.log("📥 Fetching profile directly from Supabase...");

      // Get current user ID
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (!user || userError) {
        throw new Error("Authentication required. Please log in again.");
      }

      console.log("👤 Fetching profile for user ID:", user.id);

      // Fetch profile directly from Supabase database
      const { data, error } = await supabaseClient
        .from("users")
        .select(
          "id, email, full_name, username, gender, avatar_url, auth_provider, created_at, updated_at",
        )
        .eq("id", user.id);

      if (error) {
        console.error("❌ Supabase fetch error:", error);
        throw new Error(error.message || "Failed to fetch profile");
      }

      console.log("✅ Profile fetched successfully:", data);

      // Fetch returns array, get first item (should be only one)
      const profile = Array.isArray(data) ? data[0] : data;

      if (!profile) {
        throw new Error("Profile not found");
      }

      setState((prev) => ({
        ...prev,
        profile: profile,
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
        console.log("💾 Updating profile directly with Supabase...");
        console.log("📝 Updates to apply:", updates);

        // Get current user ID
        const {
          data: { user },
          error: userError,
        } = await supabaseClient.auth.getUser();

        if (!user || userError) {
          throw new Error("Authentication required. Please log in again.");
        }

        console.log("👤 Current user ID:", user.id);

        // Try UPDATE first
        const { data, error } = await supabaseClient
          .from("users")
          .update({
            full_name: updates.full_name,
            username: updates.username,
            gender: updates.gender,
            avatar_url: updates.avatar_url,
          })
          .eq("id", user.id)
          .select(
            "id, email, full_name, username, gender, avatar_url, auth_provider, created_at, updated_at",
          );

        if (error) {
          console.error("Supabase error:", error);
          throw new Error(error.message || "Failed to update profile");
        }

        console.log("Update result:", data);

        // If no row updated, user doesn't exist in custom table - create it
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.log("🆕 User not in custom table, creating record...");

          const { data: newData, error: insertError } = await supabaseClient
            .from("users")
            .insert({
              id: user.id,
              email: user.email || "",
              full_name: updates.full_name,
              username: updates.username,
              gender: updates.gender,
              avatar_url: updates.avatar_url,
            })
            .select(
              "id, email, full_name, username, gender, avatar_url, auth_provider, created_at, updated_at",
            );

          if (insertError) {
            console.error("Insert error:", insertError);
            throw new Error(insertError.message || "Failed to create profile");
          }

          console.log("✅ Profile created:", newData);

          // Use inserted data
          const createdProfile = Array.isArray(newData) ? newData[0] : newData;

          setState((prev) => ({
            ...prev,
            profile: createdProfile,
            updating: false,
            error: null,
          }));

          return true;
        }

        // Update returns array, get first item
        const updatedProfile = Array.isArray(data) ? data[0] : data;

        setState((prev) => ({
          ...prev,
          profile: updatedProfile,
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
        return false;
      }

      setState((prev) => ({ ...prev, checkingUsername: true }));

      try {
        console.log("🔍 Checking username availability directly:", username);

        // Get current user ID to exclude from check
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        const currentUserId = user?.id;

        // Check if username exists (excluding current user)
        let query = supabaseClient
          .from("users")
          .select("username")
          .eq("username", username.trim());

        if (currentUserId) {
          query = query.neq("id", currentUserId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("❌ Username check error:", error);
          // On error, assume available to avoid false blocking
          return true;
        }

        const isAvailable = !data || data.length === 0;
        console.log("✅ Username available:", isAvailable);

        return isAvailable;
      } catch (err) {
        console.error("Username check failed:", err);
        // On error, assume available to avoid false blocking
        return true;
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
