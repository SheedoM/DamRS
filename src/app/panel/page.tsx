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
  getPanelProjectStatuses,
  type PanelProjectReviewFilter,
} from "@/lib/panel/panel-projects";
import { projectStatusLabel } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";
import { PanelProjectList } from "./panel-project-list";

export const dynamic = "force-dynamic";

function normalizeReviewFilter(value?: string): PanelProjectReviewFilter {
  if (value === "not_graded" || value === "partial" || value === "final") return value;
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
              المشاريع المسندة إليك ({stats.assignedProjects}) · معتمد ({stats.finalizedProjects}) · بانتظار الاعتماد ({stats.pendingProjects})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div data-tour="panel-filters" className="mb-4 space-y-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">التقييم:</span>
                <Link href={panelFilterHref("all", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "all" ? "default" : "ghost", size: "sm" }))}>الكل</Link>
                <Link href={panelFilterHref("not_graded", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "not_graded" ? "default" : "ghost", size: "sm" }))}>لم يُقيَّم</Link>
                <Link href={panelFilterHref("partial", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "partial" ? "default" : "ghost", size: "sm" }))}>مسودة</Link>
                <Link href={panelFilterHref("final", statusFilter)} className={cn(buttonVariants({ variant: reviewFilter === "final" ? "default" : "ghost", size: "sm" }))}>معتمد</Link>
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
            <PanelProjectList projects={filteredProjects} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
