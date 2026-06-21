import { describe, expect, it } from "vitest";

import {
  filterAdminProjects,
  getAssignmentStatus,
  getGradingProgress,
  type AdminProjectRow,
} from "./admin-projects";

function makeProject(overrides: Partial<AdminProjectRow>): AdminProjectRow {
  return {
    id: "p",
    project_number: "1",
    title: "Project",
    title_en: "Project",
    status: "submitted",
    awaiting_leader: false,
    department: "Computer Science",
    supervisor_name: "Dr. X",
    team_leader_name: "Student X",
    active_assignment_count: 0,
    team_member_count: 0,
    discussion_required_count: 0,
    discussion_completed_count: 0,
    supervision_required_count: 0,
    supervision_completed_count: 0,
    grading_status: "not_graded",
    submitted_at: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

const projects: AdminProjectRow[] = [
  makeProject({ id: "p1", title: "Vision Attendance", status: "submitted", department: "Computer Science", supervisor_name: "Dr. A", active_assignment_count: 0, grading_status: "not_graded" }),
  makeProject({ id: "p2", title: "Secure Archive", status: "assigned", department: "Information Systems", supervisor_name: "Dr. B", active_assignment_count: 2, grading_status: "graded" }),
  makeProject({ id: "p3", title: "IoT Locker", status: "assigned", department: "Computer Science", supervisor_name: "Dr. C", active_assignment_count: 2, grading_status: "partial" }),
  makeProject({ id: "p4", title: "Draft Assistant", status: "draft", department: "Artificial Intelligence", supervisor_name: "Dr. D", active_assignment_count: 0, grading_status: "not_graded", submitted_at: null }),
];

describe("admin project helpers", () => {
  it("marks projects with active panel members as assigned", () => {
    expect(getAssignmentStatus(0)).toBe("unassigned");
    expect(getAssignmentStatus(1)).toBe("assigned");
  });

  it("filters by status, department, supervisor, and assignment status", () => {
    expect(filterAdminProjects(projects, { status: "submitted" })).toEqual([projects[0]]);
    expect(filterAdminProjects(projects, { department: "information" })).toEqual([projects[1]]);
    expect(filterAdminProjects(projects, { supervisor: "dr. a" })).toEqual([projects[0]]);
    expect(filterAdminProjects(projects, { assignmentStatus: "unassigned" })).toEqual([projects[0], projects[3]]);
    expect(filterAdminProjects(projects, { assignmentStatus: "assigned" })).toEqual([projects[1], projects[2]]);
  });

  it("filters by submission and grading status", () => {
    expect(filterAdminProjects(projects, { submission: "submitted" })).toEqual([
      projects[0],
      projects[1],
      projects[2],
    ]);
    expect(filterAdminProjects(projects, { submission: "draft" })).toEqual([projects[3]]);
    expect(filterAdminProjects(projects, { gradingStatus: "graded" })).toEqual([projects[1]]);
    expect(filterAdminProjects(projects, { gradingStatus: "partial" })).toEqual([projects[2]]);
    expect(filterAdminProjects(projects, { gradingStatus: "not-graded" })).toEqual([projects[0], projects[3]]);
  });
});

describe("getGradingProgress", () => {
  it("is not_graded when nothing has been entered", () => {
    expect(
      getGradingProgress({
        discussion_required_count: 6,
        discussion_completed_count: 0,
        supervision_required_count: 2,
        supervision_completed_count: 0,
      }),
    ).toBe("not_graded");
  });

  it("is graded only when discussion and supervision are both complete", () => {
    expect(
      getGradingProgress({
        discussion_required_count: 6,
        discussion_completed_count: 6,
        supervision_required_count: 2,
        supervision_completed_count: 2,
      }),
    ).toBe("graded");
  });

  it("is partial when discussion is done but supervision is missing", () => {
    expect(
      getGradingProgress({
        discussion_required_count: 6,
        discussion_completed_count: 6,
        supervision_required_count: 2,
        supervision_completed_count: 1,
      }),
    ).toBe("partial");
  });

  it("is partial when some scores exist but discussion is incomplete", () => {
    expect(
      getGradingProgress({
        discussion_required_count: 6,
        discussion_completed_count: 3,
        supervision_required_count: 2,
        supervision_completed_count: 2,
      }),
    ).toBe("partial");
  });
});
