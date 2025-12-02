/**
 * Verify and fix email_whitelist table
 * This script checks if the table exists and has correct structure
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyTable() {
  console.log("🔍 Checking email_whitelist table...\n");

  // Test 1: Check if table exists by trying to query it
  console.log("Test 1: Table existence check");
  const { data: testData, error: testError } = await supabase
    .from("email_whitelist")
    .select("*")
    .limit(1);

  if (testError) {
    console.error("❌ Table does not exist or has errors:", testError.message);
    console.error("   Code:", testError.code);
    console.error("   Details:", testError.details);
    console.error("   Hint:", testError.hint);
    console.log(
      "\n📝 Please run migration: migrations/008_create_email_whitelist_table.sql",
    );
    return false;
  }

  console.log("✅ Table exists\n");

  // Test 2: Try to insert a test record
  console.log("Test 2: Insert test record");
  const testEmail = `test-${Date.now()}@example.com`;
  const { data: insertData, error: insertError } = await supabase
    .from("email_whitelist")
    .insert({
      email: testEmail,
      full_name: "Test User",
      role: "user",
      auth_provider: "email",
      is_active: true,
      is_verified: false,
    })
    .select();

  if (insertError) {
    console.error("❌ Failed to insert test record:", insertError.message);
    console.error("   Code:", insertError.code);
    console.error("   Details:", insertError.details);
    console.error("   Hint:", insertError.hint);
    return false;
  }

  console.log("✅ Insert successful");
  console.log("   Data:", JSON.stringify(insertData, null, 2));

  // Test 3: Clean up test record
  console.log("\nTest 3: Delete test record");
  const { error: deleteError } = await supabase
    .from("email_whitelist")
    .delete()
    .eq("email", testEmail);

  if (deleteError) {
    console.error("❌ Failed to delete test record:", deleteError.message);
    return false;
  }

  console.log("✅ Delete successful\n");

  // Test 4: Count existing records
  console.log("Test 4: Count existing records");
  const { count, error: countError } = await supabase
    .from("email_whitelist")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ Failed to count records:", countError.message);
    return false;
  }

  console.log(`✅ Total records in email_whitelist: ${count}\n`);

  return true;
}

async function showRecentRegistrations() {
  console.log("📋 Recent registrations (last 10):");
  const { data, error } = await supabase
    .from("email_whitelist")
    .select("email, full_name, role, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Failed to fetch records:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("   No records found\n");
    return;
  }

  console.table(data);
}

async function main() {
  console.log("🚀 Email Whitelist Table Verification\n");
  console.log("=".repeat(60));
  console.log("\n");

  const isValid = await verifyTable();

  if (isValid) {
    console.log("=".repeat(60));
    console.log("✅ All tests passed! Table is working correctly.\n");
    await showRecentRegistrations();
  } else {
    console.log("=".repeat(60));
    console.log("❌ Table verification failed!\n");
    console.log("Please check the errors above and fix the table structure.");
    process.exit(1);
  }
}

main().catch(console.error);
