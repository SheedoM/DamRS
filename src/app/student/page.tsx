import { CalendarClock, CheckCircle2, FileArchive, FileText, Upload } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveSubmissionWindow, getStudentProject } from "@/lib/project/queries";
import { getMissingSubmissionRequirements } from "@/lib/project/submission.schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const { profile } = await requireRole(["student"]);
  const [projectData, submissionWindow] = await Promise.all([
    getStudentProject(profile.id),
    getActiveSubmissionWindow(),
  ]);

  const missing = projectData
    ? getMissingSubmissionRequirements({
        title: projectData.project.title,
        abstract: projectData.project.abstract,
        department: projectData.project.department,
        supervisor_name: projectData.project.supervisor_name,
        demo_video_url: projectData.project.demo_video_url,
        teamMemberCount: projectData.teamMembers.length,
        fileTypes: projectData.files.map((file) => file.file_type),
      })
    : [];

  const cards = [
    {
      title: "Submission status",
      value: projectData?.project.status.replaceAll("_", " ") || "Not started",
      detail: projectData?.project.submitted_at
        ? `Submitted ${new Date(projectData.project.submitted_at).toLocaleDateString()}`
        : "Create and complete your project submission.",
      icon: CheckCircle2,
    },
    {
      title: "Deadline",
      value: submissionWindow ? new Date(submissionWindow.closes_at).toLocaleDateString() : "Closed",
      detail: submissionWindow ? "Active submission window is configured." : "No active submission window.",
      icon: CalendarClock,
    },
    {
      title: "Project status",
      value: projectData ? projectData.project.title : "No project",
      detail: projectData ? projectData.project.department : "One team leader account can create one project.",
      icon: FileText,
    },
    {
      title: "Uploaded files",
      value: projectData ? `${projectData.files.length}` : "0",
      detail: "Required: PDF and ZIP. Presentation is optional.",
      icon: FileArchive,
    },
    {
      title: "Missing items",
      value: projectData ? `${missing.length}` : "Project",
      detail: missing.length > 0 ? "Open project status for details." : "Ready when all requirements are complete.",
      icon: Upload,
    },
  ];

  return (
    <AppShell title="Student Dashboard" profile={profile}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-5">
            <Link
              href={projectData ? "/student/project" : "/student/project/new"}
              className={cn(buttonVariants())}
            >
              {projectData ? "Open project" : "Create project"}
            </Link>
            {projectData ? (
              <Link href="/student/project/status" className={cn(buttonVariants({ variant: "outline" }))}>
                View status
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
