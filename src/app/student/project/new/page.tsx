import { redirect } from "next/navigation";

import { ProjectForm } from "../project-form";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveSubmissionWindow, getStudentProject } from "@/lib/project/queries";

export const dynamic = "force-dynamic";

export default async function NewStudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const [existingProject, submissionWindow] = await Promise.all([
    getStudentProject(profile.id),
    getActiveSubmissionWindow(),
  ]);

  if (existingProject) {
    redirect("/student/project");
  }

  return (
    <AppShell title="Create Project" profile={profile}>
      {!submissionWindow ? (
        <Alert>No active submission window is available right now.</Alert>
      ) : (
        <ProjectForm mode="create" />
      )}
    </AppShell>
  );
}
