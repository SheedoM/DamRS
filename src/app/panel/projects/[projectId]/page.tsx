import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";

import { DiscussionForm } from "./discussion-form";
import { SupervisionForm } from "./supervision-form";
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
import { cn, formatFileSize } from "@/lib/utils";

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
        <Card data-tour="panel-project-info">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>المشروع المُسند</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {project.team_leader_name}
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

        <Card data-tour="panel-team">
          <CardHeader><CardTitle>أعضاء الفريق</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {project.team_members.length > 0 ? project.team_members.map((member) => {
              const isLeader = member.role_in_team === "team_leader";
              return (
                <div
                  key={member.id}
                  className={cn(
                    "rounded-md border p-3",
                    isLeader ? "border-[var(--brand-blue)] bg-blue-50/50" : "border-slate-200",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-950">{member.full_name}</p>
                    {isLeader ? <Badge tone="info">قائد الفريق</Badge> : null}
                  </div>
                  <p className="text-sm text-slate-500">{member.student_id}</p>
                  {member.program ? <p className="text-sm text-slate-500">{programLabel(member.program)}</p> : null}
                </div>
              );
            }) : <p className="text-sm text-slate-500">لا يوجد طلاب في هذا المشروع.</p>}
          </CardContent>
        </Card>

        <Card data-tour="panel-files">
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

        {project.roles.committee ? (
          <Card data-tour="panel-discussion">
            <CardHeader>
              <CardTitle>تقييم المناقشة (عضو لجنة)</CardTitle>
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
        ) : null}

        {project.roles.supervisor ? (
          <Card>
            <CardHeader>
              <CardTitle>{project.term === "first" ? "أعمال الفصل (المشرف)" : "أعمال السنة (المشرف)"}</CardTitle>
            </CardHeader>
            <CardContent>
              {grading.isOpen ? (
                <SupervisionForm
                  projectId={project.id}
                  term={project.term}
                  students={project.team_members.map((member) => ({
                    id: member.id,
                    full_name: member.full_name,
                    student_id: member.student_id,
                  }))}
                  existing={project.supervision}
                />
              ) : (
                <Alert>باب التقييم مغلق حاليًا. لا يمكنك إدخال أو تعديل الدرجات حتى يفتحه المسؤول.</Alert>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
