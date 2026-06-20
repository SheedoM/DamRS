import { ClipboardCheck, FileWarning, Files, ListChecks, UserCheck, Users } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminProjects } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { profile } = await requireRole(["admin"]);
  const projects = await getAdminProjects();
  const submittedCount = projects.filter((project) => project.status !== "draft").length;
  const incompleteCount = projects.filter((project) => project.status === "draft").length;
  const unassignedCount = projects.filter((project) => project.active_assignment_count === 0).length;
  const assignedCount = projects.filter((project) => project.active_assignment_count > 0).length;

  const cards = [
    { title: "Total projects", value: String(projects.length), detail: "All projects visible to admin.", icon: Files },
    { title: "Submitted", value: String(submittedCount), detail: "Projects no longer in draft.", icon: ListChecks },
    { title: "Incomplete", value: String(incompleteCount), detail: "Draft projects still missing final submission.", icon: FileWarning },
    { title: "Unassigned", value: String(unassignedCount), detail: "Projects with no active panel assignment.", icon: Users },
    { title: "Assigned", value: String(assignedCount), detail: "Projects with at least one active panel member.", icon: ClipboardCheck },
    { title: "Final reviews", value: "Phase 5", detail: "Panel review counts arrive with review workflow.", icon: UserCheck },
  ];

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
