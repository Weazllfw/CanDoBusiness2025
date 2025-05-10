import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
// Replace with your actual Supabase URL and Anon Key
// It's best to use environment variables for these in a real setup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'; // Or your specific local URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'; // Replace with your actual anon key

const ADMIN_EMAIL = 'rmarshall@itmarshall.net';
const ADMIN_PASSWORD = 'rmlog!n2024'; // CHANGE THIS or use env variable
const ADMIN_USERNAME = 'Robert Marshall'; // Or SystemAdmin, etc.
const ADMIN_AVATAR_URL = 'https://placehold.co/64x64/7f56d9/white?text=SA'; // System Admin placeholder

async function setupAdmin() {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-anon-key') {
    console.error('ERROR: SUPABASE_ANON_KEY is not set or is using the placeholder value.');
    console.error('Please set it in this script or as an environment variable.');
    console.error('You can find your anon key in the Supabase project dashboard or when you run `supabase status`.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`Attempting to set up admin user: ${ADMIN_EMAIL}`);

  let adminUserId = null;
  let userExists = false;

  // 1. Attempt to sign in the admin user first
  console.log('Attempting to sign in admin user...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (signInData && signInData.user) {
    adminUserId = signInData.user.id;
    userExists = true;
    console.log(`Admin user already exists and signed in. User ID: ${adminUserId}`);
    await supabase.auth.signOut(); // Sign out after retrieving ID
  } else if (signInError && signInError.message.toLowerCase().includes('invalid login credentials')) {
    console.log('Admin user does not exist or password incorrect. Attempting to sign up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (signUpError) {
      console.error('Error signing up admin user:', signUpError.message);
      // Check if it's a race condition where user was created between signIn and signUp
      if (signUpError.message.includes('User already registered')) {
        console.error('Race condition? User was created between signIn and signUp attempts. Try re-running script.');
      }
      return; 
    } else if (signUpData && signUpData.user) {
      adminUserId = signUpData.user.id;
      console.log(`Admin user created successfully. User ID: ${adminUserId}`);
      console.log('IMPORTANT: If email confirmations are enabled, you may need to confirm the email.');
    }
  } else if (signInError) {
    // Other sign-in error
    console.error('Error signing in admin user:', signInError.message);
    return;
  }

  if (!adminUserId) {
    console.error('Failed to obtain admin user ID. Cannot proceed with profile creation.');
    return;
  }

  // 2. Upsert the admin's profile
  console.log(`Upserting profile for admin user ID: ${adminUserId}`);
  const { error: rpcError } = await supabase.rpc('internal_upsert_profile_for_user', {
    p_user_id: adminUserId,
    p_email: ADMIN_EMAIL,
    p_name: ADMIN_USERNAME,
    p_avatar_url: ADMIN_AVATAR_URL
  });

  if (rpcError) {
    console.error('Error calling internal_upsert_profile_for_user:', rpcError.message);
  } else {
    console.log(`Admin profile upserted successfully for ${ADMIN_EMAIL}`);
  }

  console.log('Admin setup script finished.');
}

setupAdmin().catch(console.error); 