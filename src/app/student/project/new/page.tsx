import { redirect } from "next/navigation";

import { ProjectForm } from "../project-form";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveSubmissionWindow, getStudentProject } from "@/lib/project/queries";
import { getAppSettings } from "@/lib/admin/app-settings";

export const dynamic = "force-dynamic";

export default async function NewStudentProjectPage() {
  const { profile } = await requireRole(["student"]);
  const [existingProject, submissionWindow, settings] = await Promise.all([
    getStudentProject(profile.id),
    getActiveSubmissionWindow(),
    getAppSettings(),
  ]);

  if (existingProject) {
    redirect("/student/project");
  }

  return (
    <AppShell title="إنشاء مشروع" profile={profile}>
      {!submissionWindow ? (
        <Alert>لا توجد نافذة تسليم مفتوحة حاليًا.</Alert>
      ) : (
        <ProjectForm mode="create" maxTeamMembers={settings.max_team_members} />
      )}
    </AppShell>
  );
}
