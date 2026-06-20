import { redirect } from "next/navigation";

import { ProjectForm } from "../project-form";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getStudentProject } from "@/lib/project/queries";
import { getAppSettings } from "@/lib/admin/app-settings";

export const dynamic = "force-dynamic";

export default async function EditStudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const [projectData, settings] = await Promise.all([
    getStudentProject(profile.id),
    getAppSettings(),
  ]);

  if (!projectData) {
    redirect("/student/project/new");
  }

  return (
    <AppShell title="تعديل المشروع" profile={profile}>
      {projectData.project.status !== "draft" ? (
        <Alert>لا يمكن تعديل المشاريع بعد تسليمها.</Alert>
      ) : (
        <ProjectForm
          mode="edit"
          project={projectData.project}
          teamMembers={projectData.teamMembers}
          maxTeamMembers={settings.max_team_members}
        />
      )}
    </AppShell>
  );
}
