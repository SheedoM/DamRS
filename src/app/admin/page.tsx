import Link from "next/link";
import { ClipboardCheck, FileWarning, Files, ListChecks, UserCheck, Users } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { SubmissionWindowForm } from "./submission-window/submission-window-form";
import { AppSettingsForm } from "./settings/settings-form";
import { GradingControl } from "./grading-control";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects, getSubmissionWindow } from "@/lib/admin/queries";
import { getSubmissionWindowState } from "@/lib/admin/submission-windows";
import { getActiveCycle, getGradingWindow } from "@/lib/admin/cycle";
import { getAppSettings } from "@/lib/admin/app-settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { mode } = await searchParams;
  const [projects, windowData, cycle, settings] = await Promise.all([
    getAdminProjects(),
    getSubmissionWindow(),
    getActiveCycle(),
    getAppSettings(),
  ]);
  const gradingWindow = cycle ? await getGradingWindow(cycle.id) : null;
  const state = getSubmissionWindowState(windowData);
  const showForm = mode === "create" || mode === "edit";

  const submittedCount = projects.filter((project) => project.status !== "draft").length;
  const incompleteCount = projects.filter((project) => project.status === "draft").length;
  const unassignedCount = projects.filter((project) => project.active_assignment_count === 0).length;
  const assignedCount = projects.filter((project) => project.active_assignment_count > 0).length;
  const finalCompleteCount = projects.filter(
    (project) => project.required_review_count > 0
      && project.completed_final_review_count === project.required_review_count,
  ).length;

  const cards = [
    { title: "إجمالي المشاريع", value: String(projects.length), detail: "جميع المشاريع المرئية للمسؤول.", icon: Files, href: "/admin/projects" },
    { title: "المُسلَّمة", value: String(submittedCount), detail: "مشاريع خرجت من حالة المسودة.", icon: ListChecks, href: "/admin/projects?submission=submitted" },
    { title: "غير المكتملة", value: String(incompleteCount), detail: "مشاريع مسودة لم تُسلَّم بعد.", icon: FileWarning, href: "/admin/projects?submission=draft" },
    { title: "غير المُسندة", value: String(unassignedCount), detail: "مشاريع بدون إسناد لجنة فعّال.", icon: Users, href: "/admin/projects?assignment=unassigned" },
    { title: "المُسندة", value: String(assignedCount), detail: "مشاريع بها عضو لجنة فعّال على الأقل.", icon: ClipboardCheck, href: "/admin/projects?assignment=assigned" },
    { title: "المراجعات النهائية", value: String(finalCompleteCount), detail: "مشاريع اكتملت درجاتها النهائية.", icon: UserCheck, href: "/admin/projects?review=final-complete" },
  ];

  return (
    <AppShell title="لوحة المسؤول" profile={profile}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>

        {/* Grading open/close + CSV export */}
        <GradingControl isOpen={gradingWindow?.is_open ?? false} />

        {/* Submission window */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>نافذة التسليم</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {windowData?.discussion_cycles?.name || "لا توجد نافذة مفعّلة"}
              </h2>
            </div>
            <Badge tone={state.isOpen ? "success" : state.hasWindow ? "warning" : "neutral"}>
              {state.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {windowData ? (
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <p><span className="font-medium text-slate-950">يفتح:</span> {new Date(windowData.opens_at).toLocaleString("ar-EG")}</p>
                <p><span className="font-medium text-slate-950">يغلق:</span> {new Date(windowData.closes_at).toLocaleString("ar-EG")}</p>
                <p><span className="font-medium text-slate-950">التسليم المتأخر:</span> {windowData.allow_late_submission ? "مسموح" : "غير مسموح"}</p>
                <p><span className="font-medium text-slate-950">التعديل بعد التسليم:</span> {windowData.allow_edit_after_submit ? "مسموح" : "غير مسموح"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">أنشئ نافذة تسليم قبل أن يتمكن الطلاب من تسليم مشاريعهم.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/admin?mode=create" className={cn(buttonVariants())}>
                إنشاء نافذة جديدة
              </Link>
              {windowData ? (
                <Link href="/admin?mode=edit" className={cn(buttonVariants({ variant: "outline" }))}>
                  تعديل النافذة الحالية
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {showForm ? (
          <SubmissionWindowForm mode={mode === "create" ? "create" : "edit"} windowData={windowData} />
        ) : null}

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات المشاريع</CardTitle>
          </CardHeader>
          <CardContent>
            <AppSettingsForm maxTeamMembers={settings.max_team_members} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
