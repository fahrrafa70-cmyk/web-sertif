import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getUserProfileByEmail,
  updateUserProfile,
  UpdateProfileInput,
} from "@/lib/supabase/email-whitelist";

// Get current user profile
export async function GET(request: NextRequest) {
  try {
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

    // Get user from authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { authorization: `Bearer ${token}` },
        },
      },
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    // Get user profile by email from email_whitelist table
    const profile = await getUserProfileByEmail(user.email!);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error(" Error fetching user profile:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to fetch profile",
      },
      { status: 500 },
    );
  }
}

// Update current user profile
export async function PATCH(request: NextRequest) {
  try {
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

    // Get user from authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { authorization: `Bearer ${token}` },
        },
      },
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { full_name, username, gender, avatar_url, organization, phone } =
      body;

    // Validate input
    const updates: UpdateProfileInput = {};

    if (full_name !== undefined) {
      if (typeof full_name !== "string" || full_name.trim().length === 0) {
        return NextResponse.json(
          { error: "Full name must be a non-empty string" },
          { status: 400 },
        );
      }
      if (full_name.trim().length < 2) {
        return NextResponse.json(
          { error: "Full name must be at least 2 characters long" },
          { status: 400 },
        );
      }
      updates.full_name = full_name;
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 },
        );
      }
      if (username.trim().length > 50) {
        return NextResponse.json(
          { error: "Username must be less than 50 characters" },
          { status: 400 },
        );
      }
      // Enhanced username validation: lowercase alphanumeric and underscore only
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(username.trim().toLowerCase())) {
        return NextResponse.json(
          {
            error:
              "Username can only contain lowercase letters, numbers, and underscores",
          },
          { status: 400 },
        );
      }
      updates.username = username;
    }

    if (gender !== undefined) {
      const validGenders = ["male", "female", "other", "prefer_not_to_say"];
      if (typeof gender !== "string" || !validGenders.includes(gender)) {
        return NextResponse.json(
          {
            error:
              "Gender must be one of: male, female, other, prefer_not_to_say",
          },
          { status: 400 },
        );
      }
      updates.gender = gender as UpdateProfileInput["gender"];
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url !== "string") {
        return NextResponse.json(
          { error: "Avatar URL must be a string" },
          { status: 400 },
        );
      }
      updates.avatar_url = avatar_url;
    }

    if (organization !== undefined) {
      if (typeof organization !== "string") {
        return NextResponse.json(
          { error: "Organization must be a string" },
          { status: 400 },
        );
      }
      updates.organization = organization;
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return NextResponse.json(
          { error: "Phone must be a string" },
          { status: 400 },
        );
      }
      updates.phone = phone;
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 },
      );
    }

    // Get current profile to get the ID
    const currentProfile = await getUserProfileByEmail(user.email!);
    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Update profile using email_whitelist ID
    const updatedProfile = await updateUserProfile(currentProfile.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error(" Error updating user profile:", err);

    // Handle specific errors
    if (err instanceof Error) {
      if (err.message.includes("Username is already taken")) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 },
        );
      }
      if (err.message.includes("Username must be at least 3 characters")) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters long" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
