import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserProfile, updateUserProfile, UpdateProfileInput } from '@/lib/supabase/users';

// Get current user profile
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Server configuration error. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      }, { status: 500 });
    }

    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: { authorization: `Bearer ${token}` }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get user profile
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error('💥 Error fetching user profile:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Failed to fetch profile' 
    }, { status: 500 });
  }
}

// Update current user profile
export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Server configuration error. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      }, { status: 500 });
    }

    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: { authorization: `Bearer ${token}` }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { full_name, username, gender, avatar_url } = body;

    // Validate input
    const updates: UpdateProfileInput = {};
    
    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || full_name.trim().length === 0) {
        return NextResponse.json({ error: 'Full name must be a non-empty string' }, { status: 400 });
      }
      updates.full_name = full_name;
    }

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
      }
      // Username validation: alphanumeric and underscore only
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        return NextResponse.json({ 
          error: 'Username can only contain letters, numbers, and underscores' 
        }, { status: 400 });
      }
      updates.username = username;
    }

    if (gender !== undefined) {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      if (typeof gender !== 'string' || !validGenders.includes(gender)) {
        return NextResponse.json({ 
          error: 'Gender must be one of: male, female, other, prefer_not_to_say' 
        }, { status: 400 });
      }
      updates.gender = gender as UpdateProfileInput['gender'];
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url !== 'string') {
        return NextResponse.json({ error: 'Avatar URL must be a string' }, { status: 400 });
      }
      updates.avatar_url = avatar_url;
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Update profile
    const updatedProfile = await updateUserProfile(user.id, updates);

    return NextResponse.json({ 
      success: true, 
      data: updatedProfile,
      message: 'Profile updated successfully' 
    });

  } catch (err) {
    console.error('💥 Error updating user profile:', err);
    
    // Handle specific errors
    if (err instanceof Error) {
      if (err.message.includes('Username is already taken')) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
