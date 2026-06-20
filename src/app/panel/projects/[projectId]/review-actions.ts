"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildDraftReviewPayload,
  buildFinalReviewPayload,
  draftReviewFormSchema,
  finalReviewFormSchema,
  getProjectStatusAfterReview,
  type ReviewType,
} from "@/lib/review/review.schema";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  message: string;
};

const projectIdSchema = z.string().uuid();

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid review details.";
}

async function ensureActiveAssignment(projectId: string, panelMemberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("panel_member_id", panelMemberId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  return Boolean(data);
}

async function writePanelAuditLog(
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, string>,
) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "review",
    entity_id: entityId,
    metadata,
  });
}

function revalidatePanelReviewPaths(projectId: string) {
  revalidatePath("/panel");
  revalidatePath("/panel/projects");
  revalidatePath(`/panel/projects/${projectId}`);
  revalidatePath(`/panel/projects/${projectId}/draft-review`);
  revalidatePath(`/panel/projects/${projectId}/final-review`);
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/student");
  revalidatePath("/student/project");
  revalidatePath("/student/project/status");
}

async function updateProjectStatusAfterReview(projectId: string, reviewType: ReviewType) {
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return error instanceof Error ? error.message : "Supabase service role key is missing.";
  }

  const { data: project, error: projectError } = await adminClient
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return projectError?.message || "Unable to load project status.";
  }

  const nextStatus = getProjectStatusAfterReview(String(project.status), reviewType);

  if (nextStatus === project.status) {
    return null;
  }

  const { error } = await adminClient
    .from("projects")
    .update({ status: nextStatus })
    .eq("id", projectId);

  return error?.message || null;
}

export async function saveDraftReviewAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["panel_member"]);
  const projectIdResult = projectIdSchema.safeParse(formData.get("project_id"));

  if (!projectIdResult.success) {
    return { ok: false, message: "Invalid project." };
  }

  const parsed = draftReviewFormSchema.safeParse({
    documentation_score: formData.get("documentation_score"),
    implementation_score: formData.get("implementation_score"),
    code_quality_score: formData.get("code_quality_score"),
    innovation_score: formData.get("innovation_score"),
    notes: formData.get("notes") || "",
    questions: formData.get("questions") || "",
  });

  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  if (!(await ensureActiveAssignment(projectIdResult.data, profile.id))) {
    return { ok: false, message: "You do not have an active assignment for this project." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        ...buildDraftReviewPayload(parsed.data, projectIdResult.data, profile.id),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "project_id,panel_member_id,review_type" },
    )
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "Unable to save draft review." };
  }

  const statusError = await updateProjectStatusAfterReview(projectIdResult.data, "draft");
  if (statusError) {
    return { ok: false, message: `Review saved, but project status was not updated: ${statusError}` };
  }

  await writePanelAuditLog(profile.id, "panel_submitted_draft_review", data.id, {
    project_id: projectIdResult.data,
  });
  revalidatePanelReviewPaths(projectIdResult.data);
  redirect(`/panel/projects/${projectIdResult.data}`);
}

export async function saveFinalReviewAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["panel_member"]);
  const projectIdResult = projectIdSchema.safeParse(formData.get("project_id"));

  if (!projectIdResult.success) {
    return { ok: false, message: "Invalid project." };
  }

  const parsed = finalReviewFormSchema.safeParse({
    presentation_score: formData.get("presentation_score"),
    discussion_score: formData.get("discussion_score"),
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { ok: false, message: firstIssueMessage(parsed.error) };
  }

  if (!(await ensureActiveAssignment(projectIdResult.data, profile.id))) {
    return { ok: false, message: "You do not have an active assignment for this project." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        ...buildFinalReviewPayload(parsed.data, projectIdResult.data, profile.id),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "project_id,panel_member_id,review_type" },
    )
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "Unable to save final review." };
  }

  const statusError = await updateProjectStatusAfterReview(projectIdResult.data, "final");
  if (statusError) {
    return { ok: false, message: `Review saved, but project status was not updated: ${statusError}` };
  }

  await writePanelAuditLog(profile.id, "panel_submitted_final_review", data.id, {
    project_id: projectIdResult.data,
  });
  revalidatePanelReviewPaths(projectIdResult.data);
  redirect(`/panel/projects/${projectIdResult.data}`);
}
