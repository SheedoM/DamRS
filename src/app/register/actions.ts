"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import {
  buildStudentAuthCredentials,
  buildStudentProfileInsert,
  parseStudentRegistrationForm,
  rosterNationalIdMismatch,
} from "./registration";

export async function registerStudentAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseStudentRegistrationForm(formData);

  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  const supabase = await createSupabaseServerClient();

  // The active cycle and an open submission window are required to self-register.
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return { ok: false, message: "لا توجد دورة مناقشة مفعّلة حاليًا." };
  }

  const cycleId = cycle.id as string;
  const nowIso = new Date().toISOString();
  const { data: openWindow } = await supabase
    .from("submission_windows")
    .select("id")
    .eq("cycle_id", cycleId)
    .lte("opens_at", nowIso)
    .or(`closes_at.gte.${nowIso},allow_late_submission.eq.true`)
    .limit(1)
    .maybeSingle();

  if (!openWindow) {
    return { ok: false, message: "التسجيل متاح فقط أثناء فتح نافذة التسليم." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر.",
    };
  }

  // The university ID must be on the approved roster and not already claimed.
  const { data: eligible } = await adminClient
    .from("eligible_students")
    .select("id, claimed_by, national_id")
    .eq("cycle_id", cycleId)
    .eq("university_id", parsed.data.student_id)
    .maybeSingle();

  if (!eligible) {
    return { ok: false, message: "الرقم الجامعي غير معتمد للتسجيل. تواصل مع إدارة النظام." };
  }

  if (eligible.claimed_by) {
    return { ok: false, message: "تم استخدام هذا الرقم الجامعي للتسجيل من قبل." };
  }

  if (rosterNationalIdMismatch(eligible.national_id as string | null, parsed.data.national_id)) {
    return { ok: false, message: "الرقم القومي لا يطابق بيانات الرقم الجامعي المعتمد." };
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser(
    buildStudentAuthCredentials(parsed.data),
  );

  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "تعذّر إنشاء الحساب." };
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .insert(buildStudentProfileInsert(authUser.user.id, parsed.data));

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: claimError } = await adminClient
    .from("eligible_students")
    .update({ claimed_by: authUser.user.id, claimed_at: nowIso })
    .eq("id", eligible.id)
    .is("claimed_by", null);

  if (claimError) {
    return { ok: false, message: claimError.message };
  }

  return { ok: true, message: "تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول." };
}
