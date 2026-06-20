import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { AdminPanelGradeEntryForm } from "./admin-panel-grade-entry-form";
import { AssignPanelMemberForm, RevokeAssignmentForm } from "../../assignments/assignment-forms";
import { GradeOverrideForm } from "./grade-override-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjectDetail, getAdminProjects, getPanelMembers } from "@/lib/admin/queries";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

export const dynamic = "force-dynamic";



function scoreText(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "Pending";
}

function gradeSourceText(source: string) {
  if (source === "dean_override") return "Dean override";
  if (source === "panel_average") return "Panel average";
  return "Awaiting panel grades";
}

function gradeStatusTone(status: string): "neutral" | "success" | "warning" | "info" {
  if (status === "Official" || status === "Dean override") return "success";
  if (status === "In review") return "warning";
  return "neutral";
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

  const reviewByPanelMemberId = new Map(project.reviews.map((review) => [review.panel_member_id, review]));

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

        <Card>
          <CardHeader><CardTitle>Uploaded Files</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {project.files.length > 0 ? project.files.map((file) => (
              <div key={file.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-950">{file.file_name}</p>
                <p className="text-sm text-slate-500">{file.file_type.replaceAll("_", " ")} - {formatFileSize(file.file_size)}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{file.storage_path}</p>
                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Open file
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">Preview link unavailable.</p>
                )}
              </div>
            )) : <p className="text-sm text-slate-500">No files uploaded.</p>}
          </CardContent>
        </Card>

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
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Project Grade</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {project.gradeSummary.completedReviewCount} of {project.gradeSummary.requiredReviewCount} panel grades submitted.
              </p>
            </div>
            <Badge tone={gradeStatusTone(project.gradeSummary.status)}>
              {project.gradeSummary.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Grade</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">
                {project.gradeSummary.displayPercentage || "Pending"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Source: {gradeSourceText(project.gradeSummary.source)}
              </p>
            </div>
            <GradeOverrideForm projectId={project.id} activeOverride={project.activeOverride} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Panel Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <AssignPanelMemberForm projects={projects} panelMembers={panelMembers} projectId={project.id} />
            <div className="space-y-3">
              {project.assignments.length > 0 ? project.assignments.map((assignment) => {
                const review = reviewByPanelMemberId.get(assignment.panel_member_id) || null;
                const finalSubmitted = Boolean(review?.final_submitted_at && review.status === "final_reviewed");
                const isActive = assignment.is_active && !assignment.revoked_at;

                return (
                  <div key={assignment.id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{assignment.panel_member_name}</p>
                        <p className="text-sm text-slate-500">{assignment.panel_member_email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={isActive ? "success" : "neutral"}>
                          {isActive ? "active assignment" : "revoked assignment"}
                        </Badge>
                        <Badge tone={finalSubmitted ? "success" : review ? "warning" : "neutral"}>
                          {finalSubmitted ? "final reviewed" : review ? review.status.replaceAll("_", " ") : "pending"}
                        </Badge>
                        {review?.admin_entered_by ? <Badge tone="info">Entered by admin</Badge> : null}
                        <Badge tone="info">{scoreText(review?.total_score)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p><span className="font-medium text-slate-900">Draft:</span> {formatDate(review?.draft_submitted_at || null)}</p>
                      <p><span className="font-medium text-slate-900">Final:</span> {formatDate(review?.final_submitted_at || null)}</p>
                    </div>
                    {review?.admin_entered_by ? (
                      <p className="mt-3 text-sm text-slate-600">
                        Entered by {review.admin_entered_by_name || "admin"} on {formatDate(review.admin_entered_at)}. Reason: {review.admin_entry_reason}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {isActive ? <RevokeAssignmentForm assignment={assignment} /> : null}
                      {isActive && !finalSubmitted ? (
                        <AdminPanelGradeEntryForm
                          projectId={project.id}
                          panelMemberId={assignment.panel_member_id}
                          panelMemberName={assignment.panel_member_name}
                          review={review}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-slate-500">No panel assignments yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {project.overrideHistory.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Override History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.overrideHistory.map((override) => (
                <div key={override.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{scoreText(override.total_score)}</p>
                      <p className="text-sm text-slate-500">
                        {override.overridden_by_name} - {formatDate(override.created_at)}
                      </p>
                    </div>
                    <Badge tone={override.is_active ? "success" : "neutral"}>{override.is_active ? "active" : "replaced"}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{override.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
