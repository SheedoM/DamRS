import { ClipboardPenLine, FileSearch, ListTodo, ShieldCheck } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

const cards = [
  { title: "Assigned projects", value: "Ready", detail: "RLS-backed assignments arrive in Phase 4.", icon: FileSearch },
  { title: "Reviewed projects", value: "Ready", detail: "Review history arrives in Phase 5.", icon: ShieldCheck },
  { title: "Draft reviews", value: "Ready", detail: "Pre-discussion review form is next panel scope.", icon: ClipboardPenLine },
  { title: "Final reviews", value: "Ready", detail: "Final scoring form arrives after draft review.", icon: ListTodo },
];

export default async function PanelDashboardPage() {
  const { profile } = await requireRole(["panel_member"]);

  return (
    <AppShell title="Panel Dashboard" profile={profile}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </div>
    </AppShell>
  );
}
