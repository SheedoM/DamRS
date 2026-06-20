import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjects } from "@/lib/panel/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function ReviewBadge({ submitted, label }: { submitted: boolean; label: string }) {
  return (
    <Badge tone={submitted ? "success" : "warning"}>
      {label}: {submitted ? "submitted" : "pending"}
    </Badge>
  );
}

export default async function PanelProjectsPage() {
  const { profile } = await requireRole(["panel_member"]);
  const projects = await getPanelProjects(profile.id);

  return (
    <AppShell title="Assigned Projects" profile={profile}>
      <Card>
        <CardHeader>
          <CardTitle>Projects assigned to you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length > 0 ? projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-4 rounded-md border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <div>
                  <h2 className="font-semibold text-slate-950">{project.title}</h2>
                  <p className="text-sm text-slate-500">
                    {project.department} - {project.team_leader_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">{project.status.replaceAll("_", " ")}</Badge>
                  <ReviewBadge submitted={project.reviewStatus.draftSubmitted} label="Draft" />
                  <ReviewBadge submitted={project.reviewStatus.finalSubmitted} label="Final" />
                </div>
                <p className="text-xs text-slate-500">Assigned {formatDate(project.assigned_at)}</p>
              </div>
              <Link
                href={`/panel/projects/${project.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start md:self-center")}
              >
                Open
              </Link>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No active project assignments yet.</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

