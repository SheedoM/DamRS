import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export type StudentNotification = {
  message: string;
  timestamp: string;
};

export async function getStudentNotifications(projectId: string): Promise<StudentNotification[]> {
  const supabase = await createSupabaseAdminClient();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("action, created_at, metadata")
    .eq("entity_id", projectId)
    .in("action", [
      "admin_assigned_panel_member",
      "panel_submitted_draft_review",
      "panel_submitted_final_review",
    ])
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !logs) return [];

  return logs.map((log) => {
    let message = "A recent update occurred on your project.";
    if (log.action === "admin_assigned_panel_member") {
      message = "Your project was assigned to a panel member.";
    } else if (log.action === "panel_submitted_draft_review") {
      message = "A draft review was submitted for your project.";
    } else if (log.action === "panel_submitted_final_review") {
      message = "A final review was submitted for your project.";
    }

    return {
      message: `${message} — ${formatDate(log.created_at)}`,
      timestamp: log.created_at,
    };
  });
}
