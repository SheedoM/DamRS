import { CalendarClock, CheckCircle2, FileArchive, FileText, Upload } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

const cards = [
  { title: "Submission status", value: "Ready", detail: "Student submission opens in Phase 3.", icon: CheckCircle2 },
  { title: "Deadline", value: "Ready", detail: "Submission windows arrive in Phase 2.", icon: CalendarClock },
  { title: "Project status", value: "Ready", detail: "One team leader account maps to one project.", icon: FileText },
  { title: "Uploaded files", value: "Ready", detail: "PDF, ZIP, and presentation upload arrive later.", icon: FileArchive },
  { title: "Next action", value: "Ready", detail: "Create and edit project workflow is scoped next.", icon: Upload },
];

export default async function StudentDashboardPage() {
  const { profile } = await requireRole(["student"]);

  return (
    <AppShell title="Student Dashboard" profile={profile}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </div>
    </AppShell>
  );
}
