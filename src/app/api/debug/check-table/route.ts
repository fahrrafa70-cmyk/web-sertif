import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Debug endpoint to check if email_whitelist table exists and is accessible
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase credentials not configured" },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test 1: Check if table exists
    console.log("🔍 [DEBUG] Checking email_whitelist table...");

    const { data: testData, error: testError } = await adminClient
      .from("email_whitelist")
      .select("*")
      .limit(1);

    if (testError) {
      console.error("❌ [DEBUG] Table check failed:", testError);
      return NextResponse.json(
        {
          tableExists: false,
          error: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint,
        },
        { status: 500 },
      );
    }

    // Test 2: Try to insert a test record
    const testEmail = `test-${Date.now()}@example.com`;
    console.log(`🔍 [DEBUG] Testing insert with email: ${testEmail}`);

    const { data: insertData, error: insertError } = await adminClient
      .from("email_whitelist")
      .insert({
        email: testEmail,
        full_name: "Test User",
        // Only insert minimal required fields
        // Let database handle defaults for role, timestamps, etc.
      })
      .select();

    if (insertError) {
      console.error("❌ [DEBUG] Insert test failed:", insertError);
      return NextResponse.json(
        {
          tableExists: true,
          canQuery: true,
          canInsert: false,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
        { status: 500 },
      );
    }

    // Test 3: Delete test record
    await adminClient.from("email_whitelist").delete().eq("email", testEmail);

    // Test 4: Count records
    const { count } = await adminClient
      .from("email_whitelist")
      .select("*", { count: "exact", head: true });

    console.log("✅ [DEBUG] All tests passed!");

    return NextResponse.json({
      tableExists: true,
      canQuery: true,
      canInsert: true,
      canDelete: true,
      totalRecords: count,
      testData: insertData,
      message: "email_whitelist table is working correctly",
    });
  } catch (err) {
    console.error("❌ [DEBUG] Unexpected error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
