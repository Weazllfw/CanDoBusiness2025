import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountSettingsForm from "@/components/settings/AccountSettingsForm";
import { Database } from "@/types/supabase"; // Assuming your DB types are here

export default async function AccountSettingsPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login"); // Or your login page
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    // Handle error appropriately, maybe show an error message
    // For now, redirecting or showing a generic error
    return <p>Error loading profile. Please try again.</p>;
  }

  if (!profile) {
    // This case should ideally not happen if a user has a session
    // but their profile is missing.
    return <p>Profile not found.</p>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <AccountSettingsForm profile={profile} />
    </div>
  );
} 