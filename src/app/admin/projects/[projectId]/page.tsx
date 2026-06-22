import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";

import { StudentGradesForm } from "./student-grades-form";
import { GradingBreakdown } from "./grading-breakdown";
import { DeleteProjectButton } from "./delete-project-button";
import { ProjectStatusControl } from "./project-status-control";
import { AssignPanelMemberForm, RevokeAssignmentForm } from "../assignment-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjectDetail, getPanelMembers } from "@/lib/admin/queries";
import { getProjectGradingBreakdown, getProjectStudentGrades, getProjectTerm } from "@/lib/admin/student-grades";
import {
  projectFileTypeLabel,
  projectStatusLabel,
} from "@/lib/i18n/labels";
import { getMissingSubmissionRequirements } from "@/lib/project/submission.schema";
import { cn, formatFileSize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { projectId } = await params;
  const [project, panelMembers, studentGrades, term, breakdown] = await Promise.all([
    getAdminProjectDetail(projectId),
    getPanelMembers(),
    getProjectStudentGrades(projectId),
    getProjectTerm(projectId),
    getProjectGradingBreakdown(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const activeAssignments = project.assignments.filter((a) => a.is_active && !a.revoked_at);

  const missingRequirements = getMissingSubmissionRequirements({
    title: project.title || null,
    title_en: project.title_en,
    abstract: project.abstract || null,
    supervisor_name: project.supervisor_name || null,
    demo_video_url: project.demo_video_url,
    source_code_url: project.source_code_url,
    hasLegacySourceZip: project.files.some((file) => file.file_type === "source_code_zip"),
    teamMemberCount: project.team_members.length,
    fileTypes: project.files.map((file) => file.file_type),
  });
  const isComplete = missingRequirements.length === 0;

  const supervisorName = activeAssignments.find((a) => a.roles.supervisor)?.panel_member_name ?? null;

  return (
    <AppShell title="تفاصيل المشروع" profile={profile}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            العودة إلى المشاريع
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/projects/${project.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              تعديل المشروع
            </Link>
            <DeleteProjectButton projectId={project.id} />
          </div>
        </div>
        <Card data-tour="project-info">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>المشروع</CardTitle>
              {project.project_number ? (
                <p className="mt-1 text-sm font-medium text-[var(--brand-blue)]">
                  رقم المشروع: {project.project_number}
                </p>
              ) : null}
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {project.title || "بانتظار إدخال بيانات المشروع"}
              </h2>
              {project.title_en ? (
                <p className="mt-1 text-base text-slate-600" dir="ltr">{project.title_en}</p>
              ) : null}
            </div>
            {project.awaiting_leader ? (
              <Badge tone="warning">بانتظار القائد</Badge>
            ) : (
              <Badge tone={project.status === "submitted" ? "success" : "info"}>{projectStatusLabel(project.status)}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p className="leading-6">{project.abstract}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <p><span className="font-medium text-slate-950">قائد الفريق:</span> {project.team_leader_name}</p>
              <p><span className="font-medium text-slate-950">المشرف:</span> {project.supervisor_name}</p>
              <p><span className="font-medium text-slate-950">التقنيات:</span> {project.technologies_used || "غير محددة"}</p>
              <p><span className="font-medium text-slate-950">تاريخ التسليم:</span> {project.submitted_at ? new Date(project.submitted_at).toLocaleString("ar-EG") : "لم يُسلَّم"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.github_url ? <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.github_url} target="_blank" rel="noreferrer">GitHub</a> : null}
              {project.demo_video_url ? <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.demo_video_url} target="_blank" rel="noreferrer">فيديو العرض</a> : null}
              {project.source_code_url ? <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.source_code_url} target="_blank" rel="noreferrer">الكود المصدري</a> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>جاهزية التسليم</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {project.status === "submitted" ? (
              <p className="text-sm text-emerald-700">
                المشروع مُسلَّم
                {project.submitted_at ? ` بتاريخ ${new Date(project.submitted_at).toLocaleString("ar-EG")}` : ""}.
              </p>
            ) : missingRequirements.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-slate-900">العناصر الناقصة:</p>
                <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-600">
                  {missingRequirements.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-emerald-700">
                جميع البيانات والملفات المطلوبة مكتملة — يمكنك تعليم المشروع كمُسلَّم.
              </p>
            )}
            <ProjectStatusControl projectId={project.id} status={project.status} isComplete={isComplete} />
          </CardContent>
        </Card>

        <Card data-tour="project-files">
          <CardHeader><CardTitle>الملفات المرفوعة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {project.files.length > 0 ? project.files.map((file) => (
              <div key={file.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-950">{file.file_name}</p>
                <p className="text-sm text-slate-500">{projectFileTypeLabel(file.file_type)} - {formatFileSize(file.file_size)}</p>
                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    فتح الملف
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">رابط المعاينة غير متاح.</p>
                )}
              </div>
            )) : <p className="text-sm text-slate-500">لا توجد ملفات مرفوعة.</p>}
          </CardContent>
        </Card>

        <Card data-tour="project-assignments">
          <CardHeader><CardTitle>أعضاء اللجنة</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {activeAssignments.length > 0 ? activeAssignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-950">{assignment.panel_member_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.roles.committee ? <Badge tone="info">عضو</Badge> : null}
                    {assignment.roles.committee_head ? <Badge tone="success">رئيس اللجنة</Badge> : null}
                    {assignment.roles.supervisor ? <Badge tone="neutral">مشرف</Badge> : null}
                    <RevokeAssignmentForm assignment={assignment} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">لا توجد إسنادات لجنة بعد.</p>
              )}
            </div>
            <AssignPanelMemberForm panelMembers={panelMembers} projectId={project.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>تفصيل درجات المناقشة (لكل عضو لجنة)</CardTitle></CardHeader>
          <CardContent>
            <GradingBreakdown projectId={project.id} students={breakdown} />
          </CardContent>
        </Card>

        <Card data-tour="project-grades">
          <CardHeader><CardTitle>درجات الطلاب</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              درجة المناقشة (60) = مجموع درجات المقيّمين. أدخل درجة الفصل الأول (10) وتقييم لجنة الإشراف (30) لكل طالب.
            </p>
            {studentGrades.length > 0 ? (
              <StudentGradesForm projectId={project.id} students={studentGrades} term={term} supervisorName={supervisorName} />
            ) : (
              <p className="text-sm text-slate-500">لا يوجد طلاب في هذا المشروع.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
