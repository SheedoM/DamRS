import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) { const v = m[2].trim().replace(/^['"]|['"]$/g, ""); if (!process.env[m[1]]) process.env[m[1]] = v; }
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SEED = "مشاريع التخرج 2025/2026";

// Keep only the seed cycle active.
await db.from("discussion_cycles").update({ is_active: false }).eq("is_active", true).neq("name", SEED);

const { data: cycles } = await db.from("discussion_cycles").select("id,name,is_active");
console.log("CYCLES after fix:");
for (const c of cycles) console.log("  ", c.is_active ? "[ACTIVE]" : "[off]   ", c.name);
console.log("active count:", cycles.filter((c) => c.is_active).length);
process.exit(0);
