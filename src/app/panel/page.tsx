import { ClipboardPenLine, FileSearch, ListTodo, ShieldCheck } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelDashboardData } from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

export default async function PanelDashboardPage() {
  const { profile } = await requireRole(["panel_member"]);
  const { stats } = await getPanelDashboardData(profile.id);
  const cards = [
    {
      title: "Assigned projects",
      value: String(stats.assignedProjects),
      detail: "Projects currently assigned to you.",
      icon: FileSearch,
    },
    {
      title: "Reviewed projects",
      value: String(stats.reviewedProjects),
      detail: "Projects with both draft and final reviews submitted.",
      icon: ShieldCheck,
    },
    {
      title: "Pending draft",
      value: String(stats.pendingDraftReviews),
      detail: "Assigned projects missing your pre-discussion review.",
      icon: ClipboardPenLine,
    },
    {
      title: "Pending final",
      value: String(stats.pendingFinalReviews),
      detail: "Assigned projects missing your final review.",
      icon: ListTodo,
    },
  ];

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
