import Link from "next/link";

import { SubmissionWindowForm } from "./submission-window-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getSubmissionWindow } from "@/lib/admin/queries";
import { getSubmissionWindowState } from "@/lib/admin/submission-windows";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionWindowPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { mode } = await searchParams;
  const windowData = await getSubmissionWindow();
  const state = getSubmissionWindowState(windowData);
  const showForm = mode === "create" || mode === "edit";

  return (
    <AppShell title="Submission Window" profile={profile}>
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Current submission window</CardTitle>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {windowData?.discussion_cycles?.name || "No active window"}
              </h2>
            </div>
            <Badge tone={state.isOpen ? "success" : state.hasWindow ? "warning" : "neutral"}>
              {state.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {windowData ? (
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <p><span className="font-medium text-slate-950">Opens:</span> {new Date(windowData.opens_at).toLocaleString()}</p>
                <p><span className="font-medium text-slate-950">Closes:</span> {new Date(windowData.closes_at).toLocaleString()}</p>
                <p><span className="font-medium text-slate-950">Late submissions:</span> {windowData.allow_late_submission ? "Allowed" : "Not allowed"}</p>
                <p><span className="font-medium text-slate-950">Edit after submit:</span> {windowData.allow_edit_after_submit ? "Allowed" : "Not allowed"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Create a submission window before students can submit projects.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/submission-window?mode=create" className={cn(buttonVariants())}>
                Create new window
              </Link>
              {windowData ? (
                <Link href="/admin/submission-window?mode=edit" className={cn(buttonVariants({ variant: "outline" }))}>
                  Edit current window
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {showForm ? (
          <SubmissionWindowForm mode={mode === "create" ? "create" : "edit"} windowData={windowData} />
        ) : null}
      </div>
    </AppShell>
  );
}
