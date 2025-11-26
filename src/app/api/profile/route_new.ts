import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: profile, error } = await supabase
      .from("email_whitelist")
      .select(
        "id, email, full_name, username, gender, avatar_url, organization, phone, role, auth_provider, is_active, is_verified, created_at, updated_at",
      )
      .eq("email", email.trim().toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, username, gender, avatar_url } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      if (typeof full_name !== "string" || full_name.trim().length < 2) {
        return NextResponse.json(
          { error: "Full name must be at least 2 characters" },
          { status: 400 },
        );
      }
      updates.full_name = full_name.trim();
    }

    if (username !== undefined) {
      const normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 },
        );
      }
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return NextResponse.json(
          {
            error:
              "Username can only contain letters, numbers, and underscores",
          },
          { status: 400 },
        );
      }
      updates.username = normalizedUsername;
    }

    if (gender !== undefined) {
      if (!["male", "female"].includes(gender)) {
        return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
      }
      updates.gender = gender;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("email_whitelist")
      .select("id, username")
      .eq("email", email.trim().toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (updates.username && updates.username !== currentProfile.username) {
      const { data: existingUser } = await supabase
        .from("email_whitelist")
        .select("id")
        .eq("username", updates.username)
        .neq("id", currentProfile.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 },
        );
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("email_whitelist")
      .update(updates)
      .eq("id", currentProfile.id)
      .select(
        "id, email, full_name, username, gender, avatar_url, role, is_active, created_at, updated_at",
      )
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 },
    );
  }
}
