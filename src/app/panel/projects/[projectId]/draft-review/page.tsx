import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewForm } from "../review-form";
import { buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getPanelProjectDetail } from "@/lib/panel/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DraftReviewPage({
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

  const existingReview = project.reviews.find((review) => review.review_type === "draft") || null;

  return (
    <AppShell title="Draft Review" profile={profile}>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{project.title}</h2>
          <p className="mt-1 text-sm text-slate-500">Pre-discussion rubric fields.</p>
        </div>
        <ReviewForm mode="draft" projectId={project.id} existingReview={existingReview} />
        <Link href={`/panel/projects/${project.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Back to project
        </Link>
      </div>
    </AppShell>
  );
}

