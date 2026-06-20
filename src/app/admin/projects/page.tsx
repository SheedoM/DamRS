import { AdminProjectsTable } from "./projects-table";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects, getPanelMembers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    assignment?: string;
    review?: string;
    status?: string;
    submission?: string;
  }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const params = await searchParams;
  const [projects, panelMembers] = await Promise.all([
    getAdminProjects(),
    getPanelMembers(),
  ]);

  return (
    <AppShell title="Projects" profile={profile}>
      <AdminProjectsTable
        projects={projects}
        panelMembers={panelMembers}
        initialFilters={{
          assignmentStatus: params.assignment,
          reviewStatus: params.review,
          status: params.status,
          submission: params.submission,
        }}
      />
    </AppShell>
  );
}
