"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import { projectFormSchema } from "@/lib/project/submission.schema";
import { discussionCriteria, discussionScoreSchema } from "@/lib/review/grading";
import { getAppSettings } from "@/lib/admin/app-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import { writeAuditLog } from "@/lib/audit";
import { programValues } from "@/lib/i18n/labels";



const appSettingsSchema = z.object({
  max_team_members: z.coerce.number().int().min(1).max(10),
});

const createPanelMemberSchema = z.object({
  full_name: z.string().trim().min(2),
  email: z.string().trim().email(),
  department: z.string().trim().min(2),
  panel_member_type: z.enum(["supervisor", "referee", "committee_head"]),
});

const updatePanelMemberSchema = z.object({
  panel_member_id: z.string().uuid(),
  full_name: z.string().trim().min(2, "اسم عضو اللجنة مطلوب."),
  department: z.string().trim().optional().transform((v) => v || null),
  panel_member_type: z.enum(["supervisor", "referee", "committee_head"]),
});

const eligibleStudentsSchema = z.object({
  university_ids: z.string().trim().min(1),
});

const pendingProjectSchema = z.object({
  project_number: z.string().trim().min(1, "رقم المشروع مطلوب."),
  leader_university_id: z.string().trim().min(3, "الرقم الجامعي لقائد الفريق مطلوب."),
  leader_full_name: z.string().trim().min(2, "اسم قائد الفريق مطلوب."),
  leader_program: z.enum(programValues, { message: "اختر البرنامج." }),
});

// Lenient: admins may correct any field, including on incomplete pending
// projects, so only the project number is required.
const optionalText = z.string().trim().optional().transform((v) => v || null);
const optionalProgram = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || (programValues as readonly string[]).includes(v), "برنامج غير صالح.");

const adminProjectEditSchema = z.object({
  project_number: z.string().trim().min(1, "رقم المشروع مطلوب."),
  title: optionalText,
  title_en: optionalText,
  supervisor_name: optionalText,
  abstract: optionalText,
  technologies_used: optionalText,
  github_url: optionalText,
  demo_video_url: optionalText,
  leader_university_id: optionalText,
  leader_full_name: optionalText,
  leader_program: optionalProgram,
});

const bulkAssignSchema = z.object({
  panel_member_id: z.string().uuid(),
  project_ids: z.array(z.string().uuid()).min(1),
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
  term: z.enum(["first", "second"]).optional(),
  opens_at: z.string().min(1),
  closes_at: z.string().min(1),
  allow_late_submission: z.boolean(),
  allow_edit_after_submit: z.boolean(),
});



export async function updateAppSettingsAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = appSettingsSchema.safeParse({
    max_team_members: formData.get("max_team_members"),
  });

  if (!parsed.success) {
    return { ok: false, message: "الحد الأقصى لعدد الأعضاء يجب أن يكون بين 1 و 10." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ max_team_members: parsed.data.max_team_members, updated_by: profile.id })
    .eq("id", true);

  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_updated_app_settings", "app_settings", null, {
    max_team_members: parsed.data.max_team_members,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ الإعدادات." };
}

export async function toggleGradingAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const isOpen = formData.get("is_open") === "true";

  const supabase = await createSupabaseServerClient();
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return { ok: false, message: "لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم أولًا." };
  }

  const cycleId = cycle.id as string;
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("grading_windows")
    .select("id")
    .eq("cycle_id", cycleId)
    .maybeSingle();

  const payload = {
    cycle_id: cycleId,
    is_open: isOpen,
    opened_at: isOpen ? now : null,
    closed_at: isOpen ? null : now,
    created_by: profile.id,
  };

  const result = existing
    ? await supabase.from("grading_windows").update(payload).eq("id", existing.id).select("id").single()
    : await supabase.from("grading_windows").insert(payload).select("id").single();

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  await writeAuditLog(profile.id, "admin_toggled_grading", "grading_window", cycleId, { is_open: isOpen });
  revalidatePath("/", "layout");
  return { ok: true, message: isOpen ? "تم فتح باب التقييم." : "تم إغلاق باب التقييم." };
}

