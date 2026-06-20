import { redirect } from "next/navigation";

export default async function ReviewRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/panel/projects/${projectId}`);
}
