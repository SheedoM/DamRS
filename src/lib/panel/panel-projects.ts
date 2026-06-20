import type { PanelProjectListItem } from "./queries";
import type { ReviewStatus } from "@/lib/review/review.schema";

export type PanelProjectReviewFilter = "all" | "reviewed" | "pending-draft" | "pending-final";
export type PanelProjectReviewBadge = {
  label: "Review complete" | "Pending final review" | "Pending draft review";
  tone: "success" | "warning";
};

export function getPanelProjectReviewBadge(reviewStatus: ReviewStatus): PanelProjectReviewBadge {
  if (reviewStatus.fullyReviewed) {
    return { label: "Review complete", tone: "success" };
  }

  if (reviewStatus.draftSubmitted) {
    return { label: "Pending final review", tone: "warning" };
  }

  return { label: "Pending draft review", tone: "warning" };
}

export function filterPanelProjects(
  projects: PanelProjectListItem[],
  filters: { review?: PanelProjectReviewFilter },
) {
  if (!filters.review || filters.review === "all") return projects;

  return projects.filter((project) => {
    if (filters.review === "reviewed") return project.reviewStatus.fullyReviewed;
    if (filters.review === "pending-draft") return !project.reviewStatus.draftSubmitted;
    if (filters.review === "pending-final") return !project.reviewStatus.finalSubmitted;
    return true;
  });
}
