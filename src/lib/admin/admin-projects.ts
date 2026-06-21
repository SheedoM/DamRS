export type AssignmentStatus = "assigned" | "unassigned";
export type SubmissionFilter = "all" | "submitted" | "draft";
export type AdminReviewFilter = "all" | "final-complete" | "final-pending" | "draft-pending";

export type AdminProjectRow = {
  id: string;
  title: string;
  status: string;
  department: string;
  supervisor_name: string;
  team_leader_name: string;
  active_assignment_count: number;
  required_review_count: number;
  completed_draft_review_count: number;
  completed_final_review_count: number;
  submitted_at: string | null;
};

export type AdminProjectFilters = {
  status?: string;
  submission?: SubmissionFilter;
  department?: string;
  supervisor?: string;
  assignmentStatus?: AssignmentStatus | "all";
  reviewStatus?: AdminReviewFilter;
};

export function getAssignmentStatus(activeAssignmentCount: number): AssignmentStatus {
  return activeAssignmentCount > 0 ? "assigned" : "unassigned";
}

export function getAdminReviewStatus(project: AdminProjectRow): Exclude<AdminReviewFilter, "all"> | "none" {
  if (project.required_review_count === 0) return "none";
  if (project.completed_final_review_count === project.required_review_count) return "final-complete";
  if (project.completed_draft_review_count < project.required_review_count) return "draft-pending";
  return "final-pending";
}

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
    if (filters.reviewStatus && filters.reviewStatus !== "all") {
      if (filters.reviewStatus === "final-complete") {
        return project.required_review_count > 0
          && project.completed_final_review_count === project.required_review_count;
      }

      if (filters.reviewStatus === "final-pending") {
        return project.required_review_count > 0
          && project.completed_final_review_count < project.required_review_count;
      }

      if (filters.reviewStatus === "draft-pending") {
        return project.required_review_count > 0
          && project.completed_draft_review_count < project.required_review_count;
      }
    }

    return true;
  });
}
