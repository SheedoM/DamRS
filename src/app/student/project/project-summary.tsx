import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText } from "lucide-react";

import { FileUploadForm } from "./file-upload-form";
import { CompetitionUploadForm } from "./competition-upload-form";
import { SubmitProjectForm } from "./submit-project-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMissingSubmissionRequirements,
  type RequiredProjectFileType,
} from "@/lib/project/submission.schema";
import { programLabel, projectStatusLabel } from "@/lib/i18n/labels";
import { formatFileSize } from "@/lib/utils";
import type { ProjectFile, StudentProject, TeamMember } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

type ProjectSummaryProps = {
  project: StudentProject;
  teamMembers: TeamMember[];
  files: ProjectFile[];
  uploadedBy: string;
};

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

const requiredUploads: {
  fileType: RequiredProjectFileType;
  label: string;
  accept: string;
  maxSizeBytes: number;
}[] = [
  { fileType: "documentation_pdf", label: "مستند المشروع (PDF)", accept: "application/pdf", maxSizeBytes: 50 * 1024 * 1024 },
  { fileType: "source_code_zip", label: "الكود المصدري (ZIP)", accept: ".zip,application/zip,application/x-zip-compressed", maxSizeBytes: 100 * 1024 * 1024 },
  { fileType: "presentation_file", label: "ملف العرض التقديمي (اختياري)", accept: ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation", maxSizeBytes: 50 * 1024 * 1024 },
];



export function ProjectSummary({ project, teamMembers, files, uploadedBy }: ProjectSummaryProps) {
  const missing = getMissingSubmissionRequirements({
    title: project.title,
    title_en: project.title_en,
    abstract: project.abstract,
    supervisor_name: project.supervisor_name,
    demo_video_url: project.demo_video_url,
    teamMemberCount: teamMembers.length,
    fileTypes: files.map((file) => file.file_type),
  });
  const canEdit = project.status === "draft";
  const isSubmitted = project.status !== "draft";

  // Latest uploaded file per required type, to show inline next to each slot.
  const fileByType = new Map<string, ProjectFile>();
  for (const file of files) {
    if (file.file_type !== "competition_proof" && !fileByType.has(file.file_type)) {
      fileByType.set(file.file_type, file);
    }
  }
  const competitionFiles = files.filter((file) => file.file_type === "competition_proof");

  // Before the core details are filled, the action is "complete", not "edit".
  const needsDetails =
    isBlank(project.title) ||
    isBlank(project.title_en) ||
    isBlank(project.abstract) ||
    isBlank(project.supervisor_name) ||
    isBlank(project.demo_video_url);

  return (
    <div className="space-y-5">
      {isSubmitted ? (
        <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">تم تسليم المشروع بنجاح.</p>
            {project.submitted_at ? (
              <p className="mt-1 text-sm text-emerald-800">
                تاريخ التسليم: {new Date(project.submitted_at).toLocaleString("ar-EG")}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-emerald-800">انتهت خطوات التسليم، ولا حاجة لأي إجراء آخر.</p>
          </div>
        </div>
      ) : null}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>نظرة عامة على المشروع</CardTitle>
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
          <Badge tone={project.status === "submitted" ? "success" : "warning"}>
            {projectStatusLabel(project.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-slate-700">{project.abstract}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="font-medium text-slate-900">المشرف:</span> {project.supervisor_name}</p>
            <p><span className="font-medium text-slate-900">التقنيات:</span> {project.technologies_used || "غير محددة"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Link href="/student/project/edit" className={cn(buttonVariants({ variant: needsDetails ? "default" : "outline" }))}>
                {needsDetails ? "أكمل بيانات المشروع" : "تعديل البيانات"}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>أعضاء الفريق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const isLeader = member.role_in_team === "team_leader";
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "rounded-md border p-3",
                      isLeader ? "border-[var(--brand-blue)] bg-blue-50/50" : "border-slate-200",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-950">{member.full_name}</p>
                      {isLeader ? <Badge tone="info">قائد الفريق</Badge> : null}
                    </div>
                    <p className="text-sm text-slate-500">{member.student_id}</p>
                    {member.program ? <p className="text-sm text-slate-500">{programLabel(member.program)}</p> : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ملفات المشروع والوسائط</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-md border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <p>
                <span className="font-medium text-slate-900">رابط GitHub:</span>{" "}
                {project.github_url ? (
                  <a className="text-[var(--brand-blue)]" href={project.github_url} target="_blank" rel="noreferrer">فتح المستودع</a>
                ) : "غير متوفر"}
              </p>
              <p>
                <span className="font-medium text-slate-900">فيديو العرض:</span>{" "}
                {project.demo_video_url ? (
                  <a className="inline-flex items-center gap-1 text-[var(--brand-blue)]" href={project.demo_video_url} target="_blank" rel="noreferrer">
                    فتح العرض <ExternalLink className="h-3 w-3" />
                  </a>
                ) : "غير متوفر"}
              </p>
            </div>
            {canEdit
              ? requiredUploads.map((upload) => (
                  <FileUploadForm
                    key={upload.fileType}
                    projectId={project.id}
                    cycleId={project.cycle_id}
                    uploadedBy={uploadedBy}
                    existingFile={fileByType.get(upload.fileType)}
                    {...upload}
                  />
                ))
              : requiredUploads.map((upload) => {
                  const file = fileByType.get(upload.fileType);
                  return (
                    <div key={upload.fileType} className="rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{upload.label}</p>
                      {file ? (
                        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-slate-700">
                            {file.file_name}
                            <span className="text-slate-400"> · {formatFileSize(file.file_size)}</span>
                          </span>
                          {file.signedUrl ? (
                            <a
                              href={file.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                            >
                              <FileText className="h-4 w-4" aria-hidden="true" />
                              فتح
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">لم يُرفع.</p>
                      )}
                    </div>
                  );
                })}
            <CompetitionUploadForm
              projectId={project.id}
              cycleId={project.cycle_id}
              uploadedBy={uploadedBy}
              files={competitionFiles}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جاهزية التسليم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missing.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-slate-900">العناصر الناقصة:</p>
              <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-600">
                {missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">جميع البيانات والملفات المطلوبة مكتملة.</p>
          )}
          {canEdit ? <SubmitProjectForm projectId={project.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
