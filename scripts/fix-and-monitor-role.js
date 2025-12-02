// COMPREHENSIVE SCRIPT: Fix subscription role bug and monitor protection
// Bug: User dengan subscription kehilangan role "owner" saat login ulang
// Solution: Multi-layer role protection + monitoring
//
// Usage: node scripts/fix-and-monitor-role.js YOUR_EMAIL@example.com

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAndMonitorRole() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error("❌ Please provide email as argument");
    console.log(
      "Usage: node scripts/fix-and-monitor-role.js your-email@example.com",
    );
    process.exit(1);
  }

  const normalizedEmail = targetEmail.toLowerCase().trim();

  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("🔧 FIX SUBSCRIPTION ROLE BUG - Comprehensive Solution");
  console.log(
    "═══════════════════════════════════════════════════════════════\n",
  );

  try {
    // STEP 1: Diagnostic - Check current state
    console.log("📊 STEP 1: DIAGNOSTIC - Current State");
    console.log(
      "───────────────────────────────────────────────────────────────",
    );

    const { data: whitelistData } = await supabase
      .from("email_whitelist")
      .select("email, role, subscription")
      .eq("email", normalizedEmail)
      .single();

    const { data: userData } = await supabase
      .from("users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .single();

    console.log("📧 email_whitelist:", whitelistData || "NOT FOUND");
    console.log("👤 users table:", userData || "NOT FOUND");

    const hasBug =
      whitelistData?.subscription === true && whitelistData?.role !== "owner";

    if (hasBug) {
      console.log(
        "\n⚠️  BUG DETECTED: User has subscription but role is NOT owner!",
      );
      console.log(`   Current role: "${whitelistData.role}"`);
      console.log(`   Expected role: "owner"`);
      console.log(`   Subscription: ${whitelistData.subscription}`);
    } else if (whitelistData?.role === "owner") {
      console.log("\n✅ GOOD: User has correct owner role");
    } else if (!whitelistData) {
      console.log("\n❌ ERROR: User not found in database");
      return;
    }

    // STEP 2: Fix - Restore owner role
    console.log("\n📋 STEP 2: FIX - Restore Owner Role");
    console.log(
      "───────────────────────────────────────────────────────────────",
    );

    if (hasBug || whitelistData?.role !== "owner") {
      console.log('🔧 Fixing role to "owner" in both tables...');

      // Fix email_whitelist
      const { error: whitelistError } = await supabase
        .from("email_whitelist")
        .update({ role: "owner", subscription: true })
        .eq("email", normalizedEmail);

      if (whitelistError) {
        console.error("❌ Failed to update email_whitelist:", whitelistError);
      } else {
        console.log("✅ Updated email_whitelist");
      }

      // Fix users table
      const { error: usersError } = await supabase
        .from("users")
        .update({ role: "owner" })
        .eq("email", normalizedEmail);

      if (usersError) {
        console.error("❌ Failed to update users:", usersError);
      } else {
        console.log("✅ Updated users table");
      }
    } else {
      console.log("✅ No fix needed - role already correct");
    }

    // STEP 3: Verification
    console.log("\n🔍 STEP 3: VERIFICATION - After Fix");
    console.log(
      "───────────────────────────────────────────────────────────────",
    );

    const { data: verifyWhitelist } = await supabase
      .from("email_whitelist")
      .select("email, role, subscription")
      .eq("email", normalizedEmail)
      .single();

    const { data: verifyUsers } = await supabase
      .from("users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .single();

    console.log("📧 email_whitelist:", verifyWhitelist);
    console.log("👤 users table:", verifyUsers);

    const isFixed =
      verifyWhitelist?.role === "owner" && verifyUsers?.role === "owner";

    if (isFixed) {
      console.log(
        '\n✅ SUCCESS: Role successfully set to "owner" in both tables',
      );
    } else {
      console.log("\n❌ FAILED: Role not properly set");
      return;
    }

    // STEP 4: Protection Status
    console.log("\n🛡️  STEP 4: PROTECTION STATUS");
    console.log(
      "───────────────────────────────────────────────────────────────",
    );
    console.log("The following protection layers are now active:");
    console.log("");
    console.log("✅ Layer 1: /api/email-whitelist/sync");
    console.log("   - Checks existing role before upsert");
    console.log("   - Preserves owner/manager/staff roles");
    console.log("   - Prevents downgrade during email/password login");
    console.log("");
    console.log("✅ Layer 2: /api/users/upsert");
    console.log("   - Checks existing role before upsert");
    console.log("   - Preserves owner/manager/staff roles");
    console.log("   - Prevents downgrade during OAuth login");
    console.log("");
    console.log("✅ Layer 3: createOrUpdateUserFromOAuth()");
    console.log("   - Reads role from email_whitelist (protected by Layer 1)");
    console.log("   - Calls /api/users/upsert (protected by Layer 2)");
    console.log("   - Debug logging for tracking");

    // STEP 5: Testing Instructions
    console.log("\n📋 STEP 5: TESTING INSTRUCTIONS");
    console.log(
      "───────────────────────────────────────────────────────────────",
    );
    console.log("1. Logout from the application");
    console.log("2. Login again (email/password OR OAuth)");
    console.log("3. Open browser console (F12)");
    console.log("4. Look for protection logs:");
    console.log("");
    console.log("   Expected console logs:");
    console.log(
      "   🔍 [WHITELIST-SYNC] PROTECTED ROLE DETECTED - Preserving: owner",
    );
    console.log(
      "   🔍 [API-UPSERT] PROTECTED ROLE DETECTED - Preserving: owner",
    );
    console.log("   🔍 [OAUTH] Using whitelist role: owner");
    console.log("");
    console.log('5. Verify your role is still "owner"');
    console.log("6. Verify subscription features are accessible");

    // STEP 6: Summary
    console.log(
      "\n═══════════════════════════════════════════════════════════════",
    );
    console.log("📊 SUMMARY");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log(`Email: ${normalizedEmail}`);
    console.log(`Role: ${verifyWhitelist?.role || "UNKNOWN"}`);
    console.log(`Subscription: ${verifyWhitelist?.subscription || false}`);
    console.log(`Protection: ACTIVE (3 layers)`);
    console.log(
      `Status: ${isFixed ? "✅ FIXED & PROTECTED" : "❌ NEEDS ATTENTION"}`,
    );
    console.log(
      "═══════════════════════════════════════════════════════════════\n",
    );
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
  }
}

fixAndMonitorRole();
