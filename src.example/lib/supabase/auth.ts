import { supabaseClient } from "./client";

export async function signInWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      throw new Error("Invalid email or password.");
    }
    throw new Error(error.message);
  }
  return { user: data.user, session: data.session };
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


