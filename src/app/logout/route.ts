import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST-only: never expose logout as a GET endpoint.
// GET logout routes are dangerous because Next.js <Link> prefetches all hrefs,
// which would silently sign the user out on any page containing a logout link.
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing Supabase configuration still lands the user back on login.
  }

  redirect("/login");
}
