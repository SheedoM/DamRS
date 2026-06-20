import { redirect } from "next/navigation";

export default async function FinalReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/panel/projects/${projectId}/review`);
}
