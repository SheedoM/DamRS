import Link from "next/link";

import { ProjectSummary } from "./project-summary";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveSubmissionWindow, getStudentProject } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const [projectData, submissionWindow] = await Promise.all([
    getStudentProject(profile.id),
    getActiveSubmissionWindow(),
  ]);

  return (
    <AppShell title="My Project" profile={profile}>
      {projectData ? (
        <ProjectSummary {...projectData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No project submission yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Create your project submission, add team members, then upload the
              required files before final submission.
            </p>
            {submissionWindow ? (
              <Link href="/student/project/new" className={cn(buttonVariants())}>
                Create project
              </Link>
            ) : (
              <p className="text-sm text-amber-700">
                No active submission window is available right now.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
