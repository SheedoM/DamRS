"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم الكامل مطلوب."),
  email: z.string().trim().email("بريد إلكتروني غير صالح."),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل."),
  student_id: z.string().trim().min(3, "الرقم الجامعي مطلوب."),
  national_id: z.string().trim().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقمًا."),
});

export async function registerStudentAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    student_id: formData.get("student_id"),
    national_id: formData.get("national_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات التسجيل غير صالحة." };
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
    .select("id, claimed_by")
    .eq("cycle_id", cycleId)
    .eq("university_id", parsed.data.student_id)
    .maybeSingle();

  if (!eligible) {
    return { ok: false, message: "الرقم الجامعي غير معتمد للتسجيل. تواصل مع إدارة النظام." };
  }

  if (eligible.claimed_by) {
    return { ok: false, message: "تم استخدام هذا الرقم الجامعي للتسجيل من قبل." };
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: "student" },
  });

  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "تعذّر إنشاء الحساب." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    role: "student",
    student_id: parsed.data.student_id,
    national_id: parsed.data.national_id,
  });

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
