// Set an admin account's password (no email/SMTP needed).
//
//   node scripts/set-admin-password.mjs "NewPassword123!"
//   node scripts/set-admin-password.mjs "NewPassword123!" admin@example.com   (if >1 admin)
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local or
// the environment (set them inline for production, like the seed).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch { /* use existing env */ }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const newPassword = process.argv[2];
const wantedEmail = process.argv[3];
if (!newPassword || newPassword.length < 6) {
  console.error('Usage: node scripts/set-admin-password.mjs "NewPassword" [adminEmail]');
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

let query = db.from("profiles").select("id, email, full_name").eq("role", "admin");
if (wantedEmail) query = query.eq("email", wantedEmail);
const { data: admins, error } = await query;
if (error) {
  console.error("✗", error.message);
  process.exit(1);
}
if (!admins || admins.length === 0) {
  console.error("✗ No admin profile found" + (wantedEmail ? ` for ${wantedEmail}.` : "."));
  process.exit(1);
}
if (admins.length > 1) {
  console.error("✗ Multiple admins — re-run with the email as the 2nd argument:");
  for (const a of admins) console.error(`   ${a.email}  (${a.full_name})`);
  process.exit(1);
}

const admin = admins[0];
const { error: updateError } = await db.auth.admin.updateUserById(admin.id, { password: newPassword });
if (updateError) {
  console.error("✗", updateError.message);
  process.exit(1);
}

console.log(`✓ Password updated for admin: ${admin.email}`);
