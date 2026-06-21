import { CreatePanelMemberForm } from "./create-panel-member-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelMembers } from "@/lib/admin/queries";
import { panelMemberTypeLabel } from "@/lib/i18n/labels";
import { PasswordToggle } from "./password-toggle";

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
              <div key={member.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-950">{member.full_name}</p>
                  {member.panel_member_type ? (
                    <Badge tone="info">{panelMemberTypeLabel(member.panel_member_type)}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-slate-500">{member.email}</p>
                <p className="text-sm text-slate-500">{member.department || "بدون قسم"}</p>
                <PasswordToggle password={member.temp_password} />
              </div>
            )) : <p className="text-sm text-slate-500">لا يوجد أعضاء لجنة بعد.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
