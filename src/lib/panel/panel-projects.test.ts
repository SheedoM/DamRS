import { describe, expect, it } from "vitest";

import { filterPanelProjects, getPanelProjectReviewBadge, type PanelProjectReviewFilter } from "./panel-projects";

const baseProject = {
  status: "assigned",
  department: "Computer Science",
  supervisor_name: "Dr. A",
  team_leader_name: "Student A",
  submitted_at: "2026-06-20T10:00:00.000Z",
  assigned_at: "2026-06-20T11:00:00.000Z",
};

const projects = [
  {
    ...baseProject,
    id: "p1",
    title: "Reviewed",
    reviewStatus: {
      draftSubmitted: true,
      draftSubmittedAt: "2026-06-20T11:00:00.000Z",
      finalSubmitted: true,
      finalSubmittedAt: "2026-06-20T12:00:00.000Z",
      fullyReviewed: true,
    },
  },
  {
    ...baseProject,
    id: "p2",
    title: "Needs final",
    reviewStatus: {
      draftSubmitted: true,
      draftSubmittedAt: "2026-06-20T11:00:00.000Z",
      finalSubmitted: false,
      finalSubmittedAt: null,
      fullyReviewed: false,
    },
  },
  {
    ...baseProject,
    id: "p3",
    title: "Needs draft",
    reviewStatus: {
      draftSubmitted: false,
      draftSubmittedAt: null,
      finalSubmitted: false,
      finalSubmittedAt: null,
      fullyReviewed: false,
    },
  },
];

describe("panel project filters", () => {
  it.each([
    ["all", ["p1", "p2", "p3"]],
    ["reviewed", ["p1"]],
    ["pending-draft", ["p3"]],
    ["pending-final", ["p2", "p3"]],
  ] satisfies [PanelProjectReviewFilter, string[]][])("filters %s projects", (review, expectedIds) => {
    expect(filterPanelProjects(projects, { review }).map((project) => project.id)).toEqual(expectedIds);
  });

  it.each([
    [projects[0].reviewStatus, { label: "Review complete", tone: "success" }],
    [projects[1].reviewStatus, { label: "Pending final review", tone: "warning" }],
    [projects[2].reviewStatus, { label: "Pending draft review", tone: "warning" }],
  ] as const)("builds one panel-facing review badge", (reviewStatus, expected) => {
    expect(getPanelProjectReviewBadge(reviewStatus)).toEqual(expected);
  });
});
