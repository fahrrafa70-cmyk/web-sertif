import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkUsernameAvailability } from "@/lib/supabase/users";

// Check username availability
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 API: Username check request started");

    // Check environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error("❌ Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

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

    // Username validation: alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      return NextResponse.json(
        {
          available: false,
          error: "Username can only contain letters, numbers, and underscores",
        },
        { status: 400 },
      );
    }

    // Get current user ID if authenticated (to exclude from check)
    let currentUserId: string | undefined;
    const authHeader = request.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);

        const supabase = createClient(
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
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.log(
            "⚠️ API: Auth error (continuing without user):",
            authError.message,
          );
        } else if (user) {
          currentUserId = user.id;
          console.log("✅ API: User authenticated:", user.id);
        } else {
          console.log("ℹ️ API: No user found (continuing without user)");
        }
      } catch {
        // Continue without current user ID if auth fails
        console.log("⚠️ API: Auth check failed, continuing without user ID:");
      }
    } else {
      console.log(
        "ℹ️ API: No auth header provided, checking username without user context",
      );
    }

    console.log(
      `🎯 API: Checking username "${username}" for user ${currentUserId}`,
    );

    // Check availability with detailed error handling
    let isAvailable: boolean;
    try {
      isAvailable = await checkUsernameAvailability(username, currentUserId);
      console.log(
        `✅ API: Username "${username}" availability result:`,
        isAvailable,
      );
    } catch (checkError) {
      console.error("❌ API: Error in checkUsernameAvailability:", checkError);

      // For username checking, return available=false on database errors
      // This is safer than throwing 500 errors for a non-critical check
      return NextResponse.json({
        available: false,
        error:
          "Unable to verify username availability at this time. Please try a different username.",
        username: username.toLowerCase().trim(),
      });
    }

    return NextResponse.json({
      available: isAvailable,
      username: username.toLowerCase().trim(),
    });
  } catch (err) {
    console.error("💥 Error checking username availability:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to check username availability",
      },
      { status: 500 },
    );
  }
}
