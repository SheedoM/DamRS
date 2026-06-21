import { CreatePanelMemberForm } from "./create-panel-member-form";
import { PanelMemberCard } from "./panel-member-card";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelMembers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminPanelMembersPage() {
  const { profile } = await requireRole(["admin"]);
  const panelMembers = await getPanelMembers();

  return (
    <AppShell title="أعضاء اللجنة" profile={profile}>
      <div className="space-y-5">
        <div data-tour="panel-members-create">
          <CreatePanelMemberForm />
        </div>
        <Card data-tour="panel-members-list">
          <CardHeader><CardTitle>أعضاء اللجنة الحاليون</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelMembers.length > 0 ? panelMembers.map((member) => (
              <PanelMemberCard key={member.id} member={member} />
            )) : <p className="text-sm text-slate-500">لا يوجد أعضاء لجنة بعد.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
