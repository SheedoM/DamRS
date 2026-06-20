import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjectDetail } from "@/lib/panel/queries";
import { getReviewTotal } from "@/lib/review/review.schema";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

export const dynamic = "force-dynamic";



function componentScoreText(value: number | null, max: number) {
  return value !== null ? `${value.toFixed(2)} / ${max}` : "Pending";
}

function reviewScoreText(value: number | null | undefined, max: number) {
  return typeof value === "number" ? `${value.toFixed(2)} / ${max}` : "Not submitted";
}

export default async function PanelProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const { projectId } = await params;
  const project = await getPanelProjectDetail(projectId, profile.id);

  if (!project) {
    notFound();
  }

  const review = project.reviews[0] || null;
  const draftScore = review
    ? review.documentation_score + review.implementation_score + review.code_quality_score + review.innovation_score
    : null;
  const finalScore = review?.final_submitted_at
    ? review.presentation_score + review.discussion_score
    : null;
  const totalScore = review?.final_submitted_at ? getReviewTotal(review) : null;

  return (
    <AppShell title="Project Review" profile={profile}>
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Assigned project</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {project.department} - {project.team_leader_name}
              </p>
            </div>
            <Badge tone="info">{project.status.replaceAll("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p className="leading-6">{project.abstract}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <p><span className="font-medium text-slate-950">Supervisor:</span> {project.supervisor_name}</p>
              <p><span className="font-medium text-slate-950">Submitted:</span> {formatDate(project.submitted_at)}</p>
              <p><span className="font-medium text-slate-950">Assigned:</span> {formatDate(project.assigned_at)}</p>
              <p><span className="font-medium text-slate-950">Technologies:</span> {project.technologies_used || "Not specified"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.github_url ? (
                <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.github_url} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              ) : null}
              {project.demo_video_url ? (
                <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={project.demo_video_url} target="_blank" rel="noreferrer">
                  Demo video
                </a>
              ) : null}
              <Link href="/panel/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Back to projects
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Uploaded files</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.files.length > 0 ? project.files.map((file) => (
                <div key={file.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{file.file_name}</p>
                  <p className="text-sm text-slate-500">
                    {file.file_type.replaceAll("_", " ")} - {formatFileSize(file.file_size)}
                  </p>
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
              )) : (
                <p className="text-sm text-slate-500">No files uploaded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Team members</CardTitle></CardHeader>
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
        </div>

        <Card>
          <CardHeader><CardTitle>My reviews</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-700">Audit grade</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">
                {totalScore !== null ? `${totalScore.toFixed(2)}%` : "Pending"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Draft component: {componentScoreText(draftScore, 80)} - Final component: {componentScoreText(finalScore, 20)}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-950">Draft review</h3>
                <Badge tone={project.reviewStatus.draftSubmitted ? "success" : "warning"}>
                  {project.reviewStatus.draftSubmitted ? "submitted" : "Draft pending"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Submitted: {formatDate(project.reviewStatus.draftSubmittedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Score: {reviewScoreText(draftScore, 80)}</p>
              <Link
                href={`/panel/projects/${project.id}/draft-review`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
              >
                {review?.draft_submitted_at ? "Edit draft review" : "Start draft review"}
              </Link>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-950">Final review</h3>
                <Badge tone={project.reviewStatus.finalSubmitted ? "success" : "warning"}>
                  {project.reviewStatus.finalSubmitted ? "submitted" : "Final pending"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Submitted: {formatDate(project.reviewStatus.finalSubmittedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Score: {reviewScoreText(finalScore, 20)}</p>
              <Link
                href={`/panel/projects/${project.id}/final-review`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
              >
                {review?.final_submitted_at ? "Edit final review" : "Start final review"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
