import { describe, expect, it } from "vitest";

import { filterPanelProjects, getPanelProjectReviewBadge, type PanelProjectReviewFilter } from "./panel-projects";

const baseProject = {
  status: "assigned",
  program: "computer_science",
  supervisor_name: "Dr. A",
  team_leader_name: "Student A",
  submitted_at: "2026-06-20T10:00:00.000Z",
  assigned_at: "2026-06-20T11:00:00.000Z",
};

const projects = [
  { ...baseProject, id: "p1", title: "Graded", graded: true },
  { ...baseProject, id: "p2", title: "Pending one", graded: false },
  { ...baseProject, id: "p3", title: "Pending two", graded: false },
];

describe("panel project filters", () => {
  it.each([
    ["all", ["p1", "p2", "p3"]],
    ["graded", ["p1"]],
    ["pending", ["p2", "p3"]],
  ] satisfies [PanelProjectReviewFilter, string[]][])("filters %s projects", (review, expectedIds) => {
    expect(filterPanelProjects(projects, { review }).map((project) => project.id)).toEqual(expectedIds);
  });

  it("builds a graded/not-graded badge", () => {
    expect(getPanelProjectReviewBadge(true)).toEqual({ label: "تم التقييم", tone: "success" });
    expect(getPanelProjectReviewBadge(false)).toEqual({ label: "بانتظار التقييم", tone: "warning" });
  });
});
