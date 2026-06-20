import { SubmissionWindowForm } from "./submission-window-form";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getSubmissionWindow } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionWindowPage() {
  const { profile } = await requireRole(["admin"]);
  const windowData = await getSubmissionWindow();

  return (
    <AppShell title="Submission Window" profile={profile}>
      <SubmissionWindowForm windowData={windowData} />
    </AppShell>
  );
}
