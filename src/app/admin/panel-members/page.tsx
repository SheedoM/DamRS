import { CreatePanelMemberForm } from "./create-panel-member-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelMembers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminPanelMembersPage() {
  const { profile } = await requireRole(["admin"]);
  const panelMembers = await getPanelMembers();

  return (
    <AppShell title="Panel Members" profile={profile}>
      <div className="space-y-5">
        <CreatePanelMemberForm />
        <Card>
          <CardHeader><CardTitle>Existing panel members</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelMembers.length > 0 ? panelMembers.map((member) => (
              <div key={member.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-950">{member.full_name}</p>
                <p className="text-sm text-slate-500">{member.email}</p>
                <p className="text-sm text-slate-500">{member.department || "No department"}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No panel members yet.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
