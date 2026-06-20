import { CreateStudentForm } from "./create-student-form";
import { RosterForm } from "./roster-form";
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

  const accountsSection = (
    <Card>
      <CardHeader>
        <CardTitle>حسابات الطلاب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateStudentForm />
        <div className="space-y-3">
          {students.length > 0 ? students.map((student) => (
            <div key={student.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-950">{student.full_name}</p>
              <p className="text-sm text-slate-500">{student.email}</p>
              <p className="text-sm text-slate-500">
                الرقم الجامعي: {student.student_id || "—"} • الرقم القومي: {student.national_id || "—"}
              </p>
            </div>
          )) : <p className="text-sm text-slate-500">لا توجد حسابات طلاب بعد.</p>}
        </div>
      </CardContent>
    </Card>
  );

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
