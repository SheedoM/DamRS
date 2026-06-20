import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, getSupabaseServiceRoleKey } from "./env";

export function createSupabaseAdminClient() {
  const env = getPublicSupabaseEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
