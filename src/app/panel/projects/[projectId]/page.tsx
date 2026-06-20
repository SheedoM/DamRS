import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";

import { DiscussionForm } from "./discussion-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import {
  getActiveCycleGradingState,
  getOwnDiscussionScores,
  getPanelProjectDetail,
} from "@/lib/panel/queries";
import { programLabel, projectFileTypeLabel, projectStatusLabel } from "@/lib/i18n/labels";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PanelProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const { projectId } = await params;

  const grading = await getActiveCycleGradingState();
  const project = await getPanelProjectDetail(projectId, profile.id);
  if (!project) {
    notFound();
  }
  const existingScores = grading.isOpen ? await getOwnDiscussionScores(projectId, profile.id) : [];

  return (
    <AppShell title="مراجعة المشروع" profile={profile}>
      <div className="space-y-5">
        <Link href="/panel" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة إلى المشاريع
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>المشروع المُسند</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {programLabel(project.program)} - {project.team_leader_name}
              </p>
            </div>
            <Badge tone="info">{projectStatusLabel(project.status)}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p className="leading-6">{project.abstract}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <p><span className="font-medium text-slate-950">المشرف:</span> {project.supervisor_name}</p>
              <p><span className="font-medium text-slate-950">التقنيات:</span> {project.technologies_used || "غير محددة"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.github_url ? (
                <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.github_url} target="_blank" rel="noreferrer">GitHub</a>
              ) : null}
              {project.demo_video_url ? (
                <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.demo_video_url} target="_blank" rel="noreferrer">فيديو العرض</a>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>الملفات المرفوعة</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {project.files.length > 0 ? project.files.map((file) => (
              <div key={file.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-950">{file.file_name}</p>
                <p className="text-sm text-slate-500">
                  {projectFileTypeLabel(file.file_type)} - {formatFileSize(file.file_size)}
                </p>
                {file.signedUrl ? (
                  <a href={file.signedUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    فتح الملف
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">رابط المعاينة غير متاح.</p>
                )}
              </div>
            )) : (
              <p className="text-sm text-slate-500">لا توجد ملفات مرفوعة.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أعضاء الفريق وتقييم المناقشة</CardTitle>
          </CardHeader>
          <CardContent>
            {grading.isOpen ? (
              <DiscussionForm
                projectId={project.id}
                students={project.team_members.map((member) => ({
                  id: member.id,
                  full_name: member.full_name,
                  student_id: member.student_id,
                }))}
                existingScores={existingScores}
              />
            ) : (
              <Alert>باب التقييم مغلق حاليًا. لا يمكنك إدخال أو تعديل الدرجات حتى يفتحه المسؤول.</Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
