import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjects } from "@/lib/panel/queries";
import { filterPanelProjects, getPanelProjectReviewBadge, type PanelProjectReviewFilter } from "@/lib/panel/panel-projects";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";



function normalizeReviewFilter(value?: string): PanelProjectReviewFilter {
  if (value === "reviewed" || value === "pending-draft" || value === "pending-final") return value;
  return "all";
}

function filterTitle(filter: PanelProjectReviewFilter) {
  if (filter === "reviewed") return "Reviewed projects";
  if (filter === "pending-draft") return "Projects pending draft review";
  if (filter === "pending-final") return "Projects pending final review";
  return "Projects assigned to you";
}

export default async function PanelProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const params = await searchParams;
  const reviewFilter = normalizeReviewFilter(params.review);
  const projects = await getPanelProjects(profile.id);
  const filteredProjects = filterPanelProjects(projects, { review: reviewFilter });

  return (
    <AppShell title="Assigned Projects" profile={profile}>
      <Card>
        <CardHeader>
          <CardTitle>{filterTitle(reviewFilter)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredProjects.length > 0 ? filteredProjects.map((project) => {
            const reviewBadge = getPanelProjectReviewBadge(project.reviewStatus);

            return (
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
                  <Badge tone={reviewBadge.tone}>{reviewBadge.label}</Badge>
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
            );
          }) : (
            <p className="text-sm text-slate-500">No projects match this view.</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
