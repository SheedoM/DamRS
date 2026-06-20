import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudentAccount = {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  national_id: string | null;
};

export type EligibleStudent = {
  id: string;
  university_id: string;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
};

export async function getStudentAccounts(): Promise<StudentAccount[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, student_id, national_id")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  return (data || []) as StudentAccount[];
}

export async function getEligibleStudents(cycleId: string): Promise<EligibleStudent[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("eligible_students")
    .select("id, university_id, claimed_by, claimed_at, created_at")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false });

  return (data || []) as EligibleStudent[];
}
