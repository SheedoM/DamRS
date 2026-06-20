"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildDraftReviewPayload,
  buildFinalReviewPayload,
  draftReviewFormSchema,
  finalReviewFormSchema,
} from "@/lib/review/review.schema";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import { writeAuditLog } from "@/lib/audit";



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

async function getOwnReview(projectId: string, panelMemberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, status, draft_submitted_at")
    .eq("project_id", projectId)
    .eq("panel_member_id", panelMemberId)
    .maybeSingle();

  return data as { id: string; status: string; draft_submitted_at: string | null } | null;
}



function revalidatePanelReviewPaths(projectId: string) {
  revalidatePath("/", "layout");
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
  const existingReview = await getOwnReview(projectIdResult.data, profile.id);
  const payload = {
    ...buildDraftReviewPayload(parsed.data, projectIdResult.data, profile.id),
    status: existingReview?.status === "final_reviewed" ? "final_reviewed" : "draft_reviewed",
    draft_submitted_at: new Date().toISOString(),
  };
  const result = existingReview
    ? await supabase.from("reviews").update(payload).eq("id", existingReview.id).select("id").single()
    : await supabase.from("reviews").insert(payload).select("id").single();

  if (result.error || !result.data) {
    return { ok: false, message: result.error?.message || "Unable to save draft review." };
  }

  await writeAuditLog(profile.id, "panel_submitted_draft_review", "review", result.data.id, {
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
  const existingReview = await getOwnReview(projectIdResult.data, profile.id);

  if (!existingReview?.draft_submitted_at) {
    return { ok: false, message: "Submit the draft review before the final review." };
  }

  const { data, error } = await supabase
    .from("reviews")
    .update(
      {
        ...buildFinalReviewPayload(parsed.data),
        final_submitted_at: new Date().toISOString(),
      },
    )
    .eq("id", existingReview.id)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "Unable to save final review." };
  }

  await writeAuditLog(profile.id, "panel_submitted_final_review", "review", data.id, {
    project_id: projectIdResult.data,
  });
  revalidatePanelReviewPaths(projectIdResult.data);
  redirect(`/panel/projects/${projectIdResult.data}`);
}
