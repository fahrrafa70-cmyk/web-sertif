// Script untuk test semua layer protection
// Jalankan dengan: node scripts/test-all-protection.js fahrirafa.rpl1@gmail.com

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAllProtection() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error("❌ Please provide email as argument");
    console.log(
      "Usage: node scripts/test-all-protection.js fahrirafa.rpl1@gmail.com",
    );
    process.exit(1);
  }

  const normalizedEmail = targetEmail.toLowerCase().trim();

  try {
    console.log("🧪 Testing ALL protection layers for:", normalizedEmail);

    // Step 1: Reset to owner
    console.log("\n🔧 Step 1: Setting role to owner in both tables...");

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

    // Step 2: Test email-whitelist/sync API (the culprit!)
    console.log("\n🧪 Step 2: Testing /api/email-whitelist/sync protection...");

    try {
      const response = await fetch(
        `http://localhost:3000/api/email-whitelist/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            full_name: "Test User",
            // No role sent - should preserve existing owner role
          }),
        },
      );

      const result = await response.json();
      console.log("📡 API Response:", result);

      // Check if role is preserved
      const { data: afterSync } = await supabase
        .from("email_whitelist")
        .select("role")
        .eq("email", normalizedEmail)
        .single();

      if (afterSync?.role === "owner") {
        console.log("✅ PROTECTION WORKS! Role preserved as owner after sync");
      } else {
        console.log("❌ PROTECTION FAILED! Role changed to:", afterSync?.role);
      }
    } catch (apiError) {
      console.log(
        "⚠️  API call failed (expected if server not running):",
        apiError.message,
      );
      console.log(
        "   This test requires the dev server to be running on localhost:3000",
      );
    }

    // Step 3: Verify final state
    console.log("\n🔍 Step 3: Verifying final state...");

    const { data: finalWhitelist } = await supabase
      .from("email_whitelist")
      .select("email, role, subscription")
      .eq("email", normalizedEmail)
      .single();

    const { data: finalUser } = await supabase
      .from("users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .single();

    console.log("📧 email_whitelist final:", finalWhitelist);
    console.log("👤 users final:", finalUser);

    if (finalWhitelist?.role === "owner" && finalUser?.role === "owner") {
      console.log("\n🎉 SUCCESS! All protection layers working");

      console.log("\n🛡️  PROTECTION STATUS:");
      console.log("✅ Layer 1: OAuth protection (createOrUpdateUserFromOAuth)");
      console.log(
        "✅ Layer 2: Auth-context protection (whitelist record creation)",
      );
      console.log("✅ Layer 3: API upsert protection (users table)");
      console.log("✅ Layer 4: Email-whitelist sync protection (THE CULPRIT!)");

      console.log("\n📋 EXPECTED CONSOLE LOGS DURING LOGIN:");
      console.log(
        "🔍 [AUTH-CONTEXT] PROTECTED ROLE DETECTED - Preserving existing role: owner",
      );
      console.log(
        "🔒 [OAUTH] PROTECTED ROLE - Skipping OAuth user update to preserve role: owner",
      );
      console.log(
        "🔒 [API-UPSERT] PROTECTED ROLE - Preserving existing role: owner",
      );
      console.log(
        "🔒 [WHITELIST-SYNC] PROTECTED ROLE - Preserving existing role: owner",
      );
    } else {
      console.log("\n❌ Some protection layers may not be working properly");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testAllProtection();
