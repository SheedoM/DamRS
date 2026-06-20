import { redirect } from "next/navigation";

import { ProjectForm } from "../project-form";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getStudentProject } from "@/lib/project/queries";

export const dynamic = "force-dynamic";

export default async function EditStudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const projectData = await getStudentProject(profile.id);

  if (!projectData) {
    redirect("/student/project/new");
  }

  return (
    <AppShell title="Edit Project" profile={profile}>
      {projectData.project.status !== "draft" ? (
        <Alert>Submitted projects cannot be edited in this MVP.</Alert>
      ) : (
        <ProjectForm
          mode="edit"
          project={projectData.project}
          teamMembers={projectData.teamMembers}
        />
      )}
    </AppShell>
  );
}
