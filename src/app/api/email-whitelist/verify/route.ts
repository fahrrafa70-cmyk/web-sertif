import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Mark user as verified in email_whitelist after email confirmation
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { email } = (body || {}) as { email?: string };
    const normalizedEmail = email?.toLowerCase().trim() || "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured for verify endpoint");
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Update is_verified to true
    const { error } = await adminClient
      .from("email_whitelist")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("email", normalizedEmail);

    if (error) {
      console.error("Failed to mark user as verified:", error);
      return NextResponse.json(
        { error: "Failed to verify user." },
        { status: 500 },
      );
    }

    console.log(`✅ User marked as verified: ${normalizedEmail}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in /api/email-whitelist/verify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
