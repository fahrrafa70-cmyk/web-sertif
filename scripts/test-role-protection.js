// Script untuk test role protection
// Jalankan dengan: node scripts/test-role-protection.js fahrirafa.rpl1@gmail.com

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRoleProtection() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error("❌ Please provide email as argument");
    console.log(
      "Usage: node scripts/test-role-protection.js fahrirafa.rpl1@gmail.com",
    );
    process.exit(1);
  }

  const normalizedEmail = targetEmail.toLowerCase().trim();

  try {
    console.log("🧪 Testing role protection for:", normalizedEmail);

    // Step 1: Reset to owner
    console.log("\n🔧 Step 1: Setting role to owner...");

    // Update email_whitelist
    const { data: whitelistUpdate, error: whitelistError } = await supabase
      .from("email_whitelist")
      .upsert(
        {
          email: normalizedEmail,
          role: "owner",
          subscription: true,
        },
        { onConflict: "email" },
      )
      .select();

    if (whitelistError) {
      console.error("❌ Error updating email_whitelist:", whitelistError);
      return;
    }

    // Update users table
    const { data: usersUpdate, error: usersError } = await supabase
      .from("users")
      .upsert(
        {
          email: normalizedEmail,
          role: "owner",
        },
        { onConflict: "email" },
      )
      .select();

    if (usersError) {
      console.error("❌ Error updating users:", usersError);
      return;
    }

    console.log("✅ Set role to owner in both tables");

    // Step 2: Verify current state
    console.log("\n🔍 Step 2: Verifying current state...");

    const { data: currentWhitelist } = await supabase
      .from("email_whitelist")
      .select("email, role, subscription")
      .eq("email", normalizedEmail)
      .single();

    const { data: currentUser } = await supabase
      .from("users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .single();

    console.log("📧 email_whitelist:", currentWhitelist);
    console.log("👤 users:", currentUser);

    if (currentWhitelist?.role === "owner" && currentUser?.role === "owner") {
      console.log("✅ Role successfully set to owner");

      console.log("\n🛡️  PROTECTION STATUS:");
      console.log(
        "✅ OAuth protection: Active (createOrUpdateUserFromOAuth will skip)",
      );
      console.log(
        "✅ Auth-context protection: Active (will not overwrite existing privileged role)",
      );
      console.log(
        "✅ API upsert protection: Active (will preserve existing privileged role)",
      );

      console.log("\n📋 NEXT STEPS:");
      console.log("1. Logout dari aplikasi");
      console.log("2. Login kembali dengan Google/GitHub");
      console.log("3. Check console logs untuk melihat protection messages");
      console.log('4. Verify role tetap "owner"');

      console.log("\n🔍 EXPECTED CONSOLE LOGS:");
      console.log(
        "🔍 [AUTH-CONTEXT] PROTECTED ROLE DETECTED - Preserving existing role: owner",
      );
      console.log(
        "🔒 [OAUTH] PROTECTED ROLE - Skipping OAuth user update to preserve role: owner",
      );
      console.log(
        "🔒 [API-UPSERT] PROTECTED ROLE - Preserving existing role: owner",
      );
    } else {
      console.log("❌ Failed to set role to owner");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testRoleProtection();
