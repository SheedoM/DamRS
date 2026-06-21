"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { discussionCriteria, discussionScoreSchema } from "@/lib/review/grading";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveCycleGradingState } from "@/lib/panel/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import { writeAuditLog } from "@/lib/audit";

const projectIdSchema = z.string().uuid();

async function ensureActiveAssignment(projectId: string, panelMemberId: string, role?: "committee" | "supervisor") {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("panel_assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("panel_member_id", panelMemberId)
    .eq("is_active", true)
    .is("revoked_at", null);
  if (role) query = query.eq("role", role);
  const { data } = await query.limit(1).maybeSingle();
  return Boolean(data);
}

async function getProjectTerm(projectId: string): Promise<"first" | "second"> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("discussion_cycles(term)")
    .eq("id", projectId)
    .maybeSingle();
  const rel = (data as { discussion_cycles?: { term?: string } | { term?: string }[] } | null)?.discussion_cycles;
  const cycle = Array.isArray(rel) ? rel[0] : rel;
  return cycle?.term === "first" ? "first" : "second";
}

export async function saveDiscussionScoresAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["panel_member"]);
  const projectIdResult = projectIdSchema.safeParse(formData.get("project_id"));

  if (!projectIdResult.success) {
    return { ok: false, message: "مشروع غير صالح." };
  }
  const projectId = projectIdResult.data;

  const grading = await getActiveCycleGradingState();
  if (!grading.isOpen) {
    return { ok: false, message: "باب التقييم مغلق حاليًا." };
  }

  if (!(await ensureActiveAssignment(projectId, profile.id))) {
    return { ok: false, message: "ليس لديك إسناد فعّال لهذا المشروع." };
  }

  const supabase = await createSupabaseServerClient();

  // Only students that actually belong to this project may be scored.
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("id")
    .eq("project_id", projectId);
  const validMemberIds = new Set((teamMembers || []).map((member) => member.id as string));

  // Collect the per-student rows from the flat form fields:
  //   scores.<teamMemberId>.<criterion>
  const memberIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^scores\.([0-9a-fA-F-]+)\./);
    if (match) memberIds.add(match[1]);
  }

  if (memberIds.size === 0) {
    return { ok: false, message: "لا يوجد طلاب لتقييمهم في هذا المشروع." };
  }

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];

  for (const memberId of memberIds) {
    if (!validMemberIds.has(memberId)) {
      return { ok: false, message: "أحد الطلاب لا ينتمي لهذا المشروع." };
    }

    const raw = Object.fromEntries(
      discussionCriteria.map((criterion) => [
        criterion.key,
        formData.get(`scores.${memberId}.${criterion.key}`),
      ]),
    );
    const parsed = discussionScoreSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message || "درجات غير صالحة." };
    }

    rows.push({
      project_id: projectId,
      panel_member_id: profile.id,
      team_member_id: memberId,
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

  await writeAuditLog(profile.id, "panel_saved_discussion_scores", "project", projectId, {
    students: rows.length,
  });
  revalidatePath("/", "layout");
  redirect(`/panel/projects/${projectId}?success=draft-saved`);
}

// Supervisor entry: a single mark per student — أعمال السنة (30) in the second
// term, أعمال الفصل (10) in the first term.
export async function saveSupervisionScoresAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["panel_member"]);
  const projectIdResult = projectIdSchema.safeParse(formData.get("project_id"));
  if (!projectIdResult.success) {
    return { ok: false, message: "مشروع غير صالح." };
  }
  const projectId = projectIdResult.data;

  const grading = await getActiveCycleGradingState();
  if (!grading.isOpen) {
    return { ok: false, message: "باب التقييم مغلق حاليًا." };
  }
  if (!(await ensureActiveAssignment(projectId, profile.id, "supervisor"))) {
    return { ok: false, message: "لست مشرفًا على هذا المشروع." };
  }

  const term = await getProjectTerm(projectId);
  const max = term === "first" ? 10 : 30;
  const column = term === "first" ? "first_semester_score" : "supervision_score";

  const supabase = await createSupabaseServerClient();
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("id")
    .eq("project_id", projectId);
  const validMemberIds = new Set((teamMembers || []).map((m) => m.id as string));

  const memberIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^supervision\.([0-9a-fA-F-]+)$/);
    if (match) memberIds.add(match[1]);
  }
  if (memberIds.size === 0) {
    return { ok: false, message: "لا يوجد طلاب لتقييمهم في هذا المشروع." };
  }

  const rows: Record<string, unknown>[] = [];
  for (const memberId of memberIds) {
    if (!validMemberIds.has(memberId)) {
      return { ok: false, message: "أحد الطلاب لا ينتمي لهذا المشروع." };
    }
    const value = Number(formData.get(`supervision.${memberId}`));
    if (Number.isNaN(value) || value < 0 || value > max) {
      return { ok: false, message: `الدرجة يجب أن تكون بين 0 و ${max}.` };
    }
    rows.push({
      project_id: projectId,
      team_member_id: memberId,
      [column]: value,
      entered_by: profile.id,
    });
  }

  const { error } = await supabase
    .from("student_supervision_grades")
    .upsert(rows, { onConflict: "team_member_id" });
  if (error) {
    return { ok: false, message: error.message };
  }

  await writeAuditLog(profile.id, "panel_saved_supervision_scores", "project", projectId, {
    students: rows.length,
    term,
  });
  revalidatePath("/", "layout");
  redirect(`/panel/projects/${projectId}?success=supervision-saved`);
}
