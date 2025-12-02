import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Handle empty or invalid JSON body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        console.error("❌ Empty request body received");
        return NextResponse.json(
          { error: "Request body is required" },
          { status: 400 },
        );
      }
      body = JSON.parse(text);
    } catch (jsonError) {
      console.error("❌ Invalid JSON in request body:", jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { id, email, full_name, avatar_url, auth_provider, password, role } =
      body ?? {};

    if (!id || !email) {
      return NextResponse.json(
        { error: "Missing required fields: id and email are mandatory." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Server configuration error. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 🔒 CRITICAL PROTECTION: Check existing role before overwriting
    // This prevents subscription users from losing their "owner" role during OAuth login
    console.log(
      "🔍 [API-UPSERT] Checking existing user role for:",
      email.toLowerCase(),
    );

    const { data: existingUser } = await supabase
      .from("users")
      .select("role, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    console.log("🔍 [API-UPSERT] Existing user:", existingUser);
    console.log("🔍 [API-UPSERT] Incoming role from request:", role);

    // Determine final role - PRESERVE privileged roles (owner/manager/staff)
    let finalRole = role ?? "user";

    if (existingUser?.role) {
      const existingRole = existingUser.role.toLowerCase();

      // CRITICAL: Never downgrade privileged roles to "user"
      if (
        existingRole === "owner" ||
        existingRole === "manager" ||
        existingRole === "staff"
      ) {
        console.log(
          "🔒 [API-UPSERT] PROTECTED ROLE DETECTED - Preserving:",
          existingRole,
        );
        console.log(
          "🔒 [API-UPSERT] Preventing downgrade from",
          existingRole,
          "to:",
          finalRole,
        );
        finalRole = existingRole; // Keep existing privileged role
      }
    }

    console.log("🔍 [API-UPSERT] Final role to be saved:", finalRole);

    const payload: Record<string, unknown> = {
      id,
      email: email.toLowerCase(),
      full_name: full_name ?? null,
      avatar_url: avatar_url ?? null,
      auth_provider: auth_provider ?? null,
      password:
        auth_provider === "google" || auth_provider === "github"
          ? "oauth_user_no_password" // Default password for OAuth users
          : (password ?? "default_password"), // Use provided password or default
      role: finalRole, // Use protected role instead of default
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("users")
      // Use email (unique key) as the upsert conflict target so we truly perform
      // an "upsert by email". This avoids duplicate key violations on
      // users_email_key when the auth user.id changes but the email stays the same.
      .upsert(payload, { onConflict: "email" })
      .select()
      .single();

    if (error) {
      console.error("❌ Upsert user failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("💥 Unexpected error during user upsert:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
