import type { PanelProjectListItem } from "./queries";

export type PanelProjectReviewFilter = "all" | "graded" | "pending";
export type PanelProjectReviewBadge = {
  label: "تم التقييم" | "بانتظار التقييم";
  tone: "success" | "warning";
};

export function getPanelProjectReviewBadge(graded: boolean): PanelProjectReviewBadge {
  return graded
    ? { label: "تم التقييم", tone: "success" }
    : { label: "بانتظار التقييم", tone: "warning" };
}

export function filterPanelProjects(
  projects: PanelProjectListItem[],
  filters: { review?: PanelProjectReviewFilter; status?: string },
) {
  let result = projects;

  if (filters.review && filters.review !== "all") {
    result = result.filter((project) =>
      filters.review === "graded" ? project.graded : !project.graded,
    );
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

export function getPanelDashboardStats(projects: { graded: boolean }[]) {
  return {
    assignedProjects: projects.length,
    gradedProjects: projects.filter((project) => project.graded).length,
    pendingProjects: projects.filter((project) => !project.graded).length,
  };
}
