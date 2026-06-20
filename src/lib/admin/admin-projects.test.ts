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
    supervisor_name: "Dr. A",
    team_leader_name: "Student A",
    active_assignment_count: 0,
    submitted_at: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "p2",
    title: "Secure Archive",
    status: "assigned",
    department: "Information Systems",
    supervisor_name: "Dr. B",
    team_leader_name: "Student B",
    active_assignment_count: 2,
    submitted_at: "2026-06-02T10:00:00.000Z",
  },
];

describe("admin project helpers", () => {
  it("marks projects with active panel members as assigned", () => {
    expect(getAssignmentStatus(0)).toBe("unassigned");
    expect(getAssignmentStatus(1)).toBe("assigned");
  });

  it("filters by status, department, supervisor, and assignment status", () => {
    expect(filterAdminProjects(projects, { status: "submitted" })).toHaveLength(1);
    expect(filterAdminProjects(projects, { department: "information" })).toEqual([projects[1]]);
    expect(filterAdminProjects(projects, { supervisor: "dr. a" })).toEqual([projects[0]]);
    expect(filterAdminProjects(projects, { assignmentStatus: "unassigned" })).toEqual([projects[0]]);
    expect(filterAdminProjects(projects, { assignmentStatus: "assigned" })).toEqual([projects[1]]);
  });
});
