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
  const finalCompleteCount = projects.filter(
    (project) => project.required_review_count > 0
      && project.completed_final_review_count === project.required_review_count,
  ).length;

  const cards = [
    { title: "Total projects", value: String(projects.length), detail: "All projects visible to admin.", icon: Files, href: "/admin/projects" },
    { title: "Submitted", value: String(submittedCount), detail: "Projects no longer in draft.", icon: ListChecks, href: "/admin/projects?submission=submitted" },
    { title: "Incomplete", value: String(incompleteCount), detail: "Draft projects still missing final submission.", icon: FileWarning, href: "/admin/projects?submission=draft" },
    { title: "Unassigned", value: String(unassignedCount), detail: "Projects with no active panel assignment.", icon: Users, href: "/admin/projects?assignment=unassigned" },
    { title: "Assigned", value: String(assignedCount), detail: "Projects with at least one active panel member.", icon: ClipboardCheck, href: "/admin/projects?assignment=assigned" },
    { title: "Final reviews", value: String(finalCompleteCount), detail: "Projects with all active final grades submitted.", icon: UserCheck, href: "/admin/projects?review=final-complete" },
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