export async function saveStudentGradesAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const projectId = String(formData.get("project_id") || "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("id")
    .eq("project_id", projectId);
  const validIds = new Set((members || []).map((member) => member.id as string));

  const memberIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^grades\.([0-9a-fA-F-]+)\./);
    if (match) memberIds.add(match[1]);
  }

  const rows: Record<string, unknown>[] = [];
  for (const memberId of memberIds) {
    if (!validIds.has(memberId)) {
      return { ok: false, message: "أحد الطلاب لا ينتمي لهذا المشروع." };
    }
    const first = Number(formData.get(`grades.${memberId}.first_semester_score`));
    const supervision = Number(formData.get(`grades.${memberId}.supervision_score`));
    if (Number.isNaN(first) || first < 0 || first > 10) {
      return { ok: false, message: "درجة الفصل الأول يجب أن تكون بين 0 و 10." };
    }
    if (Number.isNaN(supervision) || supervision < 0 || supervision > 30) {
      return { ok: false, message: "تقييم لجنة الإشراف يجب أن يكون بين 0 و 30." };
    }
    rows.push({
      project_id: projectId,
      team_member_id: memberId,
      first_semester_score: first,
      supervision_score: supervision,
      entered_by: profile.id,
    });
  }

  if (rows.length === 0) {
    return { ok: false, message: "لا يوجد طلاب في هذا المشروع." };
  }

  const { error } = await supabase
    .from("student_supervision_grades")
    .upsert(rows, { onConflict: "team_member_id" });

  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_saved_student_grades", "project", projectId, {
    students: rows.length,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ درجات الطلاب." };
}

// Admin override of a committee member's discussion scores. Form fields are
// override.<panelMemberId>.<teamMemberId>.<criterion>. Admin RLS allows writing
// any evaluator's score.
export async function overrideDiscussionScoresAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const projectId = String(formData.get("project_id") || "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  // Collect (panelMemberId, teamMemberId) pairs from the flat fields.
  const pairs = new Set<string>();
  for (const key of formData.keys()) {
    const m = key.match(/^override\.([0-9a-fA-F-]+)\.([0-9a-fA-F-]+)\./);
    if (m) pairs.add(`${m[1]}|${m[2]}`);
  }
  if (pairs.size === 0) {
    return { ok: false, message: "لا توجد درجات لحفظها." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase.from("team_members").select("id").eq("project_id", projectId);
  const validMembers = new Set((members || []).map((m) => m.id as string));

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  for (const pair of pairs) {
    const [panelMemberId, teamMemberId] = pair.split("|");
    if (!validMembers.has(teamMemberId)) {
      return { ok: false, message: "أحد الطلاب لا ينتمي لهذا المشروع." };
    }
    const raw = Object.fromEntries(
      discussionCriteria.map((c) => [c.key, formData.get(`override.${panelMemberId}.${teamMemberId}.${c.key}`)]),
    );
    const parsed = discussionScoreSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message || "درجات غير صالحة." };
    }
    rows.push({
      project_id: projectId,
      panel_member_id: panelMemberId,
      team_member_id: teamMemberId,
      ...parsed.data,
      submitted_at: now,
    });
  }

  const { error } = await supabase
    .from("student_discussion_scores")
    .upsert(rows, { onConflict: "panel_member_id,team_member_id" });
  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_overrode_discussion_scores", "project", projectId, {
    entries: rows.length,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ درجات المناقشة." };
}

export async function createPanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = createPanelMemberSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    department: formData.get("department"),
    panel_member_type: formData.get("panel_member_type"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات عضو اللجنة غير صالحة." };
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

  const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: "panel_member",
    },
  });

  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "تعذّر إنشاء حساب المستخدم." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authUser.user.id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    role: "panel_member",
    department: parsed.data.department,
    panel_member_type: parsed.data.panel_member_type,
    temp_password: tempPassword,
  });

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  await writeAuditLog(profile.id, "admin_created_panel_member", "profile", authUser.user.id);
  revalidatePath("/admin/panel-members");
  return { ok: true, message: `تم إنشاء حساب عضو اللجنة. كلمة المرور المؤقتة: ${tempPassword}` };
}

export async function updatePanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = updatePanelMemberSchema.safeParse({
    panel_member_id: formData.get("panel_member_id"),
    full_name: formData.get("full_name"),
    department: formData.get("department"),
    panel_member_type: formData.get("panel_member_type"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات عضو اللجنة غير صالحة." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      department: parsed.data.department,
      panel_member_type: parsed.data.panel_member_type,
    })
    .eq("id", parsed.data.panel_member_id)
    .eq("role", "panel_member");

  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_updated_panel_member", "profile", parsed.data.panel_member_id);
  revalidatePath("/admin/panel-members");
  return { ok: true, message: "تم تحديث بيانات عضو اللجنة." };
}

