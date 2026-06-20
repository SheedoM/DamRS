import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOfficialProjectGrade } from "@/lib/review/review.schema";

export type StudentReviewProgress = {
  reviewCount: number;
  totalPanelMembers: number;
  finalGrade: number | null;
  gradePercentage: string | null;
  gradeSource: "none" | "panel_average" | "dean_override";
};

export async function getStudentReviewProgress(projectId: string): Promise<StudentReviewProgress> {
  const supabase = await createSupabaseAdminClient();

  const { data: assignments, error: assignmentsError } = await supabase
    .from("panel_assignments")
    .select("panel_member_id")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (assignmentsError) throw new Error("Failed to load panel assignments");

  const activePanelMemberIds = assignments.map((a) => a.panel_member_id);

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("panel_member_id, status, documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, final_submitted_at, admin_entered_by")
    .eq("project_id", projectId);

  if (reviewsError) throw new Error("Failed to load reviews");

  const { data: overrides, error: overridesError } = await supabase
    .from("grade_overrides")
    .select("documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, is_active")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .limit(1);

  if (overridesError) throw new Error("Failed to load overrides");

  const activeOverride = overrides[0] || null;

  const officialGrade = getOfficialProjectGrade({
    activePanelMemberIds,
    reviews,
    activeOverride,
  });

  return {
    reviewCount: officialGrade.completedReviewCount,
    totalPanelMembers: officialGrade.requiredReviewCount,
    finalGrade: officialGrade.displayGrade,
    gradePercentage: officialGrade.displayPercentage,
    gradeSource: officialGrade.source,
  };
}
