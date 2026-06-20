import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignPanelMemberForm, RevokeAssignmentForm } from "../../assignments/assignment-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjectDetail, getAdminProjects, getPanelMembers } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { projectId } = await params;
  const [project, panelMembers, projects] = await Promise.all([
    getAdminProjectDetail(projectId),
    getPanelMembers(),
    getAdminProjects(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <AppShell title="Project Details" profile={profile}>
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Project</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{project.department}</p>
            </div>
            <Badge tone={project.status === "submitted" ? "success" : "info"}>{project.status.replaceAll("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p className="leading-6">{project.abstract}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <p><span className="font-medium text-slate-950">Team leader:</span> {project.team_leader_name}</p>
              <p><span className="font-medium text-slate-950">Supervisor:</span> {project.supervisor_name}</p>
              <p><span className="font-medium text-slate-950">Technologies:</span> {project.technologies_used || "Not specified"}</p>
              <p><span className="font-medium text-slate-950">Submitted:</span> {project.submitted_at ? new Date(project.submitted_at).toLocaleString() : "Not submitted"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.github_url ? <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.github_url} target="_blank" rel="noreferrer">GitHub</a> : null}
              {project.demo_video_url ? <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.demo_video_url} target="_blank" rel="noreferrer">Demo video</a> : null}
              <Link href="/admin/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Back to projects</Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.team_members.map((member) => (
                <div key={member.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{member.full_name}</p>
                  <p className="text-sm text-slate-500">{member.student_id} - {member.role_in_team}</p>
                  {member.email ? <p className="text-sm text-slate-500">{member.email}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Uploaded Files</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.files.length > 0 ? project.files.map((file) => (
                <div key={file.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{file.file_name}</p>
                  <p className="text-sm text-slate-500">{file.file_type.replaceAll("_", " ")} - {formatFileSize(file.file_size)}</p>
                  <p className="mt-1 break-all text-xs text-slate-400">{file.storage_path}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No files uploaded.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Assignments</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <AssignPanelMemberForm projects={projects} panelMembers={panelMembers} projectId={project.id} />
            <div className="space-y-3">
              {project.assignments.length > 0 ? project.assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-950">{assignment.panel_member_name}</p>
                    <p className="text-sm text-slate-500">{assignment.panel_member_email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={assignment.is_active ? "success" : "neutral"}>
                      {assignment.is_active ? "active" : "revoked"}
                    </Badge>
                    <RevokeAssignmentForm assignment={assignment} />
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No assignments yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
