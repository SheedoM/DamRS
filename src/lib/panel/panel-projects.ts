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
  filters: { review?: PanelProjectReviewFilter },
) {
  if (!filters.review || filters.review === "all") return projects;

  return projects.filter((project) =>
    filters.review === "graded" ? project.graded : !project.graded,
  );
}

export function getPanelDashboardStats(projects: { graded: boolean }[]) {
  return {
    assignedProjects: projects.length,
    gradedProjects: projects.filter((project) => project.graded).length,
    pendingProjects: projects.filter((project) => !project.graded).length,
  };
}
