import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEFAULT_MAX_TEAM_MEMBERS = 10;

export type AppSettings = {
  max_team_members: number;
};

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("max_team_members")
    .eq("id", true)
    .maybeSingle();

  return {
    max_team_members: (data?.max_team_members as number) ?? DEFAULT_MAX_TEAM_MEMBERS,
  };
}
