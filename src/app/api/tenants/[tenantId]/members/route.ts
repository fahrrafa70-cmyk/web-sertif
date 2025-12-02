import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 },
      );
    }

    console.log(`🔍 [API] Fetching members for tenant: ${tenantId}`);

    // Step 1: Fetch tenant members
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from("tenant_members")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("❌ [API] Failed to fetch tenant members:", membersError);
      return NextResponse.json(
        { error: `Failed to fetch tenant members: ${membersError.message}` },
        { status: 500 },
      );
    }

    if (!membersData || membersData.length === 0) {
      console.log("⚠️ [API] No members found");
      return NextResponse.json({ members: [] });
    }

    console.log(`✅ [API] Found ${membersData.length} members`);
    console.log(
      `📋 [API] Members data:`,
      membersData.map((m) => ({ id: m.id, user_id: m.user_id, role: m.role })),
    );

    // Step 2: Get unique user IDs
    const userIds = [...new Set(membersData.map((m) => m.user_id))];
    console.log(`🔍 [API] User IDs to lookup:`, userIds);

    // Step 3: Get auth users data to get emails
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("❌ [API] Failed to fetch auth users:", authError);
      return NextResponse.json(
        { error: `Failed to fetch auth users: ${authError.message}` },
        { status: 500 },
      );
    }

    console.log(`✅ [API] Found ${authData.users.length} total auth users`);

    // Step 4: Create mapping of user_id → email
    const authUsersMap = new Map();
    authData.users.forEach((authUser) => {
      if (userIds.includes(authUser.id) && authUser.email) {
        authUsersMap.set(authUser.id, authUser.email);
        console.log(
          `🔑 [API] Auth mapping: ${authUser.id} → ${authUser.email}`,
        );
      }
    });

    console.log(
      `📊 [API] Auth users mapped: ${authUsersMap.size} out of ${userIds.length}`,
    );

    // Step 5: Get emails to query
    const emails = Array.from(authUsersMap.values());
    console.log(`📧 [API] Emails to lookup in email_whitelist:`, emails);

    if (emails.length === 0) {
      console.warn(
        `⚠️ [API] No emails found for user IDs. Returning members with email-only data.`,
      );
      const members = membersData.map((member) => ({
        ...member,
        user: null,
      }));
      return NextResponse.json({ members });
    }

    // Step 6: Fetch profiles from email_whitelist
    console.log(`📋 [API] Querying email_whitelist table...`);

    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("email_whitelist")
      .select("id, email, full_name, username, gender, avatar_url")
      .in("email", emails);

    if (profilesError) {
      console.error("❌ [API] Failed to fetch profiles:", profilesError);
      console.error(
        "❌ [API] Error details:",
        JSON.stringify(profilesError, null, 2),
      );
      // Continue with empty profiles
    } else {
      console.log(
        `✅ [API] Found ${profilesData?.length || 0} profiles in email_whitelist`,
      );
      if (profilesData && profilesData.length > 0) {
        profilesData.forEach((p) => {
          console.log(`👤 [API] Profile found:`, {
            email: p.email,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url ? "YES" : "NO",
          });
        });
      } else {
        console.warn(`⚠️ [API] No profiles found for emails:`, emails);
        console.warn(
          `⚠️ [API] These emails don't exist in email_whitelist table`,
        );

        // Let's also check what's actually in the email_whitelist table
        const { data: allProfiles } = await supabaseAdmin
          .from("email_whitelist")
          .select("email")
          .limit(10);
        console.log(
          `📋 [API] Sample emails in email_whitelist:`,
          allProfiles?.map((p) => p.email) || [],
        );
      }
    }

    // Step 7: Map auth user_id to profile data
    const usersMap = new Map();
    authUsersMap.forEach((email, authUserId) => {
      const profile = profilesData?.find((p) => p.email === email);
      if (profile) {
        usersMap.set(authUserId, {
          id: authUserId,
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        });
        console.log(
          `✅ [API] Mapped ${authUserId} to profile: ${profile.full_name} (${profile.username})`,
        );
      } else {
        // Fallback with just email
        usersMap.set(authUserId, {
          id: authUserId,
          email: email,
          full_name: null,
          username: null,
          avatar_url: null,
        });
        console.log(
          `⚠️ [API] No profile found for ${authUserId} (${email}), using email only`,
        );
      }
    });

    // Step 8: Combine member data with user data
    const members = membersData.map((member) => {
      const userData = usersMap.get(member.user_id);
      console.log(
        `👥 [API] Final member: ${member.user_id} →`,
        userData ? `${userData.full_name || userData.email}` : "NO DATA",
      );
      return {
        ...member,
        user: userData || null,
      };
    });

    console.log(`✅ [API] Returning ${members.length} members with profiles`);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("💥 [API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
