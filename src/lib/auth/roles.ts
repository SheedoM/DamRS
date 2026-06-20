export const USER_ROLES = ["admin", "student", "panel_member"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: "/admin",
  student: "/student",
  panel_member: "/panel",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role];
}
