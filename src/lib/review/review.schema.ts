import { z } from "zod";

export const reviewTypes = ["draft", "final"] as const;

export type ReviewType = (typeof reviewTypes)[number];

export const reviewTypeSchema = z.enum(reviewTypes);

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

export type DraftReviewFormValues = z.infer<typeof draftReviewFormSchema>;
export type FinalReviewFormValues = z.infer<typeof finalReviewFormSchema>;

export type ReviewPayload = ReviewScores & {
  project_id: string;
  panel_member_id: string;
  review_type: ReviewType;
  notes: string | null;
  questions: string | null;
};

export type ReviewStatus = {
  draftSubmitted: boolean;
  draftSubmittedAt: string | null;
  finalSubmitted: boolean;
  finalSubmittedAt: string | null;
  fullyReviewed: boolean;
};

export type CombinedReviewGrade = {
  draftScore: number | null;
  finalComponentScore: number | null;
  totalScore: number | null;
  percentage: string | null;
  isComplete: boolean;
};

type ReviewGradeInput = Partial<ReviewScores> & {
  review_type: string;
  submitted_at: string | null;
};

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed.length > 0 ? trimmed : null;
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

export function buildDraftReviewPayload(
  form: DraftReviewFormValues,
  projectId: string,
  panelMemberId: string,
): ReviewPayload {
  return {
    project_id: projectId,
    panel_member_id: panelMemberId,
    review_type: "draft",
    documentation_score: form.documentation_score,
    implementation_score: form.implementation_score,
    code_quality_score: form.code_quality_score,
    innovation_score: form.innovation_score,
    presentation_score: 0,
    discussion_score: 0,
    notes: optionalText(form.notes),
    questions: optionalText(form.questions),
  };
}

export function buildFinalReviewPayload(
  form: FinalReviewFormValues,
  projectId: string,
  panelMemberId: string,
): ReviewPayload {
  return {
    project_id: projectId,
    panel_member_id: panelMemberId,
    review_type: "final",
    documentation_score: 0,
    implementation_score: 0,
    code_quality_score: 0,
    innovation_score: 0,
    presentation_score: form.presentation_score,
    discussion_score: form.discussion_score,
    notes: optionalText(form.notes),
    questions: null,
  };
}

function scoreFromReview(review: ReviewGradeInput) {
  return calculateReviewTotal({
    documentation_score: Number(review.documentation_score || 0),
    implementation_score: Number(review.implementation_score || 0),
    code_quality_score: Number(review.code_quality_score || 0),
    innovation_score: Number(review.innovation_score || 0),
    presentation_score: Number(review.presentation_score || 0),
    discussion_score: Number(review.discussion_score || 0),
  });
}

export function getCombinedReviewGrade(reviews: ReviewGradeInput[]): CombinedReviewGrade {
  const draft = reviews.find((review) => review.review_type === "draft" && review.submitted_at);
  const final = reviews.find((review) => review.review_type === "final" && review.submitted_at);
  const draftScore = draft ? scoreFromReview(draft) : null;
  const finalComponentScore = final ? scoreFromReview(final) : null;
  const totalScore = draftScore !== null && finalComponentScore !== null
    ? Number((draftScore + finalComponentScore).toFixed(2))
    : null;

  return {
    draftScore,
    finalComponentScore,
    totalScore,
    percentage: totalScore !== null ? `${totalScore.toFixed(2)}%` : null,
    isComplete: totalScore !== null,
  };
}

export function getProjectStatusAfterReview(currentStatus: string, reviewType: ReviewType) {
  if (currentStatus === "completed") return "completed";
  if (currentStatus === "final_reviewed") return "final_reviewed";
  if (reviewType === "final") return "final_reviewed";
  return "draft_reviewed";
}

export function getPanelProjectReviewStatus(
  reviews: { review_type: string; submitted_at: string | null }[],
): ReviewStatus {
  const draft = reviews.find((review) => review.review_type === "draft" && review.submitted_at);
  const final = reviews.find((review) => review.review_type === "final" && review.submitted_at);

  return {
    draftSubmitted: Boolean(draft),
    draftSubmittedAt: draft?.submitted_at || null,
    finalSubmitted: Boolean(final),
    finalSubmittedAt: final?.submitted_at || null,
    fullyReviewed: Boolean(draft && final),
  };
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
