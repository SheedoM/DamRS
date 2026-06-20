import { z } from "zod";

export const reviewStatuses = ["draft_reviewed", "final_reviewed"] as const;

export type ReviewStatusValue = (typeof reviewStatuses)[number];

export const reviewStatusSchema = z.enum(reviewStatuses);

export const reviewScoreLimits = {
  documentation_score: 20,
  implementation_score: 25,
  code_quality_score: 20,
  innovation_score: 15,
  presentation_score: 10,
  discussion_score: 10,
} as const;

type ScoreField = keyof typeof reviewScoreLimits;

export type ReviewScores = Record<ScoreField, number>;

const scoreSchema = (label: string, max: number) =>
  z.coerce
    .number()
    .min(0, `${label} score cannot be below 0.`)
    .max(max, `${label} score cannot exceed ${max}.`);

const textSchema = z.string().optional().default("");

export const draftReviewFormSchema = z.object({
  documentation_score: scoreSchema("Documentation", reviewScoreLimits.documentation_score),
  implementation_score: scoreSchema("Implementation", reviewScoreLimits.implementation_score),
  code_quality_score: scoreSchema("Code quality", reviewScoreLimits.code_quality_score),
  innovation_score: scoreSchema("Innovation", reviewScoreLimits.innovation_score),
  notes: textSchema,
  questions: textSchema,
});

export const finalReviewFormSchema = z.object({
  presentation_score: scoreSchema("Presentation", reviewScoreLimits.presentation_score),
  discussion_score: scoreSchema("Discussion", reviewScoreLimits.discussion_score),
  notes: textSchema,
});

export const gradeOverrideFormSchema = z.object({
  documentation_score: scoreSchema("Documentation", reviewScoreLimits.documentation_score),
  implementation_score: scoreSchema("Implementation", reviewScoreLimits.implementation_score),
  code_quality_score: scoreSchema("Code quality", reviewScoreLimits.code_quality_score),
  innovation_score: scoreSchema("Innovation", reviewScoreLimits.innovation_score),
  presentation_score: scoreSchema("Presentation", reviewScoreLimits.presentation_score),
  discussion_score: scoreSchema("Discussion", reviewScoreLimits.discussion_score),
  reason: z.string().trim().min(5, "Override reason is required."),
});

export type DraftReviewFormValues = z.infer<typeof draftReviewFormSchema>;
export type FinalReviewFormValues = z.infer<typeof finalReviewFormSchema>;
export type GradeOverrideFormValues = z.infer<typeof gradeOverrideFormSchema>;

export type DraftReviewPayload = Pick<
  ReviewScores,
  "documentation_score" | "implementation_score" | "code_quality_score" | "innovation_score"
> & {
  project_id: string;
  panel_member_id: string;
  status: "draft_reviewed";
  draft_notes: string | null;
  draft_questions: string | null;
};

export type FinalReviewPayload = Pick<
  ReviewScores,
  "presentation_score" | "discussion_score"
> & {
  status: "final_reviewed";
  final_notes: string | null;
};

export type ReviewStatus = {
  draftSubmitted: boolean;
  draftSubmittedAt: string | null;
  finalSubmitted: boolean;
  finalSubmittedAt: string | null;
  fullyReviewed: boolean;
};

export type UnifiedReviewGradeInput = Partial<ReviewScores> & {
  panel_member_id: string;
  status: string | null;
  draft_submitted_at?: string | null;
  final_submitted_at?: string | null;
};

export type GradeOverrideInput = Partial<ReviewScores>;

export type OfficialProjectGrade = {
  completedReviewCount: number;
  requiredReviewCount: number;
  isPanelComplete: boolean;
  panelAverage: number | null;
  panelAveragePercentage: string | null;
  provisionalAverage: number | null;
  provisionalAveragePercentage: string | null;
  officialGrade: number | null;
  officialPercentage: string | null;
  officialSource: "panel" | "override" | null;
};

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed.length > 0 ? trimmed : null;
}

function formatPercentage(value: number | null) {
  return value === null ? null : `${value.toFixed(2)}%`;
}

export function calculateReviewTotal(scores: ReviewScores) {
  return Number(
    (
      scores.documentation_score
      + scores.implementation_score
      + scores.code_quality_score
      + scores.innovation_score
      + scores.presentation_score
      + scores.discussion_score
    ).toFixed(2),
  );
}

