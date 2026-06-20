import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminProjectsTable } from "./projects-table";
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
    <AppShell title="المشاريع" profile={profile}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link href="/admin/projects/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إنشاء مشروع
          </Link>
        </div>
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
      </div>
    </AppShell>
  );
}
