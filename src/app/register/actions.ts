"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions";
import {
  buildStudentAuthCredentials,
  buildStudentProfileInsert,
  deriveStudentAuthEmail,
  parseStudentRegistrationForm,
  rosterNationalIdMismatch,
} from "./registration";

export type StudentRegistrationActionResult = ActionResult & {
  credentials?: {
    email: string;
    password: string;
  };
};

export async function registerStudentAction(
  _previousState: StudentRegistrationActionResult,
  formData: FormData,
): Promise<StudentRegistrationActionResult> {
  const parsed = parseStudentRegistrationForm(formData);

  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  // Registration runs for an anonymous visitor (no session yet), so all reads
  // must use the service-role client — RLS only grants discussion_cycles /
  // submission_windows reads to authenticated users.
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر.",
    };
  }

  // The active cycle and an open submission window are required to self-register.
  const { data: cycle } = await adminClient
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
  const { data: openWindow } = await adminClient
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

  // Authorization to register comes from one of two sources:
  //   1. Primary: a pending project the admin pre-created for this university ID
  //      (team_leader_id still NULL). Sign-up claims it.
  //   2. Fallback: the eligible_students roster (legacy self-service flow).
  const { data: pendingProject } = await adminClient
    .from("projects")
    .select("id")
    .eq("cycle_id", cycleId)
    .eq("leader_university_id", parsed.data.student_id)
    .is("team_leader_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let rosterEntryId: string | null = null;
  if (!pendingProject) {
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

    rosterEntryId = eligible.id as string;
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser(
    buildStudentAuthCredentials(parsed.data),
  );

  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "تعذّر إنشاء الحساب." };
  }
  const leaderId = authUser.user.id;

  const { error: profileError } = await adminClient
    .from("profiles")
    .insert(buildStudentProfileInsert(leaderId, parsed.data));

  if (profileError) {
    await adminClient.auth.admin.deleteUser(leaderId);
    return { ok: false, message: profileError.message };
  }

  if (pendingProject) {
    // Claim the pre-created project shell.
    const { error: claimError } = await adminClient
      .from("projects")
      .update({ team_leader_id: leaderId })
      .eq("id", pendingProject.id)
      .is("team_leader_id", null);

    if (claimError) {
      await adminClient.auth.admin.deleteUser(leaderId);
      return { ok: false, message: claimError.message };
    }
  } else if (rosterEntryId) {
    const { error: claimError } = await adminClient
      .from("eligible_students")
      .update({ claimed_by: leaderId, claimed_at: nowIso })
      .eq("id", rosterEntryId)
      .is("claimed_by", null);

    if (claimError) {
      return { ok: false, message: claimError.message };
    }
  }

  return {
    ok: true,
    message: "تم إنشاء حسابك بنجاح. سيتم تحويلك الآن.",
    credentials: {
      email: deriveStudentAuthEmail(parsed.data.student_id),
      password: parsed.data.national_id.trim(),
    },
  };
}