function normalizeScores(input: Partial<ReviewScores>): ReviewScores {
  return {
    documentation_score: Number(input.documentation_score || 0),
    implementation_score: Number(input.implementation_score || 0),
    code_quality_score: Number(input.code_quality_score || 0),
    innovation_score: Number(input.innovation_score || 0),
    presentation_score: Number(input.presentation_score || 0),
    discussion_score: Number(input.discussion_score || 0),
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function buildDraftReviewPayload(
  form: DraftReviewFormValues,
  projectId: string,
  panelMemberId: string,
): DraftReviewPayload {
  return {
    project_id: projectId,
    panel_member_id: panelMemberId,
    status: "draft_reviewed",
    documentation_score: form.documentation_score,
    implementation_score: form.implementation_score,
    code_quality_score: form.code_quality_score,
    innovation_score: form.innovation_score,
    draft_notes: optionalText(form.notes),
    draft_questions: optionalText(form.questions),
  };
}

export function buildFinalReviewPayload(form: FinalReviewFormValues): FinalReviewPayload {
  return {
    status: "final_reviewed",
    presentation_score: form.presentation_score,
    discussion_score: form.discussion_score,
    final_notes: optionalText(form.notes),
  };
}

export function buildGradeOverridePayload(form: GradeOverrideFormValues): ReviewScores & { reason: string } {
  return {
    documentation_score: form.documentation_score,
    implementation_score: form.implementation_score,
    code_quality_score: form.code_quality_score,
    innovation_score: form.innovation_score,
    presentation_score: form.presentation_score,
    discussion_score: form.discussion_score,
    reason: form.reason.trim(),
  };
}

export function getReviewTotal(review: Partial<ReviewScores>) {
  return calculateReviewTotal(normalizeScores(review));
}

export function getPanelProjectReviewStatus(
  review: { status: string | null; draft_submitted_at?: string | null; final_submitted_at?: string | null } | null,
): ReviewStatus {
  return {
    draftSubmitted: Boolean(review?.draft_submitted_at),
    draftSubmittedAt: review?.draft_submitted_at || null,
    finalSubmitted: review?.status === "final_reviewed" && Boolean(review.final_submitted_at),
    finalSubmittedAt: review?.final_submitted_at || null,
    fullyReviewed: review?.status === "final_reviewed" && Boolean(review.final_submitted_at),
  };
}

export function getOfficialProjectGrade({
  activePanelMemberIds,
  reviews,
  activeOverride,
}: {
  activePanelMemberIds: string[];
  reviews: UnifiedReviewGradeInput[];
  activeOverride: GradeOverrideInput | null;
}): OfficialProjectGrade {
  const activePanelSet = new Set(activePanelMemberIds);
  const completedReviews = reviews.filter(
    (review) => activePanelSet.has(review.panel_member_id) && review.status === "final_reviewed",
  );
  const completedScores = completedReviews.map((review) => getReviewTotal(review));
  const provisionalAverage = average(completedScores);
  const requiredReviewCount = activePanelMemberIds.length;
  const isPanelComplete = requiredReviewCount > 0 && completedReviews.length === requiredReviewCount;
  const panelAverage = isPanelComplete ? provisionalAverage : null;
  const overrideGrade = activeOverride ? getReviewTotal(activeOverride) : null;
  const officialGrade = overrideGrade ?? panelAverage;

  return {
    completedReviewCount: completedReviews.length,
    requiredReviewCount,
    isPanelComplete,
    panelAverage,
    panelAveragePercentage: formatPercentage(panelAverage),
    provisionalAverage,
    provisionalAveragePercentage: formatPercentage(provisionalAverage),
    officialGrade,
    officialPercentage: formatPercentage(officialGrade),
    officialSource: overrideGrade !== null ? "override" : panelAverage !== null ? "panel" : null,
  };
}

export function getProjectStatusFromReviewProgress({
  currentStatus,
  activePanelMemberIds,
  reviews,
}: {
  currentStatus: string;
  activePanelMemberIds: string[];
  reviews: { panel_member_id: string; status: string | null }[];
}) {
  if (currentStatus === "completed") return "completed";
  if (activePanelMemberIds.length === 0) return currentStatus === "draft" ? "draft" : "submitted";

  const reviewByPanelMember = new Map(reviews.map((review) => [review.panel_member_id, review.status]));
  const statuses = activePanelMemberIds.map((panelMemberId) => reviewByPanelMember.get(panelMemberId) || null);

  if (statuses.every((status) => status === "final_reviewed")) return "final_reviewed";
  if (statuses.every((status) => status === "draft_reviewed" || status === "final_reviewed")) return "draft_reviewed";

  return "assigned";
}

export function getPanelDashboardStats(
  projects: { reviewStatus: ReviewStatus }[],
) {
  return {
    assignedProjects: projects.length,
    reviewedProjects: projects.filter((project) => project.reviewStatus.fullyReviewed).length,
    pendingDraftReviews: projects.filter((project) => !project.reviewStatus.draftSubmitted).length,
    pendingFinalReviews: projects.filter((project) => !project.reviewStatus.finalSubmitted).length,
  };
}

