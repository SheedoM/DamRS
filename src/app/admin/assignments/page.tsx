import Link from "next/link";

import { AssignPanelMemberForm, RevokeAssignmentForm } from "./assignment-forms";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects, getAllAssignments, getPanelMembers } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  const { profile } = await requireRole(["admin"]);
  const [projects, panelMembers, assignments] = await Promise.all([
    getAdminProjects(),
    getPanelMembers(),
    getAllAssignments(),
  ]);

  return (
    <AppShell title="Assignments" profile={profile}>
      <div className="space-y-5">
        <AssignPanelMemberForm projects={projects} panelMembers={panelMembers} />
        <Card>
          <CardHeader><CardTitle>Assignment history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {assignments.length > 0 ? assignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-950">{assignment.project_title}</p>
                  <p className="text-sm text-slate-500">{assignment.panel_member_name} - {assignment.panel_member_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={assignment.is_active ? "success" : "neutral"}>{assignment.is_active ? "active" : "revoked"}</Badge>
                  <Link href={`/admin/projects/${assignment.project_id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Project</Link>
                  <RevokeAssignmentForm assignment={assignment} />
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No assignments yet.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
