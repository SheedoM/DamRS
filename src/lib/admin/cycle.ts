import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveCycle = {
  id: string;
  name: string;
  academic_year: string;
  grades_announced_at: string | null;
};

export type GradingWindow = {
  id: string;
  cycle_id: string;
  is_open: boolean;
  allow_edit_after_final: boolean;
  opened_at: string | null;
  closed_at: string | null;
};

export async function getActiveCycle(): Promise<ActiveCycle | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("discussion_cycles")
    .select("id, name, academic_year, grades_announced_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveCycle | null) ?? null;
}

export async function getGradingWindow(cycleId: string): Promise<GradingWindow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("grading_windows")
    .select("id, cycle_id, is_open, allow_edit_after_final, opened_at, closed_at")
    .eq("cycle_id", cycleId)
    .maybeSingle();

  return (data as GradingWindow | null) ?? null;
}
