import { ProjectForm } from "@/app/student/project/project-form";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveCycle } from "@/lib/admin/cycle";
import { getAppSettings } from "@/lib/admin/app-settings";

export const dynamic = "force-dynamic";

export default async function AdminNewProjectPage() {
  const { profile } = await requireRole(["admin"]);
  const [cycle, settings] = await Promise.all([getActiveCycle(), getAppSettings()]);

  return (
    <AppShell title="إنشاء مشروع" profile={profile}>
      {!cycle ? (
        <Alert>لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم من لوحة التحكم أولًا.</Alert>
      ) : (
        <ProjectForm mode="admin-create" maxTeamMembers={settings.max_team_members} />
      )}
    </AppShell>
  );
}
