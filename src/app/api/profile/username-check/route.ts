import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client
function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

// Check username availability
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 API: Username check request started");

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    console.log("📝 API: Username parameter:", username);

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 },
      );
    }

    // Basic validation
    if (username.trim().length < 3) {
      return NextResponse.json(
        {
          available: false,
          error: "Username must be at least 3 characters",
        },
        { status: 400 },
      );
    }

    // Enhanced username validation: lowercase alphanumeric and underscore only
    const normalizedUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]+$/;

    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json(
        {
          available: false,
          error:
            "Username can only contain lowercase letters, numbers, and underscores",
        },
        { status: 400 },
      );
    }

    if (normalizedUsername.length > 50) {
      return NextResponse.json(
        {
          available: false,
          error: "Username must be less than 50 characters",
        },
        { status: 400 },
      );
    }

    // Create server-side Supabase client
    const supabase = getSupabaseServer();

    // Get current user ID if authenticated (to exclude from check)
    let currentUserId: string | undefined;
    const authHeader = request.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const authSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: { authorization: `Bearer ${token}` },
            },
          },
        );

        const {
          data: { user },
        } = await authSupabase.auth.getUser();

        if (user && user.email) {
          // Get profile from email_whitelist to get the correct ID
          const { data: profile } = await supabase
            .from("email_whitelist")
            .select("id")
            .eq("email", user.email.trim().toLowerCase())
            .eq("is_active", true)
            .maybeSingle();

          if (profile) {
            currentUserId = profile.id;
            console.log(`👤 API: Found user profile ID: ${currentUserId}`);
          } else {
            console.log(`⚠️ API: No profile found for email: ${user.email}`);
          }
        }
      } catch (err) {
        console.log(
          "Auth check failed, continuing without user ID:",
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    }

    console.log(
      `🎯 API: Checking username "${normalizedUsername}" for user ${currentUserId}`,
    );

    // Check username availability directly with server-side client
    let query = supabase
      .from("email_whitelist")
      .select("id, username")
      .eq("username", normalizedUsername)
      .not("username", "is", null)
      .eq("is_active", true);

    // Exclude current user's record
    if (currentUserId) {
      query = query.neq("id", currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ API: Database error:", error);
      // Return available=true on error to avoid blocking user
      return NextResponse.json({
        available: true,
        username: normalizedUsername,
        warning: "Could not verify, please try again",
      });
    }

    console.log("📊 API: Query result:", data);
    const isAvailable = !data || data.length === 0;
    console.log(
      `✅ API: Username "${normalizedUsername}" available: ${isAvailable}`,
    );

    return NextResponse.json({
      available: isAvailable,
      username: normalizedUsername,
    });
  } catch (err) {
    console.error("💥 Error checking username availability:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to check username availability",
        available: true, // Return available on error to not block user
      },
      { status: 500 },
    );
  }
}