export async function deletePanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const panelMemberId = String(formData.get("panel_member_id") || "");
  if (!z.string().uuid().safeParse(panelMemberId).success) {
    return { ok: false, message: "معرّف عضو اللجنة غير صالح." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر." };
  }

  // profiles is referenced ON DELETE RESTRICT by assignments / scores / audit
  // logs, so clear those for this member before removing the account.
  await adminClient.from("student_discussion_scores").delete().eq("panel_member_id", panelMemberId);
  await adminClient.from("panel_assignments").delete().eq("panel_member_id", panelMemberId);
  await adminClient.from("audit_logs").delete().eq("actor_id", panelMemberId);

  // Deleting the auth user cascades the profile row.
  const { error } = await adminClient.auth.admin.deleteUser(panelMemberId);
  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_deleted_panel_member", "profile", panelMemberId);
  revalidatePath("/admin/panel-members");
  return { ok: true, message: "تم حذف عضو اللجنة." };
}

export async function createAdminProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);

  const indexes = Array.from(formData.keys())
    .map((key) => key.match(/^team_members\.(\d+)\.full_name$/)?.[1])
    .filter((value): value is string => Boolean(value));
  const team_members = indexes.map((index) => ({
    full_name: String(formData.get(`team_members.${index}.full_name`) || ""),
    student_id: String(formData.get(`team_members.${index}.student_id`) || ""),
    program: String(formData.get(`team_members.${index}.program`) || ""),
    role_in_team: String(formData.get(`team_members.${index}.role_in_team`) || "member"),
  }));

  const parsed = projectFormSchema.safeParse({
    title: formData.get("title"),
    title_en: formData.get("title_en"),
    abstract: formData.get("abstract"),
    supervisor_name: formData.get("supervisor_name"),
    technologies_used: formData.get("technologies_used"),
    github_url: formData.get("github_url"),
    demo_video_url: formData.get("demo_video_url"),
    team_members,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة." };
  }

  const settings = await getAppSettings();
  if (parsed.data.team_members.length > settings.max_team_members) {
    return { ok: false, message: `الحد الأقصى لعدد أعضاء الفريق هو ${settings.max_team_members}.` };
  }

  const leader =
    parsed.data.team_members.find((member) => member.role_in_team === "team_leader") ??
    parsed.data.team_members[0];
  if (!leader.student_id) {
    return { ok: false, message: "رقم قائد الفريق الجامعي مطلوب لإنشاء حسابه." };
  }
  const derivedEmail = `${leader.student_id}@damrs.edu`;

  const supabase = await createSupabaseServerClient();
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) {
    return { ok: false, message: "لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم أولًا." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر." };
  }

  // Auto-provision the team-leader login with a generated temp password
  // (team-member national IDs are no longer collected).
  const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: derivedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: leader.full_name, role: "student" },
  });
  if (authError || !authUser.user) {
    return { ok: false, message: authError?.message || "تعذّر إنشاء حساب قائد الفريق." };
  }
  const leaderId = authUser.user.id;

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: leaderId,
    full_name: leader.full_name,
    email: derivedEmail,
    role: "student",
    student_id: leader.student_id,
    program: leader.program,
    temp_password: tempPassword,
  });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(leaderId);
    return { ok: false, message: profileError.message };
  }

  const { team_members: members, ...project } = parsed.data;
  const { data: createdProject, error: projectError } = await adminClient
    .from("projects")
    .insert({
      ...project,
      cycle_id: cycle.id,
      team_leader_id: leaderId,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (projectError || !createdProject) {
    return { ok: false, message: projectError?.message || "تعذّر إنشاء المشروع." };
  }

  const { error: teamError } = await adminClient.from("team_members").insert(
    members.map((member) => ({ ...member, project_id: createdProject.id })),
  );
  if (teamError) {
    return { ok: false, message: teamError.message };
  }

  await adminClient
    .from("eligible_students")
    .update({ claimed_by: leaderId, claimed_at: new Date().toISOString() })
    .eq("cycle_id", cycle.id)
    .eq("university_id", leader.student_id)
    .is("claimed_by", null);

  await writeAuditLog(profile.id, "admin_created_project", "project", createdProject.id as string);
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `تم إنشاء المشروع بنجاح. كلمة مرور قائد الفريق المؤقتة: ${tempPassword}`,
  };
}

