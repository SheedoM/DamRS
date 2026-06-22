import type { PanelProjectListItem } from "./queries";

export type PanelProjectGradingState = "none" | "draft" | "final";
export type PanelProjectReviewFilter = "all" | "not_graded" | "partial" | "final";
export type PanelProjectReviewBadge = {
  label: "بانتظار التقييم" | "مسودة محفوظة" | "تم الاعتماد";
  tone: "success" | "warning" | "info";
};

export function getPanelProjectReviewBadge(state: PanelProjectGradingState): PanelProjectReviewBadge {
  switch (state) {
    case "draft":
      return { label: "مسودة محفوظة", tone: "info" };
    case "final":
      return { label: "تم الاعتماد", tone: "success" };
    case "none":
    default:
      return { label: "بانتظار التقييم", tone: "warning" };
  }
}

export function filterPanelProjects(
  projects: PanelProjectListItem[],
  filters: { review?: PanelProjectReviewFilter; status?: string },
) {
  let result = projects;

  if (filters.review && filters.review !== "all") {
    const stateByFilter: Record<Exclude<PanelProjectReviewFilter, "all">, PanelProjectGradingState> = {
      not_graded: "none",
      partial: "draft",
      final: "final",
    };
    result = result.filter((project) => project.gradingState === stateByFilter[filters.review as Exclude<PanelProjectReviewFilter, "all">]);
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((project) => project.status === filters.status);
  }

  return result;
}

// The distinct project statuses present among the assigned projects, ordered by
// the canonical lifecycle so the filter chips read sensibly.
const STATUS_ORDER = ["draft", "submitted", "assigned", "draft_reviewed", "final_reviewed", "completed"];

export function getPanelProjectStatuses(projects: PanelProjectListItem[]): string[] {
  const present = new Set(projects.map((project) => project.status));
  const ordered = STATUS_ORDER.filter((status) => present.has(status));
  // Include any statuses not in the canonical list (defensive), preserving order.
  const extras = [...present].filter((status) => !STATUS_ORDER.includes(status));
  return [...ordered, ...extras];
}

export function getPanelDashboardStats(projects: { gradingState: PanelProjectGradingState }[]) {
  const finalizedProjects = projects.filter((project) => project.gradingState === "final").length;

  return {
    assignedProjects: projects.length,
    finalizedProjects,
    pendingProjects: projects.length - finalizedProjects,
  };
}
