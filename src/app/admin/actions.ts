"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import { buildGradeOverridePayload, gradeOverrideFormSchema } from "@/lib/review/review.schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  message: string;
};

const createPanelMemberSchema = z.object({
  full_name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  department: z.string().trim().min(2),
});

const assignPanelSchema = z.object({
  project_id: z.string().uuid(),
  panel_member_id: z.string().uuid(),
});

const revokeAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

const submissionWindowSchema = z.object({
  cycle_id: z.string().uuid().optional().or(z.literal("")),
  cycle_name: z.string().trim().min(3),
  academic_year: z.string().trim().min(4),
  department: z.string().trim().min(2),
  opens_at: z.string().min(1),
  closes_at: z.string().min(1),
  allow_late_submission: z.boolean(),
  allow_edit_after_submit: z.boolean(),
});

const gradeOverrideActionSchema = gradeOverrideFormSchema.extend({
  project_id: z.string().uuid(),
});

async function writeAuditLog(action: string, entityType: string, entityId: string, metadata = {}) {
  const { profile } = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function createPanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = createPanelMemberSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    department: formData.get("department"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid panel member." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Supabase service role key is missing.",
    };
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: "panel_member",
    },
  });

  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "Unable to create auth user." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    role: "panel_member",
    department: parsed.data.department,
  });

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  await writeAuditLog("admin_created_panel_member", "profile", authUser.user.id);
  revalidatePath("/admin/panel-members");
  return { ok: true, message: "Panel member account created." };
}

export async function assignPanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = assignPanelSchema.safeParse({
    project_id: formData.get("project_id"),
    panel_member_id: formData.get("panel_member_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Choose a project and panel member." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("panel_assignments")
    .select("id")
    .eq("project_id", parsed.data.project_id)
    .eq("panel_member_id", parsed.data.panel_member_id)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) {
    return { ok: false, message: "This panel member is already assigned to the project." };
  }

  const { data: assignment, error } = await supabase
    .from("panel_assignments")
    .insert({
      project_id: parsed.data.project_id,
      panel_member_id: parsed.data.panel_member_id,
      assigned_by: profile.id,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    return { ok: false, message: error?.message || "Unable to assign panel member." };
  }

  await supabase.from("projects").update({ status: "assigned" }).eq("id", parsed.data.project_id);
  await writeAuditLog("admin_assigned_panel", "panel_assignment", assignment.id, {
    project_id: parsed.data.project_id,
    panel_member_id: parsed.data.panel_member_id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${parsed.data.project_id}`);
  revalidatePath("/admin/assignments");
  return { ok: true, message: "Panel member assigned." };
}

export async function revokeAssignmentAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = revokeAssignmentSchema.safeParse({
    assignment_id: formData.get("assignment_id"),
    project_id: formData.get("project_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid assignment." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("panel_assignments")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.assignment_id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog("admin_revoked_panel", "panel_assignment", parsed.data.assignment_id, {
    project_id: parsed.data.project_id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${parsed.data.project_id}`);
  revalidatePath("/admin/assignments");
  return { ok: true, message: "Assignment revoked." };
}

export async function saveSubmissionWindowAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = submissionWindowSchema.safeParse({
    cycle_id: formData.get("cycle_id") || "",
    cycle_name: formData.get("cycle_name"),
    academic_year: formData.get("academic_year"),
    department: formData.get("department"),
    opens_at: formData.get("opens_at"),
    closes_at: formData.get("closes_at"),
    allow_late_submission: formData.get("allow_late_submission") === "on",
    allow_edit_after_submit: formData.get("allow_edit_after_submit") === "on",
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid submission window." };
  }

  if (new Date(parsed.data.opens_at) >= new Date(parsed.data.closes_at)) {
    return { ok: false, message: "Opening date must be before closing date." };
  }

  const supabase = await createSupabaseServerClient();
  let cycleId = parsed.data.cycle_id || "";

  if (!cycleId) {
    await supabase.from("discussion_cycles").update({ is_active: false }).eq("is_active", true);
    const { data: cycle, error: cycleError } = await supabase
      .from("discussion_cycles")
      .insert({
        name: parsed.data.cycle_name,
        academic_year: parsed.data.academic_year,
        department: parsed.data.department,
        created_by: profile.id,
        is_active: true,
      })
      .select("id")
      .single();

    if (cycleError || !cycle) {
      return { ok: false, message: cycleError?.message || "Unable to create discussion cycle." };
    }

    cycleId = cycle.id;
  } else {
    const { error: cycleError } = await supabase
      .from("discussion_cycles")
      .update({
        name: parsed.data.cycle_name,
        academic_year: parsed.data.academic_year,
        department: parsed.data.department,
        is_active: true,
      })
      .eq("id", cycleId);

    if (cycleError) {
      return { ok: false, message: cycleError.message };
    }
  }

  const { data: existingWindow } = await supabase
    .from("submission_windows")
    .select("id")
    .eq("cycle_id", cycleId)
    .maybeSingle();

  const payload = {
    cycle_id: cycleId,
    opens_at: new Date(parsed.data.opens_at).toISOString(),
    closes_at: new Date(parsed.data.closes_at).toISOString(),
    allow_late_submission: parsed.data.allow_late_submission,
    allow_edit_after_submit: parsed.data.allow_edit_after_submit,
    created_by: profile.id,
  };

  const result = existingWindow
    ? await supabase.from("submission_windows").update(payload).eq("id", existingWindow.id).select("id").single()
    : await supabase.from("submission_windows").insert(payload).select("id").single();

  if (result.error || !result.data) {
    return { ok: false, message: result.error?.message || "Unable to save submission window." };
  }

  await writeAuditLog("admin_updated_submission_window", "submission_window", result.data.id, {
    cycle_id: cycleId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/submission-window");
  redirect("/admin/submission-window");
}

export async function saveGradeOverrideAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = gradeOverrideActionSchema.safeParse({
    project_id: formData.get("project_id"),
    documentation_score: formData.get("documentation_score"),
    implementation_score: formData.get("implementation_score"),
    code_quality_score: formData.get("code_quality_score"),
    innovation_score: formData.get("innovation_score"),
    presentation_score: formData.get("presentation_score"),
    discussion_score: formData.get("discussion_score"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid grade override." };
  }

  const supabase = await createSupabaseServerClient();
  const payload = buildGradeOverridePayload(parsed.data);

  const { data: previousOverride } = await supabase
    .from("project_grade_overrides")
    .select("id")
    .eq("project_id", parsed.data.project_id)
    .eq("is_active", true)
    .maybeSingle();

  const { error: deactivateError } = await supabase
    .from("project_grade_overrides")
    .update({ is_active: false })
    .eq("project_id", parsed.data.project_id)
    .eq("is_active", true);

  if (deactivateError) {
    return { ok: false, message: deactivateError.message };
  }

  const { data: override, error } = await supabase
    .from("project_grade_overrides")
    .insert({
      project_id: parsed.data.project_id,
      ...payload,
      overridden_by: profile.id,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !override) {
    return { ok: false, message: error?.message || "Unable to save grade override." };
  }

  await writeAuditLog(
    previousOverride ? "admin_replaced_grade_override" : "admin_created_grade_override",
    "project_grade_override",
    override.id,
    {
      project_id: parsed.data.project_id,
      previous_override_id: previousOverride?.id || null,
    },
  );
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${parsed.data.project_id}`);
  return { ok: true, message: "Official grade override saved." };
}
