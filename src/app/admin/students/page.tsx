import { RosterForm } from "./roster-form";
import { StudentAccountsCard } from "./student-accounts-card";
import { StudentsTabs } from "./students-tabs";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getActiveCycle } from "@/lib/admin/cycle";
import { getEligibleStudents, getStudentAccounts } from "@/lib/admin/students";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const { profile } = await requireRole(["admin"]);
  const cycle = await getActiveCycle();
  const [students, roster] = await Promise.all([
    getStudentAccounts(),
    cycle ? getEligibleStudents(cycle.id) : Promise.resolve([]),
  ]);

  const accountsSection = <StudentAccountsCard students={students} />;

  const rosterSection = (
    <Card>
      <CardHeader>
        <CardTitle>الأرقام الجامعية المعتمدة للتسجيل الذاتي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cycle ? (
          <Alert>لا توجد دورة مناقشة مفعّلة. أنشئ نافذة التسليم أولًا.</Alert>
        ) : (
          <RosterForm />
        )}
        {roster.length > 0 ? (
          <div className="space-y-2">
            {roster.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <span className="font-medium text-slate-950">{entry.university_id}</span>
                <Badge tone={entry.claimed_by ? "neutral" : "success"}>
                  {entry.claimed_by ? "تم التسجيل" : "متاح"}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <AppShell title="الطلاب" profile={profile}>
      <StudentsTabs accounts={accountsSection} roster={rosterSection} />
    </AppShell>
  );
}
