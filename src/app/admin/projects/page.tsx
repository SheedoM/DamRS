import Link from "next/link";

import { AdminProjectsTable } from "./projects-table";
import { CreatePendingProjectForm } from "./create-pending-project-form";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects, getPanelMembers } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    assignment?: string;
    grading?: string;
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
    <AppShell title="المشاريع" profile={profile}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3" data-tour="admin-projects-create">
          <CreatePendingProjectForm panelMembers={panelMembers} />
          <Link
            href="/admin/projects/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            إنشاء مشروع كامل (احتياطي)
          </Link>
        </div>
        <div data-tour="admin-projects-table">
        <AdminProjectsTable
          projects={projects}
          panelMembers={panelMembers}
          initialFilters={{
            assignmentStatus: params.assignment,
            gradingStatus: params.grading,
            status: params.status,
            submission: params.submission,
          }}
        />
        </div>
      </div>
    </AppShell>
  );
}
