"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message: string;
} | null;

const updatePasswordSchema = z.object({
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب"),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

export async function updatePanelMemberPasswordAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["panel_member"]);

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات غير صالحة" };
  }

  const supabase = await createSupabaseServerClient();

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  // Clear temp_password so admins can no longer view it. Must use the
  // service-role client: profiles UPDATE is admin-only under RLS, so the
  // member's own session would silently update zero rows.
  try {
    const adminClient = createSupabaseAdminClient();
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ temp_password: null })
      .eq("id", profile.id);

    if (profileError) {
      console.error("Failed to clear temp_password:", profileError);
      // Even if this fails, the auth password was updated successfully.
    }
  } catch (error) {
    console.error("Failed to clear temp_password:", error);
    // Service-role key missing; auth password was still updated successfully.
  }

  revalidatePath("/panel/settings");
  revalidatePath("/admin/panel-members");
  return { ok: true, message: "تم تغيير كلمة المرور بنجاح" };
}