// Primary flow: pre-create a project shell stamped with a number and assigned to
// a leader university ID. No account is created yet — the leader signs up later
// (with their national ID as password) and claims this pending project.
export async function createPendingProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = pendingProjectSchema.safeParse({
    project_number: formData.get("project_number"),
    leader_university_id: formData.get("leader_university_id"),
    leader_full_name: formData.get("leader_full_name"),
    leader_program: formData.get("leader_program"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) {
    return { ok: false, message: "لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم أولًا." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر." };
  }

  const { data: createdProject, error: projectError } = await adminClient
    .from("projects")
    .insert({
      cycle_id: cycle.id,
      project_number: parsed.data.project_number,
      leader_university_id: parsed.data.leader_university_id,
      leader_full_name: parsed.data.leader_full_name,
      leader_program: parsed.data.leader_program,
      team_leader_id: null,
      status: "draft",
    })
    .select("id")
    .single();

  if (projectError || !createdProject) {
    // 23505 = unique_violation (duplicate project_number within the cycle).
    if (projectError?.code === "23505") {
      return { ok: false, message: `رقم المشروع «${parsed.data.project_number}» مستخدم بالفعل في هذه الدورة.` };
    }
    return { ok: false, message: projectError?.message || "تعذّر إنشاء المشروع." };
  }

  await writeAuditLog(profile.id, "admin_created_pending_project", "project", createdProject.id as string);
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: `تم إنشاء المشروع رقم «${parsed.data.project_number}». يمكن لقائد الفريق التسجيل الآن برقمه الجامعي والرقم القومي.`,
  };
}

// Admin edit of any project (incl. number, leader info, titles, team roster).
export async function updateAdminProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const projectId = String(formData.get("project_id") || "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  const parsed = adminProjectEditSchema.safeParse({
    project_number: formData.get("project_number"),
    title: formData.get("title"),
    title_en: formData.get("title_en"),
    supervisor_name: formData.get("supervisor_name"),
    abstract: formData.get("abstract"),
    technologies_used: formData.get("technologies_used"),
    github_url: formData.get("github_url"),
    demo_video_url: formData.get("demo_video_url"),
    leader_university_id: formData.get("leader_university_id"),
    leader_full_name: formData.get("leader_full_name"),
    leader_program: formData.get("leader_program"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة." };
  }

  // Parse team-member rows (lenient: national ID optional for admin edits).
  const indexes = Array.from(formData.keys())
    .map((key) => key.match(/^team_members\.(\d+)\.full_name$/)?.[1])
    .filter((value): value is string => Boolean(value));
  const teamMembers = indexes
    .map((index) => ({
      full_name: String(formData.get(`team_members.${index}.full_name`) || "").trim(),
      student_id: String(formData.get(`team_members.${index}.student_id`) || "").trim(),
      program: String(formData.get(`team_members.${index}.program`) || "").trim() || null,
      role_in_team: String(formData.get(`team_members.${index}.role_in_team`) || "member"),
    }))
    .filter((m) => m.full_name && m.student_id);

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر." };
  }

  const { data: existing } = await adminClient
    .from("projects")
    .select("id, cycle_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!existing) {
    return { ok: false, message: "لم يتم العثور على المشروع." };
  }

  // Project number must stay unique within the cycle.
  const { data: clash } = await adminClient
    .from("projects")
    .select("id")
    .eq("cycle_id", existing.cycle_id)
    .eq("project_number", parsed.data.project_number)
    .neq("id", projectId)
    .maybeSingle();
  if (clash) {
    return { ok: false, message: `رقم المشروع «${parsed.data.project_number}» مستخدم بالفعل في هذه الدورة.` };
  }

  const { error: updateError } = await adminClient
    .from("projects")
    .update({
      project_number: parsed.data.project_number,
      title: parsed.data.title,
      title_en: parsed.data.title_en,
      supervisor_name: parsed.data.supervisor_name,
      abstract: parsed.data.abstract,
      technologies_used: parsed.data.technologies_used,
      github_url: parsed.data.github_url,
      demo_video_url: parsed.data.demo_video_url,
      leader_university_id: parsed.data.leader_university_id,
      leader_full_name: parsed.data.leader_full_name,
      leader_program: parsed.data.leader_program,
    })
    .eq("id", projectId);
  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  // Replace the team roster with the submitted rows.
  await adminClient.from("team_members").delete().eq("project_id", projectId);
  if (teamMembers.length > 0) {
    const { error: teamError } = await adminClient.from("team_members").insert(
      teamMembers.map((m) => ({ ...m, project_id: projectId })),
    );
    if (teamError) {
      return { ok: false, message: teamError.message };
    }
  }

  await writeAuditLog(profile.id, "admin_updated_project", "project", projectId);
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${projectId}?success=updated`);
}

export async function deleteAdminProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const projectId = String(formData.get("project_id") || "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "مفتاح خدمة Supabase غير متوفر." };
  }

  // Cascades to team_members / files / panel_assignments / scores / supervision.
  const { error } = await adminClient.from("projects").delete().eq("id", projectId);
  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_deleted_project", "project", projectId);
  revalidatePath("/", "layout");
  redirect("/admin/projects?success=deleted");
}

export async function addEligibleStudentsAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = eligibleStudentsSchema.safeParse({
    university_ids: formData.get("university_ids"),
  });

  if (!parsed.success) {
    return { ok: false, message: "أدخل رقمًا جامعيًا واحدًا على الأقل." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return { ok: false, message: "لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم أولًا." };
  }

  const ids = Array.from(
    new Set(
      parsed.data.university_ids
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (ids.length === 0) {
    return { ok: false, message: "أدخل رقمًا جامعيًا واحدًا على الأقل." };
  }

  const { error } = await supabase.from("eligible_students").upsert(
    ids.map((universityId) => ({
      cycle_id: cycle.id,
      university_id: universityId,
      created_by: profile.id,
    })),
    { onConflict: "cycle_id,university_id", ignoreDuplicates: true },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "admin_added_eligible_students", "discussion_cycle", cycle.id as string, {
    count: ids.length,
  });
  revalidatePath("/admin/students");
  return { ok: true, message: `تمت إضافة ${ids.length} رقمًا جامعيًا إلى القائمة المعتمدة.` };
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
  await writeAuditLog(profile.id, "admin_assigned_panel", "panel_assignment", assignment.id, {
    project_id: parsed.data.project_id,
    panel_member_id: parsed.data.panel_member_id,
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${parsed.data.project_id}`);
  return { ok: true, message: "Panel member assigned." };
}

export async function bulkAssignPanelMemberAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
  const parsed = bulkAssignSchema.safeParse({
    panel_member_id: formData.get("panel_member_id"),
    project_ids: formData.get("project_ids")?.toString().split(",").filter(Boolean) ?? [],
  });

  if (!parsed.success) {
    return { ok: false, message: "Choose projects and a panel member." };
  }

  const { panel_member_id: panelMemberId, project_ids: projectIds } = parsed.data;
  const supabase = await createSupabaseServerClient();
  let assignedCount = 0;

  for (const projectId of projectIds) {
    const { data: existing } = await supabase
      .from("panel_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("panel_member_id", panelMemberId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

    if (!existing) {
      const { data: assignment, error } = await supabase
        .from("panel_assignments")
        .insert({
          project_id: projectId,
          panel_member_id: panelMemberId,
          assigned_by: profile.id,
          is_active: true,
        })
        .select("id")
        .single();

      if (!error && assignment) {
        await supabase.from("projects").update({ status: "assigned" }).eq("id", projectId);
        await writeAuditLog(profile.id, "admin_assigned_panel_member", "panel_assignment", assignment.id, {
          project_id: projectId,
          panel_member_id: panelMemberId,
        });
        assignedCount++;
      }
    }
  }

  revalidatePath("/admin/projects");
  return { ok: true, message: `Assigned ${assignedCount} project(s).` };
}

export async function revokeAssignmentAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["admin"]);
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

  await writeAuditLog(profile.id, "admin_revoked_panel", "panel_assignment", parsed.data.assignment_id, {
    project_id: parsed.data.project_id,
  });
  revalidatePath("/", "layout");
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
    term: formData.get("term") || undefined,
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
        term: parsed.data.term || "second",
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
        term: parsed.data.term || "second",
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

  await writeAuditLog(profile.id, "admin_updated_submission_window", "submission_window", result.data.id, {
    cycle_id: cycleId,
  });
  revalidatePath("/", "layout");
  redirect("/admin?success=window-saved");
}

