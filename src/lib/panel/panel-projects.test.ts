import { describe, expect, it } from "vitest";

import { filterPanelProjects, getPanelProjectReviewBadge, type PanelProjectGradingState, type PanelProjectReviewFilter } from "./panel-projects";

const baseProject = {
  status: "assigned",
  program: "computer_science",
  supervisor_name: "Dr. A",
  team_leader_name: "Student A",
  submitted_at: "2026-06-20T10:00:00.000Z",
  assigned_at: "2026-06-20T11:00:00.000Z",
  roles: { committee: true, supervisor: false },
};

const projects: (typeof baseProject & { id: string; title: string; gradingState: PanelProjectGradingState })[] = [
  { ...baseProject, id: "p1", title: "Final", gradingState: "final" },
  { ...baseProject, id: "p2", title: "Draft", gradingState: "draft" },
  { ...baseProject, id: "p3", title: "Not graded", gradingState: "none" },
];

describe("panel project filters", () => {
  it.each([
    ["all", ["p1", "p2", "p3"]],
    ["final", ["p1"]],
    ["partial", ["p2"]],
    ["not_graded", ["p3"]],
  ] satisfies [PanelProjectReviewFilter, string[]][])("filters %s projects", (review, expectedIds) => {
    expect(filterPanelProjects(projects, { review }).map((project) => project.id)).toEqual(expectedIds);
  });

  it("builds a badge for each grading state", () => {
    expect(getPanelProjectReviewBadge("none")).toEqual({ label: "بانتظار التقييم", tone: "warning" });
    expect(getPanelProjectReviewBadge("draft")).toEqual({ label: "مسودة محفوظة", tone: "info" });
    expect(getPanelProjectReviewBadge("final")).toEqual({ label: "تم الاعتماد", tone: "success" });
  });
});
