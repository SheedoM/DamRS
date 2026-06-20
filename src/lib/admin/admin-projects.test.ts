import { describe, expect, it } from "vitest";

import {
  filterAdminProjects,
  getAssignmentStatus,
  type AdminProjectRow,
} from "./admin-projects";

const projects: AdminProjectRow[] = [
  {
    id: "p1",
    title: "Vision Attendance",
    status: "submitted",
    department: "Computer Science",
    program: "computer_science",
    supervisor_name: "Dr. A",
    team_leader_name: "Student A",
    active_assignment_count: 0,
    required_review_count: 0,
    completed_draft_review_count: 0,
    completed_final_review_count: 0,
    submitted_at: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "p2",
    title: "Secure Archive",
    status: "assigned",
    department: "Information Systems",
    program: "information_systems",
    supervisor_name: "Dr. B",
    team_leader_name: "Student B",
    active_assignment_count: 2,
    required_review_count: 2,
    completed_draft_review_count: 2,
    completed_final_review_count: 2,
    submitted_at: "2026-06-02T10:00:00.000Z",
  },
  {
    id: "p3",
    title: "IoT Locker",
    status: "assigned",
    department: "Computer Science",
    program: "computer_science",
    supervisor_name: "Dr. C",
    team_leader_name: "Student C",
    active_assignment_count: 2,
    required_review_count: 2,
    completed_draft_review_count: 1,
    completed_final_review_count: 1,
    submitted_at: "2026-06-03T10:00:00.000Z",
  },
  {
    id: "p4",
    title: "Draft Assistant",
    status: "draft",
    department: "Artificial Intelligence",
    program: "artificial_intelligence",
    supervisor_name: "Dr. D",
    team_leader_name: "Student D",
    active_assignment_count: 0,
    required_review_count: 0,
    completed_draft_review_count: 0,
    completed_final_review_count: 0,
    submitted_at: null,
  },
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

  it("filters dashboard routes by submission and review status", () => {
    expect(filterAdminProjects(projects, { submission: "submitted" })).toEqual([
      projects[0],
      projects[1],
      projects[2],
    ]);
    expect(filterAdminProjects(projects, { submission: "draft" })).toEqual([projects[3]]);
    expect(filterAdminProjects(projects, { reviewStatus: "final-complete" })).toEqual([projects[1]]);
    expect(filterAdminProjects(projects, { reviewStatus: "final-pending" })).toEqual([projects[2]]);
    expect(filterAdminProjects(projects, { reviewStatus: "draft-pending" })).toEqual([projects[2]]);
  });
});
