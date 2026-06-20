import { notFound } from "next/navigation";

import { UnifiedReviewForm } from "../unified-review-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjectDetail } from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

export default async function UnifiedReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["panel_member"]);
  const { projectId } = await params;
  const project = await getPanelProjectDetail(projectId, profile.id);

  if (!project) {
    notFound();
  }

  const existingReview = project.reviews[0] || null;

  return (
    <AppShell title="Project Review" profile={profile}>
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle className="text-xl">Review: {project.title}</CardTitle>
          <p className="text-sm text-slate-500">
            {project.team_leader_name} • {project.department}
          </p>
        </CardHeader>
        <CardContent>
          <UnifiedReviewForm
            projectId={project.id}
            existingReview={existingReview}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
