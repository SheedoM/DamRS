import { ClipboardCheck, FileWarning, Files, ListChecks, UserCheck, Users } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

const cards = [
  { title: "Total projects", value: "Ready", detail: "Project table arrives in Phase 3.", icon: Files },
  { title: "Submitted", value: "Ready", detail: "Submission counts will connect after student flow.", icon: ListChecks },
  { title: "Incomplete", value: "Ready", detail: "Missing requirements report is planned.", icon: FileWarning },
  { title: "Unassigned", value: "Ready", detail: "Assignment workflow arrives in Phase 4.", icon: Users },
  { title: "Draft reviews", value: "Ready", detail: "Panel draft review status arrives in Phase 5.", icon: ClipboardCheck },
  { title: "Final reviews", value: "Ready", detail: "Final grade export arrives in Phase 6.", icon: UserCheck },
];

export default async function AdminDashboardPage() {
  const { profile } = await requireRole(["admin"]);

  return (
    <AppShell title="Admin Dashboard" profile={profile}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </div>
    </AppShell>
  );
}
