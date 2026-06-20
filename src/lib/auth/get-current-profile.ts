import type { User } from "@supabase/supabase-js";

import { isUserRole, type UserRole } from "./roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  student_id: string | null;
};

export type CurrentProfileResult =
  | { status: "authenticated"; user: User; profile: CurrentProfile }
  | { status: "missing_session" }
  | { status: "missing_profile"; user: User }
  | { status: "invalid_role"; user: User };

export async function getCurrentProfile(): Promise<CurrentProfileResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "missing_session" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department, student_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { status: "missing_profile", user };
  }

  if (!isUserRole(profile.role)) {
    return { status: "invalid_role", user };
  }

  return {
    status: "authenticated",
    user,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      student_id: profile.student_id,
    },
  };
}
