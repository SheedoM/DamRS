export type AssignmentStatus = "assigned" | "unassigned";

export type AdminProjectRow = {
  id: string;
  title: string;
  status: string;
  department: string;
  supervisor_name: string;
  team_leader_name: string;
  active_assignment_count: number;
  submitted_at: string | null;
};

export type AdminProjectFilters = {
  status?: string;
  department?: string;
  supervisor?: string;
  assignmentStatus?: AssignmentStatus | "all";
};

export function getAssignmentStatus(activeAssignmentCount: number): AssignmentStatus {
  return activeAssignmentCount > 0 ? "assigned" : "unassigned";
}

function includesNormalized(value: string, query?: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase().trim());
}

export function filterAdminProjects(
  projects: AdminProjectRow[],
  filters: AdminProjectFilters,
) {
  return projects.filter((project) => {
    if (filters.status && project.status !== filters.status) return false;
    if (!includesNormalized(project.department, filters.department)) return false;
    if (!includesNormalized(project.supervisor_name, filters.supervisor)) return false;
    if (
      filters.assignmentStatus &&
      filters.assignmentStatus !== "all" &&
      getAssignmentStatus(project.active_assignment_count) !== filters.assignmentStatus
    ) {
      return false;
    }

    return true;
  });
}
