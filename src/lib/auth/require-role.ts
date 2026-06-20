import { redirect } from "next/navigation";

import { getCurrentProfile } from "./get-current-profile";
import { getDashboardPathForRole, type UserRole } from "./roles";

export async function requireRole(allowedRoles: UserRole[]) {
  const result = await getCurrentProfile();

  if (result.status === "missing_session") {
    redirect("/login");
  }

  if (result.status === "missing_profile") {
    redirect("/account/setup");
  }

  if (result.status === "invalid_role") {
    redirect("/unauthorized");
  }

  if (!allowedRoles.includes(result.profile.role)) {
    redirect(getDashboardPathForRole(result.profile.role));
  }

  return result;
}
