import { AdminProjectsTable } from "./projects-table";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const { profile } = await requireRole(["admin"]);
  const projects = await getAdminProjects();

  return (
    <AppShell title="Projects" profile={profile}>
      <AdminProjectsTable projects={projects} />
    </AppShell>
  );
}
