import Link from "next/link";

import { ProjectSummary } from "./project-summary";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveSubmissionWindow, getStudentProject } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const [projectData, submissionWindow] = await Promise.all([
    getStudentProject(profile.id),
    getActiveSubmissionWindow(),
  ]);

  return (
    <AppShell title="مشروعي" profile={profile}>
      {projectData ? (
        <ProjectSummary {...projectData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>لا يوجد مشروع بعد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              أنشئ مشروعك، وأضف أعضاء الفريق، ثم ارفع الملفات المطلوبة قبل التسليم النهائي.
            </p>
            {submissionWindow ? (
              <Link href="/student/project/new" className={cn(buttonVariants())}>
                إنشاء مشروع
              </Link>
            ) : (
              <p className="text-sm text-amber-700">
                لا توجد نافذة تسليم مفتوحة حاليًا.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
