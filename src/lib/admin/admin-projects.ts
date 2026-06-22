export type AssignmentStatus = "assigned" | "unassigned";
export type SubmissionFilter = "all" | "submitted" | "draft";

// Grading progress derived from the per-student model (student_discussion_scores
// + student_supervision_grades). Replaces the legacy reviews-based status.
export type GradingProgress = "not_graded" | "partial" | "graded";
export type GradingFilter = "all" | "graded" | "partial" | "not-graded";

export type AdminProjectRow = {
  id: string;
  project_number: string | null;
  title: string;
  title_en: string | null;
  status: string;
  awaiting_leader: boolean;
  department: string;
  supervisor_name: string;
  team_leader_name: string;
  team_leader_student_id: string | null;
  active_assignment_count: number;
  team_member_count: number;
  // Discussion: one score per (active evaluator × team member).
  discussion_required_count: number;
  discussion_completed_count: number;
  // Supervision: one admin-entered grade per team member.
  supervision_required_count: number;
  supervision_completed_count: number;
  grading_status: GradingProgress;
  submitted_at: string | null;
};

export type AdminProjectFilters = {
  status?: string;
  submission?: SubmissionFilter;
  department?: string;
  supervisor?: string;
  assignmentStatus?: AssignmentStatus | "all";
  gradingStatus?: GradingFilter;
};

export function getAssignmentStatus(activeAssignmentCount: number): AssignmentStatus {
  return activeAssignmentCount > 0 ? "assigned" : "unassigned";
}

export type GradingCounts = {
  discussion_required_count: number;
  discussion_completed_count: number;
  supervision_required_count: number;
  supervision_completed_count: number;
};

// A project is "graded" only when every active evaluator has scored every
// student AND every student has an admin-entered supervision grade. Any progress
// short of that (but more than nothing) is "partial".
export function getGradingProgress(counts: GradingCounts): GradingProgress {
  const {
    discussion_required_count,
    discussion_completed_count,
    supervision_required_count,
    supervision_completed_count,
  } = counts;

  if (discussion_completed_count === 0 && supervision_completed_count === 0) {
    return "not_graded";
  }

  const discussionComplete =
    discussion_required_count > 0 && discussion_completed_count >= discussion_required_count;
  const supervisionComplete =
    supervision_required_count > 0 && supervision_completed_count >= supervision_required_count;

  return discussionComplete && supervisionComplete ? "graded" : "partial";
}

const gradingFilterToStatus: Record<Exclude<GradingFilter, "all">, GradingProgress> = {
  graded: "graded",
  partial: "partial",
  "not-graded": "not_graded",
};

function includesNormalized(value: string, query?: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase().trim());
}

export function filterAdminProjects(
  projects: AdminProjectRow[],
  filters: AdminProjectFilters,
) {
  return projects.filter((project) => {
    if (filters.status && project.status !== filters.status) return false;
    if (filters.submission === "submitted" && project.status === "draft") return false;
    if (filters.submission === "draft" && project.status !== "draft") return false;
    if (!includesNormalized(project.department, filters.department)) return false;
    if (!includesNormalized(project.supervisor_name, filters.supervisor)) return false;
    if (
      filters.assignmentStatus &&
      filters.assignmentStatus !== "all" &&
      getAssignmentStatus(project.active_assignment_count) !== filters.assignmentStatus
    ) {
      return false;
    }
    if (
      filters.gradingStatus &&
      filters.gradingStatus !== "all" &&
      project.grading_status !== gradingFilterToStatus[filters.gradingStatus]
    ) {
      return false;
    }

    return true;
  });
}
