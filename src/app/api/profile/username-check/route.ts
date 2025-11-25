import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkUsernameAvailability,
  getUserProfileByEmail,
} from "@/lib/supabase/email-whitelist";

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

    // Enhanced username validation: lowercase alphanumeric and underscore only
    const normalizedUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]+$/;
    
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json(
        {
          available: false,
          error: "Username can only contain lowercase letters, numbers, and underscores",
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
        } = await supabase.auth.getUser();

        if (user && user.email) {
          try {
            // Get profile from email_whitelist to get the correct ID
            const profile = await getUserProfileByEmail(user.email);
            if (profile) {
              currentUserId = profile.id;
              console.log(`👤 API: Found user profile ID: ${currentUserId}`);
            } else {
              console.log(`⚠️ API: No profile found for email: ${user.email}`);
            }
          } catch (profileError) {
            console.error("❌ API: Error getting user profile:", profileError);
          }
        }
      } catch (err) {
        // Continue without current user ID if auth fails
        console.log(
          "Auth check failed, continuing without user ID:",
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    }

    console.log(
      `🎯 API: Checking username "${normalizedUsername}" for user ${currentUserId}`,
    );

    // Check availability with detailed error handling
    let isAvailable: boolean;
    try {
      isAvailable = await checkUsernameAvailability(
        normalizedUsername,
        currentUserId,
      );
    } catch (checkError) {
      console.error("❌ API: Error in checkUsernameAvailability:", checkError);
      return NextResponse.json(
        {
          error:
            checkError instanceof Error
              ? checkError.message
              : "Database error checking username",
          available: false,
        },
        { status: 500 },
      );
    }

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
      },
      { status: 500 },
    );
  }
}
