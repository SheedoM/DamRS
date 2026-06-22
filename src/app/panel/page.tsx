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
  getPanelProjectStatuses,
  type PanelProjectReviewFilter,
} from "@/lib/panel/panel-projects";
import { projectStatusLabel } from "@/lib/i18n/labels";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeReviewFilter(value?: string): PanelProjectReviewFilter {
  if (value === "graded" || value === "pending") return value;
  return "all";
}

// Build a /panel href that preserves both filter dimensions.
function panelFilterHref(review: PanelProjectReviewFilter, status: string) {
  const sp = new URLSearchParams();
  if (review !== "all") sp.set("review", review);
  if (status !== "all") sp.set("status", status);
  const qs = sp.toString();
  return qs ? `/panel?${qs}` : "/panel";
}

export default async function PanelHomePage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; status?: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const params = await searchParams;
  const reviewFilter = normalizeReviewFilter(params.review);
  const statusFilter = params.status || "all";

  const [projects, gradingOpen] = await Promise.all([
    getPanelProjects(profile.id),
    isActiveCycleGradingOpen(),
  ]);
  const stats = getPanelDashboardStats(projects);
  const availableStatuses = getPanelProjectStatuses(projects);
  const filteredProjects = filterPanelProjects(projects, { review: reviewFilter, status: statusFilter });

  return (
    <AppShell title="المشاريع المسندة" profile={profile}>
      <div className="space-y-5">
        {!gradingOpen ? (
          <Alert>باب التقييم مغلق حاليًا. لا يمكنك إدخال الدرجات حتى يفتحه المسؤول.</Alert>
        ) : null}

        <Card data-tour="panel-assigned">
          <CardHeader>
            <CardTitle>
              المشاريع المسندة إليك ({stats.assignedProjects}) · بانتظار التقييم ({stats.pendingProjects})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div data-tour="panel-filters" className="mb-4 space-y-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">التقييم:</span>
                <Link href={panelFilterHref("all", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "all" ? "default" : "ghost", size: "sm" }))}>الكل</Link>
                <Link href={panelFilterHref("pending", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "pending" ? "default" : "ghost", size: "sm" }))}>بانتظار التقييم</Link>
                <Link href={panelFilterHref("graded", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "graded" ? "default" : "ghost", size: "sm" }))}>تم التقييم</Link>
              </div>
              {availableStatuses.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">الحالة:</span>
                  <Link href={panelFilterHref(reviewFilter, "all")} className={cn(buttonVariants({ variant: statusFilter === "all" ? "default" : "ghost", size: "sm" }))}>الكل</Link>
                  {availableStatuses.map((status) => (
                    <Link key={status} href={panelFilterHref(reviewFilter, status)} className={cn(buttonVariants({ variant: statusFilter === status ? "default" : "ghost", size: "sm" }))}>
                      {projectStatusLabel(status)}
                    </Link>
                  ))}
                </div>
              ) : null}
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
                      {/* eslint-disable-next-line react-hooks/purity */}
                      {project.assigned_at && (Date.now() - new Date(project.assigned_at).getTime()) < 48 * 60 * 60 * 1000 ? (
                        <Badge tone="info">جديد</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {project.team_leader_name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={reviewBadge.tone}>{reviewBadge.label}</Badge>
                      {project.roles.committee ? <Badge tone="info">عضو لجنة</Badge> : null}
                      {project.roles.supervisor ? <Badge tone="neutral">مشرف</Badge> : null}
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
