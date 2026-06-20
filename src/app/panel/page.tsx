import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjects, isActiveCycleGradingOpen } from "@/lib/panel/queries";
import {
  filterPanelProjects,
  getPanelDashboardStats,
  getPanelProjectReviewBadge,
  type PanelProjectReviewFilter,
} from "@/lib/panel/panel-projects";
import { programLabel } from "@/lib/i18n/labels";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeReviewFilter(value?: string): PanelProjectReviewFilter {
  if (value === "graded" || value === "pending") return value;
  return "all";
}

export default async function PanelHomePage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const params = await searchParams;
  const reviewFilter = normalizeReviewFilter(params.review);

  const [projects, gradingOpen] = await Promise.all([
    getPanelProjects(profile.id),
    isActiveCycleGradingOpen(),
  ]);
  const stats = getPanelDashboardStats(projects);
  const filteredProjects = filterPanelProjects(projects, { review: reviewFilter });

  return (
    <AppShell title="المشاريع المسندة" profile={profile}>
      <div className="space-y-5">
        {!gradingOpen ? (
          <Alert>باب التقييم مغلق حاليًا. لا يمكنك إدخال الدرجات حتى يفتحه المسؤول.</Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              المشاريع المسندة إليك ({stats.assignedProjects}) · بانتظار التقييم ({stats.pendingProjects})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-200 pb-4">
              <Link href="/panel" className={cn(buttonVariants({ variant: reviewFilter === "all" ? "default" : "ghost", size: "sm" }))}>الكل</Link>
              <Link href="/panel?review=pending" className={cn(buttonVariants({ variant: reviewFilter === "pending" ? "default" : "ghost", size: "sm" }))}>بانتظار التقييم</Link>
              <Link href="/panel?review=graded" className={cn(buttonVariants({ variant: reviewFilter === "graded" ? "default" : "ghost", size: "sm" }))}>تم التقييم</Link>
            </div>
            {filteredProjects.length > 0 ? filteredProjects.map((project) => {
              const reviewBadge = getPanelProjectReviewBadge(project.graded);
              return (
                <div
                  key={project.id}
                  className="flex flex-col gap-4 rounded-md border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{project.title}</h2>
                      {project.assigned_at && (Date.now() - new Date(project.assigned_at).getTime()) < 48 * 60 * 60 * 1000 ? (
                        <Badge tone="info">جديد</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {programLabel(project.program)} - {project.team_leader_name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={reviewBadge.tone}>{reviewBadge.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">تاريخ الإسناد {formatDate(project.assigned_at)}</p>
                  </div>
                  <Link
                    href={`/panel/projects/${project.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start md:self-center")}
                  >
                    فتح وتقييم
                  </Link>
                </div>
              );
            }) : (
              <p className="text-sm text-slate-500">لا توجد مشاريع مطابقة لهذا العرض.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
