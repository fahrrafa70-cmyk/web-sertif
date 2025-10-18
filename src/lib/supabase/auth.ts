import { supabaseClient } from "./client";

export async function signInWithEmailPassword(email: string, password: string) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Supabase auth error:', error);
      
      // Handle specific error cases
      if (error.message.toLowerCase().includes("invalid login") || 
          error.message.toLowerCase().includes("invalid credentials")) {
        throw new Error("Invalid email or password.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Please check your email and confirm your account before signing in.");
      } else if (error.message.toLowerCase().includes("too many requests")) {
        throw new Error("Too many login attempts. Please try again later.");
      } else if (error.message.toLowerCase().includes("refresh token")) {
        throw new Error("Session expired. Please sign in again.");
      }
      
      throw new Error(error.message);
    }
    
    return { user: data.user, session: data.session };
  } catch (err) {
    // Re-throw our custom errors, but wrap unexpected errors
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("An unexpected authentication error occurred.");
  }
}

export async function getUserRoleByEmail(email: string): Promise<"admin" | "team" | "user" | null> {
  const { data, error } = await supabaseClient
    .from("users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    // Role data missing for an authenticated account
    return null;
  }

  const role = (data.role as string | null)?.toLowerCase();
  if (role === "admin" || role === "team" || role === "user") return role;
  return null;
}


