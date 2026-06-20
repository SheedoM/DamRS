import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { FileUploadForm } from "./file-upload-form";
import { SubmitProjectForm } from "./submit-project-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMissingSubmissionRequirements,
  type RequiredProjectFileType,
} from "@/lib/project/submission.schema";
import type { ProjectFile, StudentProject, TeamMember } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

type ProjectSummaryProps = {
  project: StudentProject;
  teamMembers: TeamMember[];
  files: ProjectFile[];
};

const requiredUploads: {
  fileType: RequiredProjectFileType;
  label: string;
  accept: string;
}[] = [
  { fileType: "documentation_pdf", label: "Documentation PDF", accept: "application/pdf" },
  { fileType: "source_code_zip", label: "Source code ZIP", accept: ".zip,application/zip,application/x-zip-compressed" },
  { fileType: "presentation_file", label: "Presentation file", accept: ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" },
];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectSummary({ project, teamMembers, files }: ProjectSummaryProps) {
  const missing = getMissingSubmissionRequirements({
    title: project.title,
    abstract: project.abstract,
    department: project.department,
    supervisor_name: project.supervisor_name,
    demo_video_url: project.demo_video_url,
    teamMemberCount: teamMembers.length,
    fileTypes: files.map((file) => file.file_type),
  });
  const canEdit = project.status === "draft";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Project overview</CardTitle>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{project.department}</p>
          </div>
          <Badge tone={project.status === "submitted" ? "success" : "warning"}>
            {project.status.replaceAll("_", " ")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-slate-700">{project.abstract}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="font-medium text-slate-900">Supervisor:</span> {project.supervisor_name}</p>
            <p><span className="font-medium text-slate-900">Technologies:</span> {project.technologies_used || "Not specified"}</p>
            <p><span className="font-medium text-slate-900">GitHub:</span> {project.github_url ? <a className="text-[var(--brand-blue)]" href={project.github_url} target="_blank" rel="noreferrer">Open repository</a> : "Not provided"}</p>
            <p><span className="font-medium text-slate-900">Video:</span> <a className="inline-flex items-center gap-1 text-[var(--brand-blue)]" href={project.demo_video_url || "#"} target="_blank" rel="noreferrer">Open demo <ExternalLink className="h-3 w-3" /></a></p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Link href="/student/project/edit" className={cn(buttonVariants({ variant: "outline" }))}>
                Edit details
              </Link>
            ) : null}
            <Link href="/student/project/status" className={cn(buttonVariants({ variant: "ghost" }))}>
              View status
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{member.full_name}</p>
                  <p className="text-sm text-slate-500">{member.student_id} - {member.role_in_team}</p>
                  {member.email ? <p className="text-sm text-slate-500">{member.email}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploaded files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.length > 0 ? files.map((file) => (
                <div key={file.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{file.file_name}</p>
                  <p className="text-sm text-slate-500">{file.file_type.replaceAll("_", " ")} - {formatFileSize(file.file_size)}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No files uploaded yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Required uploads</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {requiredUploads.map((upload) => (
              <FileUploadForm key={upload.fileType} projectId={project.id} {...upload} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Submission readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missing.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-slate-900">Missing requirements:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">All required details and files are present.</p>
          )}
          {canEdit ? <SubmitProjectForm projectId={project.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
