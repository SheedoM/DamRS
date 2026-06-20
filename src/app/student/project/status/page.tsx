import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getMissingSubmissionRequirements } from "@/lib/project/submission.schema";
import { getStudentProject } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentProjectStatusPage() {
  const { profile } = await requireRole(["student"]);
  const projectData = await getStudentProject(profile.id);

  if (!projectData) {
    redirect("/student/project/new");
  }

  const missing = getMissingSubmissionRequirements({
    title: projectData.project.title,
    abstract: projectData.project.abstract,
    department: projectData.project.department,
    supervisor_name: projectData.project.supervisor_name,
    demo_video_url: projectData.project.demo_video_url,
    teamMemberCount: projectData.teamMembers.length,
    fileTypes: projectData.files.map((file) => file.file_type),
  });

  return (
    <AppShell title="Submission Status" profile={profile}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Current status</CardTitle>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {projectData.project.title}
            </h2>
          </div>
          <Badge tone={projectData.project.status === "submitted" ? "success" : "warning"}>
            {projectData.project.status.replaceAll("_", " ")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectData.project.submitted_at ? (
            <p className="text-sm text-slate-600">
              Submitted at {new Date(projectData.project.submitted_at).toLocaleString()}.
            </p>
          ) : (
            <p className="text-sm text-slate-600">This project is still a draft.</p>
          )}
          {missing.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-slate-900">Missing requirements:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">All submission requirements are complete.</p>
          )}
          <Link href="/student/project" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to project
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
